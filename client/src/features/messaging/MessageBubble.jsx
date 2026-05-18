/**
 * MessageBubble — renders a single chat message.
 * Props:
 *   message  — message object { _id, senderId, content, type, imageUrl, fileMetadata, createdAt, isRead, deletedAt }
 *   isOwn    — boolean, true if this message belongs to the current user
 */
export default function MessageBubble({ message, isOwn }) {
  const { content, type, imageUrl, fileMetadata, createdAt, deletedAt } = message;

  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const bubbleStyle = {
    maxWidth: "72%",
    padding: "0.55rem 0.9rem",
    borderRadius: isOwn ? "1.1rem 1.1rem 0.25rem 1.1rem" : "1.1rem 1.1rem 1.1rem 0.25rem",
    background: isOwn
      ? "linear-gradient(135deg,#6ee7f7,#a78bfa)"
      : "rgba(255,255,255,0.06)",
    color: isOwn ? "#0a0a0f" : "#e2e8f0",
    fontSize: "0.875rem",
    lineHeight: 1.5,
    wordBreak: "break-word",
    position: "relative",
  };

  const wrapStyle = {
    display: "flex",
    justifyContent: isOwn ? "flex-end" : "flex-start",
    marginBottom: "0.35rem",
    padding: "0 0.75rem",
  };

  if (deletedAt) {
    return (
      <div style={wrapStyle}>
        <div style={{ ...bubbleStyle, opacity: 0.5, fontStyle: "italic", color: "#64748b", background: "rgba(255,255,255,0.03)" }}>
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div>
        <div style={bubbleStyle}>
          {type === "text" && content}
          {type === "image" && imageUrl && (
            <img
              src={imageUrl}
              alt="shared image"
              style={{ maxWidth: "100%", borderRadius: "0.5rem", display: "block" }}
            />
          )}
          {type === "file" && fileMetadata && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>📁</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{fileMetadata.fileName}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                  {fileMetadata.fileSize > 1024 * 1024
                    ? `${(fileMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${(fileMetadata.fileSize / 1024).toFixed(0)} KB`}
                </div>
              </div>
            </div>
          )}
          {type === "system" && (
            <em style={{ opacity: 0.7, fontSize: "0.8rem" }}>{content}</em>
          )}
        </div>
        <div style={{
          textAlign: isOwn ? "right" : "left",
          fontSize: "0.68rem",
          color: "#475569",
          marginTop: "0.2rem",
          paddingLeft: isOwn ? 0 : "0.25rem",
          paddingRight: isOwn ? "0.25rem" : 0,
        }}>
          {time}
        </div>
      </div>
    </div>
  );
}
