/**
 * Button — reusable button with variant/size support.
 * Variants: "primary" | "secondary" | "danger" | "ghost"
 * Sizes: "sm" | "md" | "lg"
 */
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style: extraStyle = {},
  ...rest
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    borderRadius: "0.6rem",
    border: "1px solid transparent",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: "opacity 0.2s, background 0.2s, border-color 0.2s",
    opacity: disabled || loading ? 0.55 : 1,
    whiteSpace: "nowrap",
  };

  const sizes = {
    sm:  { fontSize: "0.8rem",  padding: "0.35rem 0.85rem" },
    md:  { fontSize: "0.875rem", padding: "0.5rem 1.1rem" },
    lg:  { fontSize: "1rem",    padding: "0.65rem 1.5rem" },
  };

  const variants = {
    primary: {
      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
      color: "#0a0a0f",
    },
    secondary: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#e2e8f0",
    },
    danger: {
      background: "rgba(248,113,113,0.12)",
      border: "1px solid rgba(248,113,113,0.3)",
      color: "#f87171",
    },
    ghost: {
      background: "transparent",
      color: "#94a3b8",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}
      {...rest}
    >
      {loading ? "…" : children}
    </button>
  );
}
