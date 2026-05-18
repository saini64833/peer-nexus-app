import { forwardRef } from "react";

/**
 * VideoPlayer — wraps a <video> element for WebRTC streams.
 * Pass a ref from the parent; the stream is set via ref.current.srcObject.
 */
const VideoPlayer = forwardRef(function VideoPlayer(
  { muted = false, style = {}, label, mirror = false },
  ref
) {
  return (
    <div style={{ position: "relative", ...style }}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "1rem",
          background: "#111118",
          transform: mirror ? "scaleX(-1)" : "none",
          display: "block",
        }}
      />
      {label && (
        <div style={{
          position: "absolute", bottom: "0.75rem", left: "0.75rem",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
          color: "#e2e8f0", fontSize: "0.75rem", fontWeight: 500,
          padding: "0.25rem 0.65rem", borderRadius: "999px",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {label}
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
