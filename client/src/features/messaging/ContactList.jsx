import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";

function Avatar({ user, size = 40 }) {
  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return user?.avatar ? (
    <img
      src={user.avatar}
      alt={user.fullName}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.7rem", fontWeight: 700, color: "#0a0a0f", flexShrink: 0,
    }}>{initials}</div>
  );
}

export default function ContactList({ conversations, selectedId, onSelect, loading }) {
  const { user } = useAuth();
  const { isOnline } = useSocket();
  const [search, setSearch] = useState("");

  const filtered = (conversations || []).filter((conv) => {
    const other = conv.otherUser;
    if (!other) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      other.fullName?.toLowerCase().includes(q) ||
      other.userName?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      background: "#0d0d14",
      height: "100%",
    }}>
      {/* Header */}
      <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: "0.75rem", fontFamily: "'DM Sans', sans-serif" }}>
          Messages
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.6rem", padding: "0.45rem 0.75rem",
            color: "#e2e8f0", fontSize: "0.85rem",
            outline: "none", fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
            Loading…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
            No conversations yet.
          </div>
        )}
        {filtered.map((conv) => {
          const other = conv.otherUser;
          const online = other ? isOnline(other._id) : false;
          const active = conv._id === selectedId;
          const unread = conv.unreadCount ?? 0;

          return (
            <div
              key={conv._id}
              onClick={() => onSelect(conv)}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem 1rem",
                cursor: "pointer",
                background: active ? "rgba(110,231,247,0.07)" : "transparent",
                borderLeft: active ? "2px solid #6ee7f7" : "2px solid transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Avatar + online dot */}
              <div style={{ position: "relative" }}>
                <Avatar user={other} size={42} />
                {online && (
                  <div style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 9, height: 9, borderRadius: "50%",
                    background: "#4ade80", border: "2px solid #0d0d14",
                  }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#f1f5f9", fontSize: "0.875rem", fontWeight: 500, truncate: true }}>
                    {other?.fullName ?? "Unknown"}
                  </span>
                  {conv.lastMessage?.sentAt && (
                    <span style={{ color: "#475569", fontSize: "0.7rem" }}>
                      {new Date(conv.lastMessage.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    color: "#64748b", fontSize: "0.78rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}>
                    {conv.lastMessage?.text ?? "No messages yet"}
                  </span>
                  {unread > 0 && (
                    <span style={{
                      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                      color: "#0a0a0f", fontSize: "0.65rem", fontWeight: 700,
                      borderRadius: "999px", padding: "0.1rem 0.45rem", minWidth: 18, textAlign: "center",
                    }}>{unread}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
