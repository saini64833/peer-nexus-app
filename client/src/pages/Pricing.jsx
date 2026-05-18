import PricingTierCard from "../features/billing/PricingTierCard";
import CheckoutButton from "../features/billing/CheckoutButton";
import { useAuth } from "../context/AuthContext";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started with basic messaging and dashboard access.",
    features: [
      "Unlimited text messaging",
      "User search & discovery",
      "Basic dashboard",
      "Community support",
    ],
    ctaLabel: "Current Plan",
    highlighted: false,
    priceId: null,
  },
  {
    name: "Premium",
    price: "$9",
    period: "/month",
    description: "Unlock video matchmaking and all advanced features.",
    features: [
      "Everything in Free",
      "Random video matchmaking",
      "P2P file transfers (up to 5 GB)",
      "Priority support",
      "Early access to new features",
    ],
    ctaLabel: "Upgrade to Pro",
    highlighted: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID ?? "price_placeholder",
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      background: "#0a0a0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "4rem 1.5rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 780, width: "100%", textAlign: "center" }}>
        <div style={{
          display: "inline-block",
          background: "rgba(110,231,247,0.08)", border: "1px solid rgba(110,231,247,0.2)",
          borderRadius: "999px", padding: "0.3rem 1rem",
          fontSize: "0.75rem", fontWeight: 600, color: "#6ee7f7",
          letterSpacing: "0.06em", textTransform: "uppercase",
          marginBottom: "1.25rem",
        }}>Pricing</div>

        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800,
          color: "#f1f5f9", letterSpacing: "-0.04em",
          marginBottom: "1rem", lineHeight: 1.1,
        }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: "#64748b", fontSize: "1.05rem", marginBottom: "3.5rem", maxWidth: 480, margin: "0 auto 3.5rem" }}>
          Start free and upgrade when you need the full experience.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}>
          {TIERS.map((tier) => (
            <PricingTierCard
              key={tier.name}
              {...tier}
              onCta={!tier.priceId ? undefined : undefined}
              ctaLabel={
                tier.name === "Free"
                  ? user ? "Current Free Plan" : "Get Started Free"
                  : user?.isPremium ? "Already Premium ✓" : tier.ctaLabel
              }
            >
              {tier.priceId && !user?.isPremium && (
                <CheckoutButton priceId={tier.priceId} label={tier.ctaLabel} highlighted />
              )}
            </PricingTierCard>
          ))}
        </div>

        <p style={{ color: "#334155", fontSize: "0.8rem", marginTop: "3rem" }}>
          Prices in USD. Cancel anytime. Powered by Stripe.
        </p>
      </div>
    </div>
  );
}
