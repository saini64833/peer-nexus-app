import { useState, useEffect } from "react";
import { chatApi } from "../services/api";
import { useSocket } from "../context/SocketContext";
import ContactList from "../features/messaging/ContactList";
import ChatWindow from "../features/messaging/ChatWindow";
import toast from "react-hot-toast";

export default function WhatsAppClone() {
  const { on } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all conversations
  useEffect(() => {
    chatApi.getConversations()
      .then(({ data }) => setConversations(data.data ?? []))
      .catch(() => toast.error("Failed to load conversations"))
      .finally(() => setLoading(false));
  }, []);

  // Refresh unread counts when a new message arrives for a non-active conv
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

  const handleSelect = (conv) => {
    setSelected(conv);
    // Reset unread for selected conv locally
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    );
  };

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 60px)",
      background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
    }}>
      <ContactList
        conversations={conversations}
        selectedId={selected?._id}
        onSelect={handleSelect}
        loading={loading}
      />
      <ChatWindow conversation={selected} />
    </div>
  );
}
