import { useState } from "react";

/* ─── Image Lightbox ─────────────────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "zoom-out",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: "1.25rem", right: "1.25rem",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "50%", width: 36, height: 36,
          color: "#e2e8f0", fontSize: "1rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      >✕</button>
      <img
        src={src}
        alt="Full size"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "90vh",
          borderRadius: "0.75rem",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          objectFit: "contain", cursor: "default",
        }}
      />
      {/* Download button */}
      <a
        href={src}
        download
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", bottom: "1.5rem",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "0.6rem", padding: "0.5rem 1.1rem",
          color: "#e2e8f0", fontSize: "0.82rem", textDecoration: "none",
          display: "flex", alignItems: "center", gap: "0.4rem",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      >
        ↓ Download
      </a>
    </div>
  );
}

/* ─── File size formatter ────────────────────────────────────────────────── */
const fmt = (bytes) => {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

const mimeIcon = (type = "") => {
  if (type.startsWith("image/"))  return "🖼️";
  if (type.startsWith("video/"))  return "🎬";
  if (type.startsWith("audio/"))  return "🎵";
  if (type.includes("pdf"))       return "📄";
  if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return "🗜️";
  if (type.includes("javascript") || type.includes("json") || type.includes("html")) return "💻";
  return "📁";
};

/* ═══════════════════════════════════════════════════════════════════════════
   MessageBubble
   Props:
     message  — { _id, senderId, content, type, imageUrl, fileMetadata, createdAt, isRead, deletedAt }
     isOwn    — boolean
════════════════════════════════════════════════════════════════════════════ */
export default function MessageBubble({ message, isOwn }) {
  const { content, type, imageUrl, fileMetadata, createdAt, deletedAt, isRead } = message;
  const [lightbox, setLightbox] = useState(false);

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const wrapStyle = {
    display: "flex",
    justifyContent: isOwn ? "flex-end" : "flex-start",
    marginBottom: "0.35rem",
    padding: "0 0.75rem",
  };

  const bubbleBase = {
    maxWidth: "72%",
    borderRadius: isOwn ? "1.1rem 1.1rem 0.25rem 1.1rem" : "1.1rem 1.1rem 1.1rem 0.25rem",
    fontSize: "0.875rem",
    lineHeight: 1.5,
    wordBreak: "break-word",
    position: "relative",
  };

  /* ── Deleted ── */
  if (deletedAt) {
    return (
      <div style={wrapStyle}>
        <div style={{
          ...bubbleBase,
          padding: "0.55rem 0.9rem",
          opacity: 0.45, fontStyle: "italic",
          color: "#64748b", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          Message deleted
        </div>
      </div>
    );
  }

  /* ── Image bubble ── */
  if (type === "image" && imageUrl) {
    return (
      <>
        {lightbox && <Lightbox src={imageUrl} onClose={() => setLightbox(false)} />}
        <div style={wrapStyle}>
          <div>
            <div
              onClick={() => setLightbox(true)}
              style={{
                ...bubbleBase,
                padding: "0.3rem",
                background: isOwn ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
                cursor: "zoom-in", overflow: "hidden",
                display: "block",
              }}
            >
              <img
                src={imageUrl}
                alt="shared"
                style={{
                  maxWidth: 280, maxHeight: 220,
                  borderRadius: "0.85rem",
                  display: "block", objectFit: "cover",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              />
              {/* Zoom hint */}
              <div style={{
                position: "absolute", bottom: "0.75rem", right: "0.75rem",
                background: "rgba(0,0,0,0.5)", borderRadius: "0.3rem",
                padding: "0.15rem 0.4rem", fontSize: "0.65rem", color: "#fff",
                pointerEvents: "none",
              }}>🔍</div>
            </div>
            <TimeRow time={time} isOwn={isOwn} isRead={isRead} />
          </div>
        </div>
      </>
    );
  }

  /* ── File bubble ── */
  if (type === "file" && fileMetadata) {
    const { fileName, fileSize, mimeType, url } = fileMetadata;
    const canDownload = !!url; // only if server has a URL (Cloudinary-backed)

    return (
      <div style={wrapStyle}>
        <div>
          <div
            onClick={() => {
              if (url) {
                // Direct download
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.target = "_blank";
                a.click();
              }
            }}
            style={{
              ...bubbleBase,
              padding: "0.75rem 1rem",
              background: isOwn ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
              color: isOwn ? "#0a0a0f" : "#e2e8f0",
              cursor: canDownload ? "pointer" : "default",
              display: "flex", alignItems: "center", gap: "0.75rem",
              transition: "opacity 0.2s",
              border: canDownload ? undefined : "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => { if (canDownload) e.currentTarget.style.opacity = "0.87"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: "0.6rem",
              background: isOwn ? "rgba(10,10,15,0.15)" : "rgba(110,231,247,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem", flexShrink: 0,
            }}>
              {mimeIcon(mimeType)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: "0.82rem",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: 180,
              }}>{fileName}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.65, marginTop: "0.1rem" }}>
                {fmt(fileSize)}{mimeType ? ` · ${mimeType.split("/")[1]?.toUpperCase()}` : ""}
              </div>
            </div>

            {/* Download arrow or P2P label */}
            <div style={{ flexShrink: 0, fontSize: "0.75rem", opacity: 0.7 }}>
              {canDownload ? "↓" : <span title="Transferred via WebRTC">📡</span>}
            </div>
          </div>
          <TimeRow time={time} isOwn={isOwn} isRead={isRead} />
        </div>
      </div>
    );
  }

  /* ── System message ── */
  if (type === "system") {
    return (
      <div style={{ textAlign: "center", padding: "0.5rem 1rem", marginBottom: "0.5rem" }}>
        <span style={{
          color: "#334155", fontSize: "0.75rem", fontStyle: "italic",
          background: "rgba(255,255,255,0.03)", borderRadius: "999px",
          padding: "0.2rem 0.75rem",
        }}>{content}</span>
      </div>
    );
  }

  /* ── Text message (default) ── */
  return (
    <div style={wrapStyle}>
      <div>
        <div style={{
          ...bubbleBase,
          padding: "0.55rem 0.9rem",
          background: isOwn ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
          color: isOwn ? "#0a0a0f" : "#e2e8f0",
        }}>
          {content}
        </div>
        <TimeRow time={time} isOwn={isOwn} isRead={isRead} />
      </div>
    </div>
  );
}

/* ─── Timestamp + read receipt ───────────────────────────────────────────── */
function TimeRow({ time, isOwn, isRead }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.25rem",
      justifyContent: isOwn ? "flex-end" : "flex-start",
      fontSize: "0.68rem", color: "#475569",
      marginTop: "0.2rem",
      paddingLeft: isOwn ? 0 : "0.25rem",
      paddingRight: isOwn ? "0.25rem" : 0,
    }}>
      <span>{time}</span>
      {isOwn && (
        <span style={{ color: isRead ? "#6ee7f7" : "#475569", fontSize: "0.7rem" }}>
          {isRead ? "✓✓" : "✓"}
        </span>
      )}
    </div>
  );
}