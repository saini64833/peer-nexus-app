import { useEffect, useState } from "react";

const useNetworkSpeed = () => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const check = () => {
      const slowTypes = ["slow-2g", "2g"];
      setSlow(slowTypes.includes(conn.effectiveType) || conn.downlink < 1);
    };
    check();
    conn.addEventListener("change", check);
    return () => conn.removeEventListener("change", check);
  }, []);
  return slow;
};

/**
 * Loader component
 * @param {"route"|"inline"|"button"} type
 * @param {string} message  — optional text shown below spinner (route type only)
 */
export default function Loader({ type = "route", message }) {
  const slow = useNetworkSpeed();
  const duration = slow ? 1.8 : 1.1;

  /* ── Route loader: full-screen overlay ── */
  if (type === "route") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#0a0a0f",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "1.5rem",
        animation: "fadeIn 0.25s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Cabinet+Grotesk:wght@800&display=swap');
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.95)} 50%{opacity:1;transform:scale(1)} }
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position:  200% center; }
          }
        `}</style>

        {/* Logo mark */}
        <div style={{
          width: 44, height: 44, borderRadius: "0.75rem",
          background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cabinet Grotesk', sans-serif",
          fontWeight: 900, fontSize: "1.4rem", color: "#0a0a0f",
          animation: `pulse ${duration}s ease-in-out infinite`,
        }}>P</div>

        {/* Spinner ring */}
        <div style={{ position: "relative", width: 48, height: 48 }}>
          {/* Track */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.06)",
          }} />
          {/* Spinning arc */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "#6ee7f7",
            borderRightColor: "#a78bfa",
            animation: `spin ${duration * 0.7}s linear infinite`,
          }} />
        </div>

        {/* Shimmer text */}
        {message && (
          <p style={{
            fontSize: "0.825rem", letterSpacing: "0.04em",
            background: "linear-gradient(90deg,#475569,#94a3b8,#475569)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: `shimmer ${duration * 1.5}s linear infinite`,
            margin: 0,
          }}>{message}</p>
        )}

        {slow && (
          <p style={{ color: "#334155", fontSize: "0.75rem", margin: 0 }}>
            Slow connection detected…
          </p>
        )}
      </div>
    );
  }

  /* ── Inline loader: fits inside a container ── */
  if (type === "inline") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "3rem 0", gap: "0.75rem",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.06)",
          borderTopColor: "#6ee7f7",
          animation: `spin ${duration * 0.7}s linear infinite`,
          flexShrink: 0,
        }} />
        {message && <span style={{ color: "#475569", fontSize: "0.85rem" }}>{message}</span>}
      </div>
    );
  }

  /* ── Button loader: tiny spinner for inside a button ── */
  if (type === "button") {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{
          display: "inline-block",
          width: 14, height: 14, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.2)",
          borderTopColor: "#fff",
          animation: "spin 0.7s linear infinite",
          verticalAlign: "middle",
        }} />
      </>
    );
  }

  return null;
}