import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth }      from "../../context/AuthContext";
import { useSocket }    from "../../context/SocketContext";
import { chatApi }      from "../../services/api";
import { useChatScroll } from "../../hooks/useChatScroll";
import MessageBubble    from "./MessageBubble";
import toast            from "react-hot-toast";

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ user, size = 36 }) {
  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return user?.avatar
    ? <img src={user.avatar} alt={user.fullName} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#0a0a0f", flexShrink: 0 }}>{initials}</div>;
}

/* ─── Image preview modal before sending ─────────────────────────────────── */
function ImagePreview({ file, onSend, onCancel, sending }) {
  const [preview] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(9,9,18,0.96)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "1rem",
      borderRadius: "inherit",
    }}>
      <img src={preview} alt="preview" style={{ maxWidth: "80%", maxHeight: "55%", borderRadius: "0.75rem", objectFit: "contain" }} />
      <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{file.name}</div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={onCancel} style={{ padding: "0.55rem 1.1rem", borderRadius: "0.65rem", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem" }}>Cancel</button>
        <button onClick={onSend} disabled={sending} style={{ padding: "0.55rem 1.4rem", borderRadius: "0.65rem", border: "none", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", color: "#0a0a0f", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: "0.85rem", opacity: sending ? 0.6 : 1 }}>
          {sending ? "Sending…" : "Send Image"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ChatWindow({ conversation }) {
  const { user }   = useAuth();
  const { on, joinConversation, leaveConversation, sendTyping, markRead, isOnline } = useSocket();

  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [isTyping, setIsTyping]   = useState(false);

  // Image attach
  const [imageFile, setImageFile] = useState(null);
  const [sendingImg, setSendingImg] = useState(false);
  const imageInputRef = useRef(null);

  const typingTimer = useRef(null);
  const scrollRef   = useChatScroll([messages]);

  const convId    = conversation?._id;
  const otherUser = conversation?.otherUser;
  const online    = otherUser ? isOnline(otherUser._id) : false;

  /* ── Load history ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    setMessages([]);
    chatApi.getMessages(convId)
      .then(({ data }) => setMessages(data.data.messages ?? []))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoading(false));

    joinConversation(convId);
    markRead(convId);
    return () => leaveConversation(convId);
  }, [convId]);

  /* ── Incoming message ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    return on("chat:message", (msg) => {
      const msgConvId = msg.conversationId?._id ?? msg.conversationId;
      if (msgConvId === convId) {
        setMessages((prev) => [...prev, msg]);
        markRead(convId);
      }
    });
  }, [on, convId, markRead]);

  /* ── Typing indicator ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    return on("chat:typing", ({ conversationId, userId, isTyping: typing }) => {
      if (conversationId === convId && userId !== user._id) setIsTyping(typing);
    });
  }, [on, convId, user._id]);

  /* ── Deleted message ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    return on("chat:message_deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m)
      );
    });
  }, [on, convId]);

  /* ── Read receipts ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!convId) return;
    return on("chat:read", ({ conversationId, readBy }) => {
      if (conversationId === convId && readBy !== user._id) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    });
  }, [on, convId, user._id]);

  /* ── Send text ─────────────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    sendTyping(convId, false);
    clearTimeout(typingTimer.current);
    try {
      await chatApi.sendMessage(convId, text.trim());
      setText("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [text, sending, convId, sendTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTypingChange = (val) => {
    setText(val);
    sendTyping(convId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(convId, false), 1500);
  };

  /* ── Send image ────────────────────────────────────────────────────────── */
  const handleImageSend = useCallback(async () => {
    if (!imageFile || sendingImg) return;
    setSendingImg(true);
    const form = new FormData();
    form.append("image", imageFile);
    try {
      await chatApi.sendImageMessage(convId, form);
      setImageFile(null);
      toast.success("Image sent!");
    } catch {
      toast.error("Failed to send image");
    } finally {
      setSendingImg(false);
    }
  }, [imageFile, sendingImg, convId]);

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (!conversation) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "#334155", fontFamily: "'DM Sans',sans-serif", background: "#0a0a0f" }}>
        <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>💬</div>
        <p style={{ fontSize: "0.875rem" }}>Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f", position: "relative" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <Avatar user={otherUser} />
          {online && <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: "#4ade80", border: "2px solid #0d0d14" }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 500, fontSize: "0.9rem", fontFamily: "'DM Sans',sans-serif" }}>{otherUser?.fullName}</div>
          <div style={{ fontSize: "0.73rem" }}>
            {isTyping
              ? <span style={{ color: "#6ee7f7" }}>typing…</span>
              : <span style={{ color: online ? "#4ade80" : "#475569" }}>{online ? "● Online" : `@${otherUser?.userName}`}</span>
            }
          </div>
        </div>
      </div>

      {/* ── Image preview overlay ── */}
      {imageFile && (
        <ImagePreview
          file={imageFile}
          onSend={handleImageSend}
          onCancel={() => { setImageFile(null); }}
          sending={sendingImg}
        />
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#6ee7f7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#334155", fontSize: "0.85rem" }}>
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.senderId?._id === user._id || msg.senderId === user._id}
          />
        ))}
      </div>

      {/* ── Input bar ── */}
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "0.6rem", alignItems: "flex-end", background: "#0d0d14", flexShrink: 0 }}>

        {/* Image attach button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          title="Send image"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.65rem", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem", flexShrink: 0, transition: "background 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
        >🖼️</button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) setImageFile(e.target.files[0]); e.target.value = ""; }}
        />

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => handleTypingChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, resize: "none",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem", padding: "0.6rem 0.9rem",
            color: "#e2e8f0", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif",
            outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = "rgba(110,231,247,0.35)"}
          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            padding: "0.6rem 1.1rem", borderRadius: "0.75rem",
            background: text.trim() ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
            color: text.trim() ? "#0a0a0f" : "#475569",
            border: "none", fontWeight: 600, fontSize: "0.875rem",
            cursor: text.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
          }}
        >
          {sending
            ? <span style={{ width: 14, height: 14, border: "2px solid rgba(10,10,15,0.25)", borderTopColor: "#0a0a0f", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
            : "Send"
          }
        </button>
      </div>
    </div>
  );
}