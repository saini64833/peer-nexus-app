/**
 * FileDrop.jsx
 * Zero-server P2P file transfer page for PeerNexus.
 * Uses simple-peer (WebRTC wrapper) + Socket.io signaling.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer/simplepeer.min.js";
import { useAuth }   from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { chatApi }   from "../services/api";
/* ─── Toaster (no external lib) ─────────────────────────────────────────── */
let _setToasts;
function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  return (
    <div style={{ position: "fixed", top: 80, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.5rem", pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          background: "#111118", border: `1px solid ${t.type === "error" ? "rgba(248,113,113,0.3)" : t.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(110,231,247,0.2)"}`,
          borderRadius: "0.75rem", padding: "0.7rem 1rem",
          color: "#e2e8f0", fontSize: "0.85rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontFamily: "'DM Sans',sans-serif",
          animation: "fadeInRight 0.2s ease",
          pointerEvents: "all",
        }}>
          <span>{t.type === "error" ? "✕" : t.type === "success" ? "✓" : "↻"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
let _toastId = 0;
const toast = {
  _fire(type, message, duration = 3500) {
    const id = ++_toastId;
    _setToasts?.((p) => [...p, { id, type, message }]);
    setTimeout(() => _setToasts?.((p) => p.filter((t) => t.id !== id)), duration);
    return id;
  },
  success: (m, d) => toast._fire("success", m, d),
  error:   (m, d) => toast._fire("error",   m, d),
  info:    (m, d) => toast._fire("info",    m, d),
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
const mimeIcon = (type = "") => {
  if (type.startsWith("image/"))       return "🖼️";
  if (type.startsWith("video/"))       return "🎬";
  if (type.startsWith("audio/"))       return "🎵";
  if (type.includes("pdf"))            return "📄";
  if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return "🗜️";
  if (type.includes("javascript") || type.includes("json") || type.includes("html")) return "💻";
  return "📁";
};
const CHUNK = 16 * 1024; // 16 KB chunks

/* ─── Contact card ─────────────────────────────────────────────────────────── */
function ContactCard({ contact, selected, online, onClick }) {
  const [hov, setHov] = useState(false);
  const initials = contact.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const active = selected || hov;
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: "flex", alignItems: "center", gap: "0.7rem",
      padding: "0.6rem 0.75rem", borderRadius: "0.7rem",
      background: selected ? "rgba(110,231,247,0.08)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
      border: `1px solid ${selected ? "rgba(110,231,247,0.3)" : "transparent"}`,
      cursor: "pointer", transition: "all 0.18s",
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {contact.avatar
          ? <img src={contact.avatar} alt={contact.fullName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${selected ? "rgba(110,231,247,0.5)" : "rgba(255,255,255,0.08)"}` }} />
          : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "#06060f", border: `2px solid ${selected ? "rgba(110,231,247,0.5)" : "transparent"}` }}>{initials}</div>
        }
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: online ? "#4ade80" : "#334155", border: "1.5px solid #09091a", boxShadow: online ? "0 0 5px #4ade80" : "none" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: selected ? "#6ee7f7" : "#e2e8f0", fontSize: "0.83rem", fontWeight: selected ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.fullName}</div>
        <div style={{ color: "#475569", fontSize: "0.7rem" }}>@{contact.userName}</div>
      </div>
      {selected && <span style={{ fontSize: "0.7rem", color: "#6ee7f7" }}>✦</span>}
    </div>
  );
}

/* ─── Transfer row ─────────────────────────────────────────────────────────── */
function TransferRow({ item, onAccept, onDownload }) {
  const isIncoming = item.direction === "incoming";
  const isDone     = item.progress >= 100;
  const isFailed   = item.status === "failed";
  const color      = isFailed ? "#f87171" : isDone ? "#4ade80" : isIncoming ? "#a78bfa" : "#6ee7f7";

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "0.9rem", padding: "1rem 1.1rem",
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        {/* Icon */}
        <div style={{ width: 40, height: 40, borderRadius: "0.6rem", background: `${color}18`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
          {mimeIcon(item.mimeType)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{item.fileName}</span>
            <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "999px", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
              {isIncoming ? "↓ IN" : "↑ OUT"}
            </span>
          </div>
          <div style={{ color: "#475569", fontSize: "0.73rem", marginTop: "0.15rem" }}>
            {fmt(item.fileSize)} · {item.mimeType || "unknown"}
          </div>

          {/* Progress bar */}
          {item.progress > 0 && item.progress < 100 && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${item.progress}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: "999px", transition: "width 0.15s" }} />
              </div>
              <div style={{ color, fontSize: "0.7rem", marginTop: "0.25rem" }}>{item.progress}%</div>
            </div>
          )}
          {isDone && !isFailed && (
            <div style={{ color: "#4ade80", fontSize: "0.72rem", marginTop: "0.25rem" }}>✓ Complete</div>
          )}
          {isFailed && (
            <div style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.25rem" }}>✕ {item.error || "Failed"}</div>
          )}
        </div>

        {/* Action button */}
        <div style={{ flexShrink: 0 }}>
          {isIncoming && item.status === "pending" && (
            <button onClick={() => onAccept(item)} style={{ padding: "0.55rem 0.9rem", borderRadius: "0.6rem", border: "none", background: "linear-gradient(135deg,#a78bfa,#6ee7f7)", color: "#06060f", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Accept
            </button>
          )}
          {isDone && item.blob && (
            <button onClick={() => onDownload(item)} style={{ padding: "0.55rem 0.9rem", borderRadius: "0.6rem", border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#4ade80", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Download
            </button>
          )}
          {isIncoming && item.status === "connecting" && (
            <span style={{ color: "#475569", fontSize: "0.75rem" }}>Connecting…</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function FileDrop() {
  const { user }                           = useAuth();
  const { on, emit, isConnected, socket, getSocket } = useSocket();

  const [contacts, setContacts]           = useState([]);
  const [searchQ, setSearchQ]             = useState("");
  const [searchRes, setSearchRes]         = useState([]);
  const [searching, setSearching]         = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [conversationId, setConversationId]   = useState(null);

  const [selectedFile, setSelectedFile]   = useState(null);
  const [dragging, setDragging]           = useState(false);
  const [sending, setSending]             = useState(false);

  const [transfers, setTransfers]         = useState([]);
  const [mounted, setMounted]             = useState(false);

  const peersRef   = useRef({});   // transferId → SimplePeer instance
  const chunksRef  = useRef({});   // transferId → received ArrayBuffer[]
  const fileInput  = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  /* ── Load contacts from conversations ───────────────────────────────────── */
  useEffect(() => {
    chatApi.getConversations()
      .then(({ data }) => {
        const seen = new Set();
        const list = [];
        (data.data || []).forEach((conv) => {
          const other = conv.participants?.find((p) => p._id !== user?._id);
          if (other && !seen.has(other._id)) {
            seen.add(other._id);
            list.push({ ...other, convId: conv._id });
          }
        });
        setContacts(list);
      })
      .catch(() => {});
  }, [user]);

  /* ── Debounced user search ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await chatApi.searchUsers(searchQ);
        setSearchRes(data.data?.slice(0, 8) || []);
      } catch { setSearchRes([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchQ]);

  /* ── Select a contact → get/create conversation ─────────────────────────── */
  const selectContact = useCallback(async (contact) => {
    setSelectedContact(contact);
    setSearchQ("");
    setSearchRes([]);
    try {
      // Use cached convId if we already have it
      if (contact.convId) { setConversationId(contact.convId); return; }
      const { data } = await chatApi.getOrCreateConversation(contact._id);
      setConversationId(data.data._id);
    } catch {
      toast.error("Could not open conversation with this user");
    }
  }, []);

  /* ── Listen for incoming file events ────────────────────────────────────── */
  useEffect(() => {
    return on("chat:file_incoming", (payload) => {
      const { transferId, fileName, fileSize, mimeType, senderId } = payload;
      setTransfers((p) => {
        if (p.find((t) => t.transferId === transferId)) return p;
        return [{
          transferId, fileName, fileSize, mimeType,
          senderId, direction: "incoming",
          progress: 0, status: "pending", blob: null,
        }, ...p];
      });
      toast.info(`Incoming: ${fileName} (${fmt(fileSize)})`);
    });
  }, [on]);

  /* ── Listen for WebRTC offer (receiver side) ─────────────────────────────── */
  useEffect(() => {
    return on("webrtc:offer", ({ from, offer, transferId }) => {
      // Only handle offers that are for a pending transfer
      setTransfers((prev) => {
        const match = prev.find((t) => t.transferId === transferId && t.direction === "incoming");
        if (!match) return prev;
        return prev.map((t) => t.transferId === transferId ? { ...t, status: "connecting" } : t);
      });

      const peer = new Peer({ initiator: false, trickle: true });
      peersRef.current[transferId] = peer;
      chunksRef.current[transferId] = [];

      peer.signal(offer);

      peer.on("signal", (signal) => {
        emit("webrtc:answer", { targetId: from, transferId, answer: signal });
      });

      peer.on("data", (chunk) => {
        chunksRef.current[transferId].push(chunk);
        // We don't know total size easily here — use fileSize from transfer
        setTransfers((prev) => {
          const t = prev.find((x) => x.transferId === transferId);
          if (!t) return prev;
          const received = chunksRef.current[transferId].reduce((acc, c) => acc + c.byteLength, 0);
          const progress = Math.min(Math.floor((received / t.fileSize) * 100), 99);
          return prev.map((x) => x.transferId === transferId ? { ...x, progress, status: "receiving" } : x);
        });
      });

      peer.on("close", () => {
        const chunks = chunksRef.current[transferId] || [];
        if (!chunks.length) return;
        setTransfers((prev) => {
          const t = prev.find((x) => x.transferId === transferId);
          if (!t) return prev;
          const blob = new Blob(chunks, { type: t.mimeType || "application/octet-stream" });
          return prev.map((x) => x.transferId === transferId ? { ...x, progress: 100, status: "done", blob } : x);
        });
        toast.success("File received!");
        delete peersRef.current[transferId];
        delete chunksRef.current[transferId];
      });

      peer.on("error", (err) => {
        console.error("[FileDrop peer error]", err);
        setTransfers((p) => p.map((t) => t.transferId === transferId ? { ...t, status: "failed", error: err.message } : t));
        toast.error("Transfer failed");
        delete peersRef.current[transferId];
      });
    });
  }, [on, emit]);

  /* ── Listen for WebRTC answer (sender side) ──────────────────────────────── */
  useEffect(() => {
    return on("webrtc:answer", ({ from, transferId, answer }) => {
      const peer = peersRef.current[transferId];
      if (peer) peer.signal(answer);
    });
  }, [on]);

  /* ── Listen for ICE candidates ───────────────────────────────────────────── */
  useEffect(() => {
    return on("webrtc:ice-candidate", ({ from, transferId, candidate }) => {
      const peer = peersRef.current[transferId];
      if (peer && candidate) peer.signal(candidate);
    });
  }, [on]);

  /* ── Accept incoming file — open data channel ───────────────────────────── */
  const acceptFile = useCallback((item) => {
    // The peer is already created when we received the offer
    // Just update the UI to show we're connecting
    setTransfers((p) => p.map((t) => t.transferId === item.transferId ? { ...t, status: "connecting" } : t));
  }, []);

  /* ── Send file ───────────────────────────────────────────────────────────── */
  const sendFile = useCallback(async () => {
    if (!selectedFile)    return toast.error("Select a file first");
    if (!conversationId)  return toast.error("Select a contact first");
    if (!selectedContact) return toast.error("Select a contact first");

    setSending(true);
    const transferId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    try {
      // 1. Register metadata on server — triggers chat:file_incoming on receiver
      await chatApi.sendFileMetadata(conversationId, {
        fileName:   selectedFile.name,
        fileSize:   selectedFile.size,
        mimeType:   selectedFile.type || "application/octet-stream",
        transferId,
      });

      // 2. Add to our own transfer list
      setTransfers((p) => [{
        transferId,
        fileName:  selectedFile.name,
        fileSize:  selectedFile.size,
        mimeType:  selectedFile.type,
        direction: "outgoing",
        progress:  0,
        status:    "connecting",
        blob:      null,
      }, ...p]);

      // 3. Create SimplePeer as initiator
      const peer = new Peer({ initiator: true, trickle: true });
      peersRef.current[transferId] = peer;

      peer.on("signal", (signal) => {
        if (signal.type === "offer") {
          emit("webrtc:offer", {
            targetId:   selectedContact._id,
            transferId,
            offer:      signal,
          });
        } else {
          // ICE candidates
          emit("webrtc:ice-candidate", {
            targetId:   selectedContact._id,
            transferId,
            candidate:  signal,
          });
        }
      });

      peer.on("connect", async () => {
        toast.success("Connection established — sending…");
        setTransfers((p) => p.map((t) => t.transferId === transferId ? { ...t, status: "sending" } : t));

        // 4. Slice and send file through DataChannel
        let offset = 0;

        const sendNextChunk = () => {
          if (offset >= selectedFile.size) {
            peer.destroy();
            setTransfers((p) => p.map((t) => t.transferId === transferId ? { ...t, progress: 100, status: "done" } : t));
            toast.success(`${selectedFile.name} sent!`);
            setSending(false);
            setSelectedFile(null);
            return;
          }

          const slice = selectedFile.slice(offset, offset + CHUNK);
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              peer.send(e.target.result);
              offset += e.target.result.byteLength;
              const progress = Math.min(Math.floor((offset / selectedFile.size) * 100), 99);
              setTransfers((p) => p.map((t) => t.transferId === transferId ? { ...t, progress } : t));
              // Rate-limit to avoid buffer overflow
              if (peer._channel?.bufferedAmount > 1024 * 512) {
                setTimeout(sendNextChunk, 50);
              } else {
                sendNextChunk();
              }
            } catch {
              sendNextChunk();
            }
          };
          reader.readAsArrayBuffer(slice);
        };

        sendNextChunk();
      });

      peer.on("error", (err) => {
        console.error("[FileDrop send error]", err);
        setTransfers((p) => p.map((t) => t.transferId === transferId ? { ...t, status: "failed", error: err.message } : t));
        toast.error("Transfer failed");
        setSending(false);
        delete peersRef.current[transferId];
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate transfer");
      setSending(false);
    }
  }, [selectedFile, conversationId, selectedContact, emit]);

  /* ── Download completed file ─────────────────────────────────────────────── */
  const downloadFile = useCallback((item) => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = item.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ── Cleanup peers on unmount ────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach((p) => { try { p.destroy(); } catch {} });
    };
  }, []);

  const displayContacts = searchQ.trim() ? searchRes : contacts;
  const activeTransfers = transfers.filter((t) => t.status !== "pending" && t.status !== "done" && t.status !== "failed");
  const doneTransfers   = transfers.filter((t) => t.status === "done" || t.status === "failed");
  const pendingIncoming = transfers.filter((t) => t.status === "pending" && t.direction === "incoming");

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif" }}>
      <ToastContainer />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeInRight{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(110,231,247,0)}50%{box-shadow:0 0 0 6px rgba(110,231,247,0.15)}}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
        ::selection{background:rgba(110,231,247,0.2);}
        input::placeholder{color:#2d3748;}
        input:focus{border-color:rgba(110,231,247,0.45)!important;}
      `}</style>

      <div style={{
        maxWidth: 1160, margin: "0 auto", padding: "2rem 1.5rem",
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(16px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334155" }}>WebRTC DataChannel</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
            {/* Connection badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.04)", border: `1px solid ${isConnected ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: "999px", padding: "0.3rem 0.75rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? "#4ade80" : "#f87171", boxShadow: isConnected ? "0 0 6px #4ade80" : "none", display: "inline-block" }} />
              <span style={{ color: isConnected ? "#4ade80" : "#f87171", fontSize: "0.72rem", fontWeight: 600 }}>{isConnected ? "Live" : "Offline"}</span>
            </div>
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,4vw,2.5rem)", color: "#f8fafc", letterSpacing: "-0.04em", lineHeight: 1 }}>
            File Drop <span style={{ background: "linear-gradient(90deg,#6ee7f7,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>📁</span>
          </h1>
          <p style={{ color: "#475569", fontSize: "0.875rem", marginTop: "0.5rem", lineHeight: 1.6 }}>
            Transfer files directly to your peers via WebRTC DataChannels. Files never touch our servers.
          </p>
        </div>

        {/* ── Main layout: 2 columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.25rem", alignItems: "start" }} className="fd-grid">

          {/* ── LEFT: Contact picker ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Search */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.1rem" }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", marginBottom: "0.85rem" }}>
                Send To
              </h3>

              {/* Selected contact chip */}
              {selectedContact && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(110,231,247,0.07)", border: "1px solid rgba(110,231,247,0.25)", borderRadius: "0.65rem", padding: "0.55rem 0.75rem", marginBottom: "0.75rem" }}>
                  {selectedContact.avatar
                    ? <img src={selectedContact.avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "#06060f" }}>{selectedContact.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>
                  }
                  <span style={{ color: "#6ee7f7", fontSize: "0.8rem", fontWeight: 600, flex: 1 }}>{selectedContact.fullName}</span>
                  <button onClick={() => { setSelectedContact(null); setConversationId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: "0.9rem", padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              )}

              {/* Search input */}
              <div style={{ position: "relative", marginBottom: "0.6rem" }}>
                <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "#334155", fontSize: "0.85rem", pointerEvents: "none" }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search peers…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6rem", padding: "0.65rem 0.8rem 0.65rem 2rem", color: "#f1f5f9", fontSize: "0.82rem", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
                />
                {searching && <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#6ee7f7", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              </div>

              {/* Contact list */}
              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                {displayContacts.length > 0
                  ? displayContacts.map((c) => (
                      <ContactCard
                        key={c._id}
                        contact={c}
                        selected={selectedContact?._id === c._id}
                        online={false} // pass from SocketContext.onlineUsers if needed
                        onClick={() => selectContact(c)}
                      />
                    ))
                  : searchQ.trim()
                    ? <p style={{ color: "#334155", fontSize: "0.78rem", textAlign: "center", padding: "1.5rem 0" }}>No peers found</p>
                    : <p style={{ color: "#2d3748", fontSize: "0.75rem", textAlign: "center", padding: "1.5rem 0" }}>Search or pick a contact</p>
                }
              </div>
            </div>

            {/* Pending incoming — notification panel */}
            {pendingIncoming.length > 0 && (
              <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "1.1rem", padding: "1rem", animation: "pulse-glow 2s ease-in-out infinite" }}>
                <h4 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#a78bfa", marginBottom: "0.6rem" }}>
                  ↓ {pendingIncoming.length} Incoming
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {pendingIncoming.map((f) => (
                    <div key={f.transferId} style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{mimeIcon(f.mimeType)} {f.fileName}</span>
                      <button onClick={() => acceptFile(f)} style={{ padding: "0.3rem 0.65rem", borderRadius: "0.45rem", border: "none", background: "linear-gradient(135deg,#a78bfa,#6ee7f7)", color: "#06060f", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>Accept</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Drop zone + transfer list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Dropzone card */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", padding: "1.5rem" }}>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault(); setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                onClick={() => !selectedFile && fileInput.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? "#6ee7f7" : selectedFile ? "rgba(110,231,247,0.35)" : "rgba(255,255,255,0.09)"}`,
                  borderRadius: "1rem",
                  padding: selectedFile ? "1.25rem" : "3rem 2rem",
                  textAlign: "center",
                  background: dragging ? "rgba(110,231,247,0.04)" : selectedFile ? "rgba(110,231,247,0.03)" : "transparent",
                  cursor: selectedFile ? "default" : "pointer",
                  transition: "all 0.25s",
                  position: "relative",
                }}
              >
                <input ref={fileInput} type="file" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />

                {!selectedFile ? (
                  <div>
                    <div style={{ fontSize: "3rem", marginBottom: "0.75rem", filter: dragging ? "brightness(1.3)" : "none", transition: "filter 0.2s" }}>
                      {dragging ? "✦" : "📁"}
                    </div>
                    <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9", marginBottom: "0.4rem" }}>
                      {dragging ? "Drop it!" : "Drop file here"}
                    </h3>
                    <p style={{ color: "#475569", fontSize: "0.8rem" }}>or click to browse — any file, any size</p>
                  </div>
                ) : (
                  /* Selected file preview */
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "rgba(110,231,247,0.1)", border: "1px solid rgba(110,231,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                      {mimeIcon(selectedFile.type)}
                    </div>
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedFile.name}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: "0.15rem" }}>{fmt(selectedFile.size)} · {selectedFile.type || "unknown"}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", color: "#475569", cursor: "pointer", fontSize: "0.75rem", flexShrink: 0 }}>Change</button>
                  </div>
                )}
              </div>

              {/* Send row */}
              <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div style={{ flex: 1 }}>
                  {selectedContact
                    ? <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#475569", fontSize: "0.78rem" }}>Sending to:</span>
                        <span style={{ color: "#6ee7f7", fontSize: "0.78rem", fontWeight: 600 }}>@{selectedContact.userName}</span>
                      </div>
                    : <span style={{ color: "#334155", fontSize: "0.78rem" }}>← Select a contact to send</span>
                  }
                </div>
                <button
                  onClick={sendFile}
                  disabled={sending || !selectedFile || !selectedContact || !isConnected}
                  style={{
                    padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none",
                    background: sending || !selectedFile || !selectedContact || !isConnected
                      ? "rgba(110,231,247,0.15)"
                      : "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                    color: sending || !selectedFile || !selectedContact || !isConnected ? "#475569" : "#06060f",
                    fontWeight: 700, fontSize: "0.88rem",
                    cursor: sending || !selectedFile || !selectedContact || !isConnected ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "opacity 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = "0.87"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  {sending
                    ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(6,6,15,0.25)", borderTopColor: "#06060f", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Sending…</>
                    : <>Send ↑</>
                  }
                </button>
              </div>
            </div>

            {/* Active transfers */}
            {activeTransfers.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.25rem" }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", marginBottom: "0.85rem" }}>
                  Active Transfers
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {activeTransfers.map((t) => (
                    <TransferRow key={t.transferId} item={t} onAccept={acceptFile} onDownload={downloadFile} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed transfers */}
            {doneTransfers.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                  <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9" }}>
                    History
                  </h3>
                  <button onClick={() => setTransfers((p) => p.filter((t) => t.status !== "done" && t.status !== "failed"))} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.45rem", padding: "0.25rem 0.6rem", color: "#475569", cursor: "pointer", fontSize: "0.72rem", fontFamily: "'DM Sans',sans-serif" }}>Clear</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {doneTransfers.map((t) => (
                    <TransferRow key={t.transferId} item={t} onAccept={acceptFile} onDownload={downloadFile} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {transfers.length === 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "1.1rem", padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.4 }}>🔗</div>
                <p style={{ color: "#334155", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  No transfers yet.<br />Select a peer and drop a file to start.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){
          .fd-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  );
}