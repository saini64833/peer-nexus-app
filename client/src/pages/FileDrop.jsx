// src/pages/FileDrop.jsx

import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { chatApi } from "../services/api";
import toast from "react-hot-toast";

export default function FileDrop() {
  const { user } = useAuth();
  const { on, emit, isConnected } = useSocket();

  const [conversationId, setConversationId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [incomingFiles, setIncomingFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  const peerRef = useRef(null);
  const channelRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // Receive incoming metadata event
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return on("chat:file_incoming", async (payload) => {
      toast.success(`Incoming file: ${payload.fileName}`);

      setIncomingFiles((prev) => [
        {
          ...payload,
          progress: 0,
        },
        ...prev,
      ]);
    });
  }, [on]);

  // ─────────────────────────────────────────────────────────────
  // Create peer connection
  // ─────────────────────────────────────────────────────────────
  const createPeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        emit("webrtc:ice-candidate", {
          candidate: event.candidate,
        });
      }
    };

    return peer;
  };

  // ─────────────────────────────────────────────────────────────
  // Send file
  // ─────────────────────────────────────────────────────────────
  const sendFile = async () => {
    try {
      if (!selectedFile) {
        return toast.error("Select a file first");
      }

      if (!conversationId.trim()) {
        return toast.error("Conversation ID required");
      }

      setSending(true);

      const transferId =
        crypto.randomUUID?.() || Date.now().toString();

      // Save metadata to backend
      await chatApi.sendFileMetadata(conversationId, {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        transferId,
      });

      // Create peer
      const peer = createPeer();
      peerRef.current = peer;

      // Data channel
      const channel = peer.createDataChannel("file-transfer");
      channelRef.current = channel;

      channel.binaryType = "arraybuffer";

      channel.onopen = async () => {
        toast.success("Connection established");

        const chunkSize = 16 * 1024;
        let offset = 0;

        const reader = new FileReader();

        reader.onload = (e) => {
          channel.send(e.target.result);

          offset += e.target.result.byteLength;

          const progress = Math.floor(
            (offset / selectedFile.size) * 100
          );

          toast.loading(`Sending ${progress}%`, {
            id: "sending-file",
          });

          if (offset < selectedFile.size) {
            readSlice(offset);
          } else {
            toast.success("File sent successfully", {
              id: "sending-file",
            });
            setSending(false);
          }
        };

        const readSlice = (o) => {
          const slice = selectedFile.slice(o, o + chunkSize);
          reader.readAsArrayBuffer(slice);
        };

        readSlice(0);
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      emit("webrtc:offer", {
        offer,
        transferId,
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to send file");
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06060f",
        color: "#e2e8f0",
        fontFamily: "'DM Sans', sans-serif",
        padding: "2rem",
      }}
    >
      <style>{`
        *{
          box-sizing:border-box;
        }

        @keyframes pulse {
          0%{transform:scale(1);}
          50%{transform:scale(1.03);}
          100%{transform:scale(1);}
        }
      `}</style>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <p
            style={{
              color: "#475569",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.4rem",
            }}
          >
            WebRTC Peer Transfer
          </p>

          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "-0.04em",
            }}
          >
            File Drop 📁
          </h1>

          <p
            style={{
              marginTop: "0.7rem",
              color: "#64748b",
              fontSize: "0.92rem",
              lineHeight: 1.7,
              maxWidth: 650,
            }}
          >
            Transfer files directly peer-to-peer using WebRTC DataChannels.
            Files are not stored on the server.
          </p>
        </div>

        {/* Status */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConnected ? "#4ade80" : "#f87171",
              boxShadow: isConnected
                ? "0 0 8px #4ade80"
                : "none",
            }}
          />
          <span
            style={{
              color: isConnected ? "#4ade80" : "#f87171",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {isConnected ? "Socket Connected" : "Socket Offline"}
          </span>
        </div>

        {/* Upload Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.2rem",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Conversation ID */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.45rem",
                color: "#94a3b8",
                fontSize: "0.82rem",
              }}
            >
              Conversation ID
            </label>

            <input
              type="text"
              value={conversationId}
              onChange={(e) =>
                setConversationId(e.target.value)
              }
              placeholder="Enter conversation id..."
              style={{
                width: "100%",
                padding: "0.8rem 1rem",
                borderRadius: "0.8rem",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#fff",
                outline: "none",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);

              const file = e.dataTransfer.files?.[0];
              if (file) setSelectedFile(file);
            }}
            style={{
              border: dragging
                ? "2px solid #6ee7f7"
                : "2px dashed rgba(255,255,255,0.1)",
              borderRadius: "1rem",
              padding: "2.5rem",
              textAlign: "center",
              background: dragging
                ? "rgba(110,231,247,0.05)"
                : "transparent",
              transition: "all 0.25s",
              animation: dragging
                ? "pulse 1s infinite"
                : "none",
            }}
          >
            <div style={{ fontSize: "2.8rem" }}>📁</div>

            <h3
              style={{
                marginTop: "0.8rem",
                color: "#f1f5f9",
                fontSize: "1rem",
              }}
            >
              Drag & Drop File
            </h3>

            <p
              style={{
                marginTop: "0.4rem",
                color: "#64748b",
                fontSize: "0.82rem",
              }}
            >
              or click below to choose a file
            </p>

            <input
              type="file"
              onChange={(e) =>
                setSelectedFile(e.target.files?.[0])
              }
              style={{
                marginTop: "1rem",
                color: "#94a3b8",
              }}
            />
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "0.9rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontWeight: 600,
                    }}
                  >
                    {selectedFile.name}
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "0.8rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>

                <button
                  onClick={sendFile}
                  disabled={sending}
                  style={{
                    padding: "0.8rem 1.2rem",
                    borderRadius: "0.8rem",
                    border: "none",
                    background:
                      "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                    color: "#06060f",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? "Sending..." : "Send File"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Incoming */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.2rem",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              marginBottom: "1rem",
              color: "#f8fafc",
            }}
          >
            Incoming Transfers
          </h2>

          {incomingFiles.length === 0 ? (
            <p
              style={{
                color: "#475569",
                fontSize: "0.85rem",
              }}
            >
              No incoming files yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {incomingFiles.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.9rem",
                    background: "rgba(255,255,255,0.03)",
                    border:
                      "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#f8fafc",
                          fontWeight: 600,
                        }}
                      >
                        {file.fileName}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.78rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>

                    <button
                      style={{
                        padding: "0.65rem 1rem",
                        borderRadius: "0.7rem",
                        border: "none",
                        background: "#4ade80",
                        color: "#04130a",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}