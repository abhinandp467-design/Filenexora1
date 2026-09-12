use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::sync::mpsc::channel;
use tauri::{Emitter, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub path: String,
    pub name: String,
    pub hash: String,
    pub status: String,
    pub expiry: Option<String>,
    pub marked_at: Option<String>,
}

fn db_path() -> PathBuf {
    let mut dir = dirs::data_local_dir().unwrap_or(PathBuf::from("."));
    dir.push("filenexora");
    fs::create_dir_all(&dir).ok();
    dir.push("files.json");
    dir
}

fn load_db() -> HashMap<String, FileRecord> {
    let path = db_path();
    if let Ok(contents) = fs::read_to_string(&path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

fn save_db(db: &HashMap<String, FileRecord>) {
    let path = db_path();
    if let Ok(json) = serde_json::to_string_pretty(db) {
        fs::write(path, json).ok();
    }
}

fn hash_file(path: &PathBuf) -> Option<String> {
    let mut file = fs::File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer).ok()?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }
    Some(format!("{:x}", hasher.finalize()))
}

fn now_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("EPOCH:{}", now.as_secs())
}

fn parse_epoch(s: &str) -> Option<u64> {
    s.strip_prefix("EPOCH:").and_then(|v| v.parse::<u64>().ok())
}

#[tauri::command]
fn mark_file_status(path: String, status: String, expiry: Option<String>) -> Result<(), String> {
    let mut db = load_db();
    if let Some(record) = db.get_mut(&path) {
        record.status = status;
        record.expiry = expiry;
        record.marked_at = Some(now_iso());
        save_db(&db);
        Ok(())
    } else {
        Err("File not found in database".into())
    }
}

#[tauri::command]
fn get_all_files() -> Vec<FileRecord> {
    load_db().into_values().collect()
}

#[tauri::command]
fn delete_file_now(path: String) -> Result<(), String> {
    let mut db = load_db();
    let _ = fs::remove_file(&path);
    db.remove(&path);
    save_db(&db);
    Ok(())
}

#[tauri::command]
fn untrack_file(path: String) -> Result<(), String> {
    let mut db = load_db();
    if let Some(record) = db.get_mut(&path) {
        record.status = "untracked".into();
        record.expiry = None;
        record.marked_at = Some(now_iso());
        save_db(&db);
        Ok(())
    } else {
        Err("File not found in database".into())
    }
}

