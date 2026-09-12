import { useEffect, useRef, useState, useCallback } from "react";
import {
  isTauri,
  api,
  connectWebFolder,
  scanWebFolder,
  getConnectedFolderName,
} from "./engine";
import "./App.css";

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 5v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V5l-8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const FileIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M15 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M4 7h16M9 7V4h6v3m-9 0l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 11l9-8 9 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 10v10h14V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.3 5.3A9.8 9.8 0 0112 5c5 0 9 4 10 7a11 11 0 01-2.2 3.4M6.7 6.7A11 11 0 002 12c1 3 5 7 10 7 1.1 0 2.1-.2 3-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Logo() {
  return (
    <div className="logo">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" fill="url(#lg)" opacity="0.15" />
        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="url(#lg)" strokeWidth="1.6" />
        <path d="M20 12L28 16.5V25.5L20 30L12 25.5V16.5L20 12Z" fill="url(#lg)" />
      </svg>
      <span className="logo-text">FileNexora</span>
    </div>
  );
}

const STATUS_META = {
  permanent: { label: "Permanent", color: "#6ee7b7", icon: <ShieldIcon /> },
  temporary: { label: "Temporary", color: "#93c5fd", icon: <ClockIcon /> },
  reminder: { label: "Reminder set", color: "#fcd34d", icon: <BellIcon /> },
  pending: { label: "Not yet reviewed", color: "#a1a1aa", icon: <FileIcon /> },
  untracked: { label: "Untracked", color: "#52525b", icon: <EyeOffIcon /> },
};

function FileCard({ file, index, onDelete, onUntrack, onRetrack }) {
  const ref = useRef(null);
  const [transform, setTransform] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const cardCenter = rect.top + rect.height / 2;
      const distance = (cardCenter - viewportCenter) / viewportCenter;
      const clamped = Math.max(-1, Math.min(1, distance));

      const rotateX = clamped * 14;
      const scale = 1 - Math.abs(clamped) * 0.08;
      const translateZ = -Math.abs(clamped) * 60;
      const opacity = 1 - Math.abs(clamped) * 0.35;

      setTransform(
        `perspective(1200px) rotateX(${-rotateX}deg) scale(${scale}) translateZ(${translateZ}px)`
      );
      el.style.opacity = opacity;
    };

    onScroll();
    const scrollContainer = document.querySelector(".dashboard-scroll");
    scrollContainer?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    return () => {
      scrollContainer?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const meta = STATUS_META[file.status] || STATUS_META.pending;
  const isUntracked = file.status === "untracked";

  return (
    <div
      ref={ref}
      className="file-card"
      style={{ transform, transitionDelay: `${index * 20}ms` }}
    >
      <div className="file-card-icon" style={{ color: meta.color }}>
        {meta.icon}
      </div>
      <div className="file-card-body">
        <p className="file-card-name" title={file.name}>{file.name}</p>
        <span className="file-card-status" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {file.status === "temporary" && file.expiry && (
          <span className="file-card-expiry">
            Expires {new Date(file.expiry).toLocaleDateString()}
          </span>
        )}
      </div>

      <button
        className="file-card-track"
        onClick={() => (isUntracked ? onRetrack(file.path) : onUntrack(file.path))}
        title={isUntracked ? "Track again" : "Untrack"}
      >
        {isUntracked ? <EyeIcon /> : <EyeOffIcon />}
      </button>

      <button
        className="file-card-delete"
        onClick={() => onDelete(file.path)}
        title="Delete now"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function StatPill({ label, count, color }) {
  return (
    <div className="stat-pill">
      <span className="stat-count" style={{ color }}>{count}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Dashboard({ files, onDelete, onUntrack, onRetrack, onConnectFolder, connectedFolder, scanning }) {
  const counts = {
    permanent: files.filter((f) => f.status === "permanent").length,
    temporary: files.filter((f) => f.status === "temporary").length,
    reminder: files.filter((f) => f.status === "reminder").length,
    untracked: files.filter((f) => f.status === "untracked").length,
  };

  return (
    <div className="dashboard-scroll">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <div>
            <h2>Tracked files</h2>
            <span className="dashboard-count">{files.length} total</span>
          </div>
          {!isTauri() && (
            <button
              className={`btn-folder-action ${connectedFolder ? "connected" : ""}`}
              onClick={onConnectFolder}
              disabled={scanning}
            >
              <FolderIcon />
              {scanning
                ? "Scanning folder…"
                : connectedFolder
                ? `Rescan ${connectedFolder}`
                : "Connect Local Folder"}
            </button>
          )}
        </div>

        <div className="stats-row">
          <StatPill label="Permanent" count={counts.permanent} color="#6ee7b7" />
          <StatPill label="Temporary" count={counts.temporary} color="#93c5fd" />
          <StatPill label="Reminders" count={counts.reminder} color="#fcd34d" />
          <StatPill label="Untracked" count={counts.untracked} color="#a1a1aa" />
        </div>

        {files.length === 0 ? (
          <div className="dashboard-empty">
            <FileIcon />
            <p>No files tracked yet. {!isTauri() ? "Connect a folder or drop files to get started." : "Drop something into Downloads to get started."}</p>
          </div>
        ) : (
          <div className="file-card-list">
            {files.map((file, i) => (
              <FileCard
                key={file.path}
                file={file}
                index={i}
                onDelete={onDelete}
                onUntrack={onUntrack}
                onRetrack={onRetrack}
              />
            ))}
          </div>
        )}
        <div className="dashboard-spacer" />
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState("home");
  const [files, setFiles] = useState([]);
  const [pendingFile, setPendingFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [expiryValue, setExpiryValue] = useState(1);
  const [expiryUnit, setExpiryUnit] = useState("weeks");
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [connectedFolder, setConnectedFolder] = useState(getConnectedFolderName());
  const [scanning, setScanning] = useState(false);

  const refreshFiles = useCallback(async () => {
    try {
      const result = await api.getAllFiles();
      setFiles(result.sort((a, b) => (a.name > b.name ? 1 : -1)));
    } catch (e) {
      console.error("Failed to load files:", e);
    }
  }, []);

  const triggerToast = useCallback((type, text, duration = 4000) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), duration);
  }, []);

  // Web folder connection and scanning
  const handleConnectFolder = async () => {
    try {
      const name = await connectWebFolder();
      setConnectedFolder(name);
      triggerToast("success", `Connected to "${name}"`);
      await handleScanFolder();
    } catch (e) {
      if (e.name !== "AbortError") {
        triggerToast("duplicate", e.message || "Failed to open folder");
      }
    }
  };

  const handleScanFolder = async () => {
    setScanning(true);
    try {
      await scanWebFolder({
        onNewFile: (f) => {
          setPendingFile(f);
          setShowExpiryPicker(false);
        },
        onDuplicateRemoved: (dup) => {
          triggerToast("duplicate", `Duplicate removed — ${dup.name}`);
        },
      });
      await refreshFiles();
    } catch (e) {
      console.error("Scan error", e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    refreshFiles();

    // Setup Tauri listeners if running natively
    let cleanup = () => {};

    if (isTauri()) {
      import("@tauri-apps/api/event").then(({ listen }) => {
        const unlistenNewFile = listen("new-file", (event) => {
          setPendingFile(event.payload);
          setShowExpiryPicker(false);
          refreshFiles();
        });

        const unlistenDuplicate = listen("duplicate-removed", (event) => {
          triggerToast("duplicate", `Duplicate removed — ${event.payload.name}`, 4200);
          refreshFiles();
        });

        const unlistenExpired = listen("file-expired", (event) => {
          triggerToast("duplicate", `Expired & deleted — ${event.payload.name}`, 4200);
          refreshFiles();
        });

        const unlistenReminder = listen("reminder-due", (event) => {
          triggerToast("reminder", `Reminder — review "${event.payload.name}"`, 5000);
        });

        cleanup = () => {
          unlistenNewFile.then((f) => f());
          unlistenDuplicate.then((f) => f());
          unlistenExpired.then((f) => f());
          unlistenReminder.then((f) => f());
        };
      });
    }

    const pulseInterval = setInterval(() => setPulse((p) => !p), 2000);

    return () => {
      cleanup();
      clearInterval(pulseInterval);
    };
  }, [refreshFiles, triggerToast]);

  const closeAndToast = (text) => {
    setPendingFile(null);
    setShowExpiryPicker(false);
    triggerToast("success", text, 3200);
    refreshFiles();
  };

  const handlePermanent = async () => {
    if (!pendingFile) return;
    await api.markFileStatus(pendingFile.path, "permanent", null);
    closeAndToast(`Marked as permanent — ${pendingFile.name}`);
  };

  const handleTemporaryConfirm = async () => {
    if (!pendingFile) return;
    const expiryDate = new Date();
    if (expiryUnit === "days") expiryDate.setDate(expiryDate.getDate() + expiryValue);
    if (expiryUnit === "weeks") expiryDate.setDate(expiryDate.getDate() + expiryValue * 7);
    if (expiryUnit === "months") expiryDate.setMonth(expiryDate.getMonth() + expiryValue);

    await api.markFileStatus(pendingFile.path, "temporary", expiryDate.toISOString());
    closeAndToast(`Expires in ${expiryValue} ${expiryUnit} — ${pendingFile.name}`);
  };

  const handleReminder = async () => {
    if (!pendingFile) return;
    await api.markFileStatus(pendingFile.path, "reminder", null);
    closeAndToast(`Reminder set — ${pendingFile.name}`);
  };

  const handleDeleteFromPopup = async () => {
    if (!pendingFile) return;
    await api.deleteFile(pendingFile.path);
    closeAndToast(`Deleted — ${pendingFile.name}`);
  };

  const handleDeleteNow = async (path) => {
    await api.deleteFile(path);
    refreshFiles();
  };

  const handleUntrack = async (path) => {
    await api.markFileStatus(path, "untracked", null);
    refreshFiles();
  };

  const handleRetrack = async (path) => {
    await api.markFileStatus(path, "pending", null);
    refreshFiles();
  };

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      <header className="topbar">
        <Logo />
        <nav className="nav-toggle">
          <button
            className={view === "home" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("home")}
          >
            <HomeIcon /> Home
          </button>
          <button
            className={view === "dashboard" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("dashboard")}
          >
            <GridIcon /> Dashboard
          </button>
        </nav>

        {isTauri() ? (
          <div className="status-pill">
            <span className={`status-dot ${pulse ? "pulse" : ""}`} />
            Watching Downloads
          </div>
        ) : (
          <button
            className={`status-pill status-pill-clickable ${connectedFolder ? "connected" : ""}`}
            onClick={handleConnectFolder}
            title={connectedFolder ? `Connected: ${connectedFolder} (click to change)` : "Click to select a folder"}
          >
            <span className={`status-dot ${connectedFolder ? "pulse" : ""}`} />
            {connectedFolder ? `📁 ${connectedFolder}` : "Connect Folder"}
          </button>
        )}
      </header>

      {view === "home" ? (
        <main className="hero">
          <div className="hero-orbit">
            <FileIcon />
          </div>
          <span className="hero-eyebrow">Real-time · Automatic · Effortless</span>
          <h1 className="hero-title">
            Your files,<br />
            <span className="hero-title-gradient">quietly managed.</span>
          </h1>
          <p className="hero-sub">
            FileNexora watches your Downloads folder in real time — flagging duplicates
            automatically and asking what matters, only when it matters.
          </p>

          <div className="hero-actions">
            {!isTauri() && (
              <button className="btn-hero-primary" onClick={handleConnectFolder}>
                <FolderIcon />
                {connectedFolder ? `Rescan ${connectedFolder}` : "Connect Downloads Folder"}
              </button>
            )}
            <button className="btn-hero-secondary" onClick={() => setView("dashboard")}>
              Open Dashboard
            </button>
          </div>

          <div className="hero-features">
            <div className="hero-feature-card">
              <div className="hero-feature-icon icon-green"><ShieldIcon /></div>
              <h3>Permanent</h3>
              <p>Keep what matters, forever.</p>
            </div>
            <div className="hero-feature-card">
              <div className="hero-feature-icon icon-blue"><ClockIcon /></div>
              <h3>Temporary</h3>
              <p>Auto-cleans itself on schedule.</p>
            </div>
            <div className="hero-feature-card">
              <div className="hero-feature-icon icon-amber"><BellIcon /></div>
              <h3>Reminders</h3>
              <p>Nudges you when it's time to decide.</p>
            </div>
          </div>
        </main>
      ) : (
        <Dashboard
          files={files}
          onDelete={handleDeleteNow}
          onUntrack={handleUntrack}
          onRetrack={handleRetrack}
          onConnectFolder={handleConnectFolder}
          connectedFolder={connectedFolder}
          scanning={scanning}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === "success" ? <CheckIcon /> : toast.type === "reminder" ? <BellIcon /> : "⟲"}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {pendingFile && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-file-icon"><FileIcon /></div>
            <h2>New file detected</h2>
            <p className="filename">{pendingFile.name}</p>

            {!showExpiryPicker ? (
              <div className="modal-actions">
                <button className="btn btn-permanent" onClick={handlePermanent}>
                  <ShieldIcon />
                  <div className="btn-text">
                    <strong>Permanent</strong>
                    <span>Keep this file indefinitely</span>
                  </div>
                </button>
                <button className="btn btn-temporary" onClick={() => setShowExpiryPicker(true)}>
                  <ClockIcon />
                  <div className="btn-text">
                    <strong>Temporary</strong>
                    <span>Auto-delete after a set time</span>
                  </div>
                </button>
                <button className="btn btn-reminder" onClick={handleReminder}>
                  <BellIcon />
                  <div className="btn-text">
                    <strong>Unimportant, but required</strong>
                    <span>Remind me to review it later</span>
                  </div>
                </button>
                <button className="btn btn-delete" onClick={handleDeleteFromPopup}>
                  <TrashIcon />
                  <div className="btn-text">
                    <strong>Delete now</strong>
                    <span>I don't need this file</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="expiry-picker">
                <p className="expiry-label">Keep this file for:</p>
                <div className="expiry-controls">
                  <input
                    type="number"
                    min="1"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(Number(e.target.value))}
                  />
                  <select value={expiryUnit} onChange={(e) => setExpiryUnit(e.target.value)}>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <div className="modal-actions modal-actions-row">
                  <button className="btn btn-cancel" onClick={() => setShowExpiryPicker(false)}>
                    Back
                  </button>
                  <button className="btn btn-confirm" onClick={handleTemporaryConfirm}>
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;