import { useState } from "react";

/**
 * PricingTierCard
 * Props: { name, price, period, description, features, highlighted, ctaLabel, onCta, loading }
 */
export default function PricingTierCard({
  name,
  price,
  period = "/month",
  description,
  features = [],
  highlighted = false,
  ctaLabel = "Get Started",
  onCta,
  loading = false,
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: highlighted ? "rgba(110,231,247,0.06)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${highlighted ? "#6ee7f7" : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "1.25rem",
        padding: "2rem 1.75rem",
        display: "flex", flexDirection: "column", gap: "1.5rem",
        position: "relative", overflow: "hidden",
        transition: "border-color 0.25s, box-shadow 0.25s",
        boxShadow: highlighted ? "0 0 40px rgba(110,231,247,0.1)" : "none",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {highlighted && (
        <div style={{
          position: "absolute", top: "1rem", right: "1rem",
          background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
          color: "#0a0a0f", fontSize: "0.65rem", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          padding: "0.2rem 0.6rem", borderRadius: "999px",
        }}>Popular</div>
      )}

      <div>
        <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
          <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.04em" }}>
            {price}
          </span>
          <span style={{ color: "#475569", fontSize: "0.85rem" }}>{period}</span>
        </div>
        {description && (
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.5rem", lineHeight: 1.5 }}>{description}</p>
        )}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {features.map((feat, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", color: "#94a3b8", fontSize: "0.875rem" }}>
            <span style={{ color: "#6ee7f7", marginTop: "0.05rem", flexShrink: 0 }}>✓</span>
            {feat}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta}
        disabled={loading}
        style={{
          padding: "0.7rem 1.25rem", borderRadius: "0.75rem",
          background: highlighted ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
          color: highlighted ? "#0a0a0f" : "#e2e8f0",
          border: highlighted ? "none" : "1px solid rgba(255,255,255,0.1)",
          fontWeight: 600, fontSize: "0.875rem", cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1, transition: "opacity 0.2s",
          fontFamily: "'DM Sans', sans-serif",
          marginTop: "auto",
        }}
      >
        {loading ? "Processing…" : ctaLabel}
      </button>
    </div>
  );
}
