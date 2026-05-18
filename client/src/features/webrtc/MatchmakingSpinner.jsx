/**
 * MatchmakingSpinner — shown while waiting in the matchmaking queue.
 */
export default function MatchmakingSpinner({ position }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "1.5rem", padding: "3rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @keyframes spin-ring {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "3px solid rgba(110,231,247,0.15)",
          borderTopColor: "#6ee7f7",
          borderRadius: "50%",
          animation: "spin-ring 0.9s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 10,
          border: "3px solid rgba(167,139,250,0.15)",
          borderTopColor: "#a78bfa",
          borderRadius: "50%",
          animation: "spin-ring 1.4s linear infinite reverse",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "1.05rem", marginBottom: "0.4rem" }}>
          Finding your match…
        </div>
        <div style={{ color: "#475569", fontSize: "0.85rem" }}>
          {position != null ? `Position in queue: ${position}` : "Connecting to peers"}
        </div>
      </div>
    </div>
  );
}
