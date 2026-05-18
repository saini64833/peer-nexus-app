import { useState, useCallback } from "react";
import { useSocket } from "../../context/SocketContext";
import { chatApi } from "../../services/api";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";

/**
 * P2PDropzone — drag-and-drop file sender via WebRTC DataChannel.
 * Registers file metadata with the server then opens a DataChannel to the peer.
 */
export default function P2PDropzone({ conversationId, peerConnection }) {
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (!peerConnection) {
        toast.error("No peer connection — start a call first.");
        return;
      }

      const transferId = `rtc-${uuid()}`;
      setSending(true);

      try {
        // Register metadata with server
        await chatApi.sendMessage(conversationId, `📁 Sending: ${file.name}`);

        // Open DataChannel and send file
        const channel = peerConnection.createDataChannel(transferId);
        channel.binaryType = "arraybuffer";

        channel.onopen = async () => {
          const buffer = await file.arrayBuffer();
          const CHUNK = 16_384;
          let offset = 0;
          while (offset < buffer.byteLength) {
            channel.send(buffer.slice(offset, offset + CHUNK));
            offset += CHUNK;
          }
          channel.close();
          toast.success(`Sent ${file.name}`);
          setSending(false);
        };

        channel.onerror = () => {
          toast.error("File transfer failed");
          setSending(false);
        };
      } catch (err) {
        toast.error("Failed to send file");
        setSending(false);
      }
    },
    [conversationId, peerConnection]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "#6ee7f7" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "1rem",
        padding: "1.5rem",
        textAlign: "center",
        background: dragging ? "rgba(110,231,247,0.05)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
        cursor: "default",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📤</div>
      <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
        {sending ? "Sending…" : "Drop a file here to send via P2P"}
      </div>
    </div>
  );
}
