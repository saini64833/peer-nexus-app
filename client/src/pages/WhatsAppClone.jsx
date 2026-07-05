import { useState, useEffect, useRef } from "react";
import { chatApi } from "../services/api";
import { useSocket } from "../context/SocketContext";
import ContactList from "../features/messaging/ContactList";
import ChatWindow from "../features/messaging/ChatWindow";
import toast from "react-hot-toast";

export default function WhatsAppClone() {
  const { on } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [loading, setLoading]             = useState(true);

  // New chat search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ]       = useState("");
  const [searchRes, setSearchRes]   = useState([]);
  const [searching, setSearching]   = useState(false);
  const searchTimer = useRef(null);

  // Load conversations
  useEffect(() => {
    chatApi.getConversations()
      .then(({ data }) => setConversations(data.data ?? []))
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  // Live unread count update
  useEffect(() => {
    return on("chat:message", (msg) => {
      const cId = msg.conversationId?._id ?? msg.conversationId;
      setConversations((prev) =>
        prev.map((c) =>
          c._id === cId && c._id !== selected?._id
            ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1, lastMessage: { text: msg.content, sentAt: msg.createdAt } }
            : c
        )
      );
    });
  }, [on, selected]);

  // Debounced user search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      chatApi.searchUsers(searchQ)
        .then(({ data }) => setSearchRes(data.data?.slice(0, 8) || []))
        .catch(() => setSearchRes([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchQ]);

  const handleSelect = (conv) => {
    setSelected(conv);
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    );
  };

  // Start or open a conversation with any user from search
  const startChat = async (targetUser) => {
    try {
      const { data } = await chatApi.getOrCreateConversation(targetUser._id);
      const conv = data.data;

      // Shape it to match the conversation list format
      const shaped = {
        _id:       conv._id,
        otherUser: conv.memberIds?.find((m) => m._id !== targetUser._id) ?? targetUser,
        participants: conv.memberIds,
        lastMessage: conv.lastMessage ?? null,
        unreadCount: 0,
      };

      // Add to list if not already there
      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) return prev;
        return [shaped, ...prev];
      });

      setSelected(shaped);
      setShowSearch(false);
      setSearchQ("");
      setSearchRes([]);
    } catch {
      toast.error("Could not open conversation");
    }
  };

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
    }}>

      {/* Left sidebar */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#0d0d14", height: "100%" }}>

        {/* Header with New Chat button */}
        <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem" }}>Messages</span>
            <button
              onClick={() => { setShowSearch((v) => !v); setSearchQ(""); setSearchRes([]); }}
              title="New conversation"
              style={{
                background: showSearch ? "rgba(110,231,247,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showSearch ? "rgba(110,231,247,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "0.55rem", padding: "0.3rem 0.65rem",
                color: showSearch ? "#6ee7f7" : "#64748b",
                cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
              }}
            >
              {showSearch ? "✕ Cancel" : "+ New Chat"}
            </button>
          </div>

          {/* New chat search panel */}
          {showSearch && (
            <div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "#334155", pointerEvents: "none", fontSize: "0.85rem" }}>⌕</span>
                <input
                  autoFocus
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search by name or username…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(110,231,247,0.25)",
                    borderRadius: "0.6rem", padding: "0.45rem 0.75rem 0.45rem 2rem",
                    color: "#e2e8f0", fontSize: "0.82rem", outline: "none",
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                />
                {searching && (
                  <div style={{ position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#6ee7f7", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                )}
              </div>

              {/* Search results */}
              {searchRes.length > 0 && (
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  {searchRes.map((u) => {
                    const initials = u.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
                    return (
                      <div
                        key={u._id}
                        onClick={() => startChat(u)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.65rem",
                          padding: "0.5rem 0.6rem", borderRadius: "0.6rem",
                          cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {u.avatar
                          ? <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#06060f", flexShrink: 0 }}>{initials}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 500 }}>{u.fullName}</div>
                          <div style={{ color: "#475569", fontSize: "0.7rem" }}>@{u.userName}</div>
                        </div>
                        <span style={{ color: "#334155", fontSize: "0.72rem" }}>→</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {searchQ.trim() && !searching && searchRes.length === 0 && (
                <p style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center", padding: "1rem 0" }}>No users found</p>
              )}
            </div>
          )}

          {/* Normal search — filter existing convs */}
          {!showSearch && (
            <input
              placeholder="Search conversations…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.6rem", padding: "0.45rem 0.75rem",
                color: "#e2e8f0", fontSize: "0.85rem", outline: "none",
                fontFamily: "'DM Sans',sans-serif",
              }}
              // pass to ContactList via search state if you want — for now just UI placeholder
            />
          )}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <ContactList
            conversations={conversations}
            selectedId={selected?._id}
            onSelect={handleSelect}
            loading={loading}
          />
        </div>
      </div>

      {/* Chat window */}
      <ChatWindow conversation={selected} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}