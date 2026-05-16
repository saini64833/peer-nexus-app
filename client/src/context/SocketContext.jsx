import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const SocketContext = createContext(null);

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

// Connection states
export const CONN = {
  IDLE:         "idle",
  CONNECTING:   "connecting",
  CONNECTED:    "connected",
  DISCONNECTED: "disconnected",
  ERROR:        "error",
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const socketRef = useRef(null);           // raw socket.io instance
  const listenersRef = useRef(new Map());   // event → Set<handler> — avoids duplicate bindings
  const reconnectTimerRef = useRef(null);

  const [connState, setConnState]         = useState(CONN.IDLE);
  const [onlineUsers, setOnlineUsers]     = useState([]);  // array of user IDs

  // ── helpers ──────────────────────────────────────────────────────────────
  const getSocket = useCallback(() => socketRef.current, []);

  // ── connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnState(CONN.CONNECTING);

    const socket = io(SOCKET_URL, {
      withCredentials: true,          // sends httpOnly cookies → server authenticates user
      transports: ["websocket"],      // skip long-polling for lower latency
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    socketRef.current = socket;

    // ── lifecycle ────────────────────────────────────────────────────────────
    socket.on("connect", () => {
      setConnState(CONN.CONNECTED);
      clearTimeout(reconnectTimerRef.current);
    });

    socket.on("disconnect", (reason) => {
      setConnState(CONN.DISCONNECTED);
      setOnlineUsers([]);

      // If the server closed the connection intentionally, don't auto-reconnect
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => {
      setConnState(CONN.ERROR);
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("reconnect", (attempt) => {
      setConnState(CONN.CONNECTED);
      console.info(`[Socket] Reconnected after ${attempt} attempt(s)`);
    });

    socket.on("reconnect_failed", () => {
      setConnState(CONN.ERROR);
      toast.error("Real-time connection lost. Please refresh.", {
        id: "socket-error",
        duration: Infinity,
        icon: "⚠️",
      });
    });

    // ── presence ─────────────────────────────────────────────────────────────
    // Server emits the current online user list on connect and on every change
    socket.on("presence:online_users", (userIds) => {
      setOnlineUsers(userIds);
    });

    socket.on("presence:user_online", (userId) => {
      setOnlineUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
    });

    socket.on("presence:user_offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });
  }, []);

  // ── disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    listenersRef.current.clear();
    setConnState(CONN.IDLE);
    setOnlineUsers([]);
  }, []);

  // ── Connect / disconnect based on auth state ──────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isAuthenticated, connect, disconnect]);

  // ─────────────────────────────────────────────────────────────────────────
  // Event subscription helper
  // Prevents duplicate listeners and cleans up on unmount automatically.
  //
  // Usage (inside any component):
  //   const { on } = useSocket();
  //   useEffect(() => on("chat:message", handler), []);
  //   — returns a cleanup fn so it works perfectly inside useEffect.
  // ─────────────────────────────────────────────────────────────────────────
  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    // Track in our map so we can deduplicate
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    const handlers = listenersRef.current.get(event);

    if (!handlers.has(handler)) {
      handlers.add(handler);
      socket.on(event, handler);
    }

    return () => {
      socket.off(event, handler);
      handlers.delete(handler);
    };
  }, []);

  // ── Emit helper ───────────────────────────────────────────────────────────
  const emit = useCallback((event, data, ack) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn(`[Socket] Tried to emit "${event}" but socket is not connected.`);
      return;
    }
    if (typeof ack === "function") {
      socket.emit(event, data, ack);
    } else {
      socket.emit(event, data);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Messaging helpers ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /** Join a conversation room to receive its messages. */
  const joinConversation = useCallback((conversationId) => {
    emit("chat:join", { conversationId });
  }, [emit]);

  /** Leave a conversation room. */
  const leaveConversation = useCallback((conversationId) => {
    emit("chat:leave", { conversationId });
  }, [emit]);

  /**
   * Send a message via socket (real-time delivery).
   * The server should persist it and broadcast to the room.
   */
  const sendMessage = useCallback((conversationId, content) => {
    emit("chat:message", { conversationId, content });
  }, [emit]);

  /** Notify the other participant that you are typing. */
  const sendTyping = useCallback((conversationId, isTyping) => {
    emit("chat:typing", { conversationId, isTyping });
  }, [emit]);

  /** Mark all messages in a conversation as read. */
  const markRead = useCallback((conversationId) => {
    emit("chat:read", { conversationId });
  }, [emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Matchmaking helpers ───────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /** Join the global matchmaking queue (Premium only). */
  const joinQueue = useCallback(() => {
    emit("matchmaking:join");
  }, [emit]);

  /** Leave the matchmaking queue. */
  const leaveQueue = useCallback(() => {
    emit("matchmaking:leave");
  }, [emit]);

  /** Skip the current matched peer and re-enter the queue. */
  const skipPeer = useCallback(() => {
    emit("matchmaking:skip");
  }, [emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── WebRTC signaling helpers ──────────────────────────────────────────────
  // Server acts as a signaling relay — it does NOT process these payloads.
  // ─────────────────────────────────────────────────────────────────────────

  /** Relay a WebRTC offer to a peer via the server. */
  const sendOffer = useCallback((targetId, offer) => {
    emit("webrtc:offer", { targetId, offer });
  }, [emit]);

  /** Relay a WebRTC answer to a peer. */
  const sendAnswer = useCallback((targetId, answer) => {
    emit("webrtc:answer", { targetId, answer });
  }, [emit]);

  /** Relay an ICE candidate to a peer. */
  const sendIceCandidate = useCallback((targetId, candidate) => {
    emit("webrtc:ice-candidate", { targetId, candidate });
  }, [emit]);

  /** Signal that this user is hanging up the call. */
  const sendHangup = useCallback((targetId) => {
    emit("webrtc:hangup", { targetId });
  }, [emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── Convenience derived values ────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  /** Returns true if a given userId is currently online. */
  const isOnline = useCallback(
    (userId) => onlineUsers.includes(userId),
    [onlineUsers]
  );

  const isConnected = connState === CONN.CONNECTED;

  // ─────────────────────────────────────────────────────────────────────────
  const value = {
    // raw access (for advanced use)
    socket: socketRef.current,
    getSocket,

    // state
    connState,
    isConnected,
    onlineUsers,
    isOnline,

    // core helpers
    on,
    emit,

    // messaging
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    markRead,

    // matchmaking
    joinQueue,
    leaveQueue,
    skipPeer,

    // webrtc signaling
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendHangup,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}

export default SocketContext;