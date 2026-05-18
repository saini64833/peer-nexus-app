import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { chatApi } from "../../services/api";
import { useChatScroll } from "../../hooks/useChatScroll";
import MessageBubble from "./MessageBubble";
import toast from "react-hot-toast";

function Avatar({ user, size = 36 }) {
  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return user?.avatar ? (
    <img src={user.avatar} alt={user.fullName} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.65rem", fontWeight: 700, color: "#0a0a0f",
    }}>{initials}</div>
  );
}

export default function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const { on, joinConversation, leaveConversation, sendTyping, markRead } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const scrollRef = useChatScroll([messages]);

  const convId = conversation?._id;
  const otherUser = conversation?.otherUser;

  // Load message history
  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    chatApi.getMessages(convId)
      .then(({ data }) => setMessages(data.data.messages ?? []))
      .catch(() => toast.error("Failed to load messages"))
      .finally(() => setLoading(false));

    joinConversation(convId);
    markRead(convId);

    return () => leaveConversation(convId);
  }, [convId]);

  // Socket: incoming message
  useEffect(() => {
    if (!convId) return;
    return on("chat:message", (msg) => {
      if (msg.conversationId === convId || msg.conversationId?._id === convId) {
        setMessages((prev) => [...prev, msg]);
        markRead(convId);
      }
    });
  }, [on, convId, markRead]);

  // Socket: typing indicator
  useEffect(() => {
    if (!convId) return;
    return on("chat:typing", ({ conversationId, userId, isTyping: typing }) => {
      if (conversationId === convId && userId !== user._id) {
        setIsTyping(typing);
      }
    });
  }, [on, convId, user._id]);

  // Socket: message deleted
  useEffect(() => {
    if (!convId) return;
    return on("chat:message_deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m)
      );
    });
  }, [on, convId]);

  const handleTyping = (val) => {
    setText(val);
    sendTyping(convId, true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(convId, false), 1500);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    sendTyping(convId, false);
    try {
      await chatApi.sendMessage(convId, text.trim());
      setText("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0f" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0d14",
      }}>
        <Avatar user={otherUser} />
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: 500, fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>
            {otherUser?.fullName}
          </div>
          <div style={{ color: "#475569", fontSize: "0.75rem" }}>
            {isTyping ? <span style={{ color: "#6ee7f7" }}>typing…</span> : `@${otherUser?.userName}`}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#475569", fontSize: "0.85rem", padding: "2rem" }}>Loading…</div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.senderId?._id === user._id || msg.senderId === user._id}
          />
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: "0.85rem 1rem", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: "0.75rem", alignItems: "flex-end",
        background: "#0d0d14",
      }}>
        <textarea
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, resize: "none",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem", padding: "0.6rem 0.9rem",
            color: "#e2e8f0", fontSize: "0.875rem", fontFamily: "'DM Sans', sans-serif",
            outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
          }}
        />
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
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
