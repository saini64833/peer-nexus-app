import { useState } from "react";
import { paymentApi } from "../../services/api";
import toast from "react-hot-toast";

/**
 * CheckoutButton — initiates a Stripe Checkout session and redirects.
 * Props: { priceId, label, highlighted }
 */
export default function CheckoutButton({ priceId, label = "Upgrade", highlighted = false }) {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    if (!priceId) return;
    setLoading(true);
    try {
      const { data } = await paymentApi.createCheckoutSession(priceId);
      const url = data?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Could not start checkout. Please try again.");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: "0.7rem 1.5rem", borderRadius: "0.75rem",
        background: highlighted ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.06)",
        color: highlighted ? "#0a0a0f" : "#e2e8f0",
        border: highlighted ? "none" : "1px solid rgba(255,255,255,0.1)",
        fontWeight: 600, fontSize: "0.875rem",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