#[tauri::command]
fn retrack_file(path: String) -> Result<(), String> {
    let mut db = load_db();
    if let Some(record) = db.get_mut(&path) {
        record.status = "pending".into();
        record.expiry = None;
        record.marked_at = Some(now_iso());
        save_db(&db);
        Ok(())
    } else {
        Err("File not found in database".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            mark_file_status,
            get_all_files,
            delete_file_now,
            untrack_file,
            retrack_file
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            let watcher_handle = app_handle.clone();

            std::thread::spawn(move || {
                let downloads = dirs::download_dir().unwrap_or(PathBuf::from("."));
                println!("WATCHING FOLDER: {:?}", downloads);

                let mut initial_db = load_db();
                if let Ok(entries) = fs::read_dir(&downloads) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let path_str = path.to_string_lossy().to_string();
                            if !initial_db.contains_key(&path_str) {
                                if let Some(hash) = hash_file(&path) {
                                    let name = path
                                        .file_name()
                                        .map(|n| n.to_string_lossy().to_string())
                                        .unwrap_or_default();
                                    initial_db.insert(
                                        path_str.clone(),
                                        FileRecord {
                                            path: path_str,
                                            name,
                                            hash,
                                            status: "pending".into(),
                                            expiry: None,
                                            marked_at: None,
                                        },
                                    );
                                }
                            }
                        }
                    }
                }
                save_db(&initial_db);

                let (tx, rx) = channel();
                let mut watcher: RecommendedWatcher =
                    notify::recommended_watcher(tx).expect("failed to create watcher");
                watcher
                    .watch(&downloads, RecursiveMode::NonRecursive)
                    .expect("failed to watch downloads folder");

                for res in rx {
                    if let Ok(event) = res {
                        let is_relevant =
                            matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_));
                        if !is_relevant {
                            continue;
                        }

                        for path in event.paths {
                            std::thread::sleep(std::time::Duration::from_millis(500));

                            if !path.is_file() {
                                continue;
                            }

                            let hash = match hash_file(&path) {
                                Some(h) => h,
                                None => continue,
                            };

                            let mut db = load_db();
                            let path_str = path.to_string_lossy().to_string();
                            let name = path
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_default();

                            let is_duplicate =
                                db.values().any(|r| r.hash == hash && r.path != path_str);

                            if is_duplicate {
                                if fs::remove_file(&path).is_ok() {
                                    let _ = watcher_handle.emit(
                                        "duplicate-removed",
                                        serde_json::json!({ "name": name }),
                                    );
                                }
                            } else {
                                db.insert(
                                    path_str.clone(),
                                    FileRecord {
                                        path: path_str.clone(),
                                        name: name.clone(),
                                        hash,
                                        status: "pending".into(),
                                        expiry: None,
                                        marked_at: None,
                                    },
                                );
                                save_db(&db);
                                let _ = watcher_handle.emit(
                                    "new-file",
                                    serde_json::json!({ "path": path_str, "name": name }),
                                );
                            }
                        }
                    }
                }
            });

            let checker_handle = app_handle.clone();
            std::thread::spawn(move || {
                const REMINDER_AFTER_SECS: u64 = 3 * 24 * 60 * 60;
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));

                    let now_secs = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();

                    let mut db = load_db();
                    let mut changed = false;
                    let mut to_remove = vec![];

                    for record in db.values_mut() {
                        if record.status == "temporary" {
                            if let Some(expiry_str) = &record.expiry {
                                if let Ok(expiry_time) = chrono_like_parse(expiry_str) {
                                    if now_secs >= expiry_time {
                                        if fs::remove_file(&record.path).is_ok() {
                                            let _ = checker_handle.emit(
                                                "file-expired",
                                                serde_json::json!({ "name": record.name }),
                                            );
                                        }
                                        to_remove.push(record.path.clone());
                                        changed = true;
                                    }
                                }
                            }
                        } else if record.status == "reminder" {
                            if let Some(marked) = &record.marked_at {
                                if let Some(marked_secs) = parse_epoch(marked) {
                                    if now_secs - marked_secs >= REMINDER_AFTER_SECS {
                                        let _ = checker_handle.emit(
                                            "reminder-due",
                                            serde_json::json!({
                                                "path": record.path,
                                                "name": record.name
                                            }),
                                        );
                                        record.marked_at = Some(now_iso());
                                        changed = true;
                                    }
                                }
                            }
                        }
                    }

                    for path in to_remove {
                        db.remove(&path);
                    }

                    if changed {
                        save_db(&db);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn chrono_like_parse(iso: &str) -> Result<u64, ()> {
    let bytes = iso.as_bytes();
    if bytes.len() < 19 {
        return Err(());
    }
    let year: i64 = iso[0..4].parse().map_err(|_| ())?;
    let month: i64 = iso[5..7].parse().map_err(|_| ())?;
    let day: i64 = iso[8..10].parse().map_err(|_| ())?;
    let hour: i64 = iso[11..13].parse().map_err(|_| ())?;
    let min: i64 = iso[14..16].parse().map_err(|_| ())?;
    let sec: i64 = iso[17..19].parse().map_err(|_| ())?;

    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as i64;
    let mp = (month + 9) % 12;
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days_since_epoch = era * 146097 + doe - 719468;

    let total_secs = days_since_epoch * 86400 + hour * 3600 + min * 60 + sec;
    if total_secs < 0 {
        Err(())
    } else {
        Ok(total_secs as u64)
    }
}