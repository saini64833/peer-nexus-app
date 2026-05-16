import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

const AnimatedCounter = ({ target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [ref, visible] = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const GlowOrb = ({ style }) => (
  <div style={{
    position: "absolute", borderRadius: "50%",
    filter: "blur(80px)", opacity: 0.18, pointerEvents: "none",
    ...style
  }} />
);

const NavLink = ({ to, children, pill }) => (
  <Link to={to} style={{
    color: pill ? "#0a0a0f" : "#94a3b8",
    background: pill ? "linear-gradient(135deg,#6ee7f7,#a78bfa)" : "transparent",
    padding: pill ? "0.5rem 1.25rem" : "0.5rem 0.75rem",
    borderRadius: pill ? "999px" : "0",
    fontWeight: pill ? 600 : 400,
    fontSize: "0.9rem",
    textDecoration: "none",
    transition: "color 0.2s, opacity 0.2s",
    letterSpacing: pill ? "0.01em" : "0",
  }}
    onMouseEnter={e => { if (!pill) e.target.style.color = "#e2e8f0"; }}
    onMouseLeave={e => { if (!pill) e.target.style.color = "#94a3b8"; }}
  >{children}</Link>
);

const FeatureCard = ({ icon, color, title, desc, delay, badge }) => {
  const [ref, visible] = useInView();
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? color + "55" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "1.25rem",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "border-color 0.3s, transform 0.3s, box-shadow 0.3s",
        transform: visible ? (hov ? "translateY(-4px)" : "translateY(0)") : "translateY(28px)",
        opacity: visible ? 1 : 0,
        transitionDelay: delay,
        boxShadow: hov ? `0 8px 40px ${color}18` : "none",
      }}>
      {hov && <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(circle at 30% 30%, ${color}0a, transparent 70%)`,
        pointerEvents: "none",
      }} />}
      {badge && (
        <span style={{
          position: "absolute", top: "1rem", right: "1rem",
          background: `${color}22`, color: color,
          border: `1px solid ${color}44`,
          fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
          padding: "0.2rem 0.6rem", borderRadius: "999px",
          textTransform: "uppercase",
        }}>{badge}</span>
      )}
      <div style={{
        width: 48, height: 48, borderRadius: "0.75rem",
        background: `${color}15`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.4rem", marginBottom: "1.25rem",
        transition: "transform 0.3s",
        transform: hov ? "scale(1.1) rotate(-4deg)" : "scale(1)",
      }}>{icon}</div>
      <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.6rem", fontFamily: "'Cabinet Grotesk', sans-serif" }}>{title}</h3>
      <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </div>
  );
};

const StatCard = ({ value, suffix, label, color }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        textAlign: "center", padding: "1.5rem 1rem",
        background: hov ? "rgba(255,255,255,0.04)" : "transparent",
        borderRadius: "1rem", transition: "background 0.25s",
        cursor: "default",
      }}>
      <div style={{ fontSize: "2.4rem", fontWeight: 800, color, fontFamily: "'Cabinet Grotesk', sans-serif", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
        <AnimatedCounter target={value} suffix={suffix} />
      </div>
      <div style={{ color: "#475569", fontSize: "0.8rem", marginTop: "0.4rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
};

const PricingCard = ({ tier, price, features, color, popular }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: popular ? `linear-gradient(160deg, ${color}18, rgba(255,255,255,0.02))` : "rgba(255,255,255,0.02)",
        border: `1px solid ${popular ? color + "55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "1.5rem", padding: "2rem",
        transform: hov ? "translateY(-4px)" : popular ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.3s, box-shadow 0.3s",
        boxShadow: hov ? `0 12px 48px ${color}20` : "none",
        position: "relative",
      }}>
      {popular && (
        <div style={{
          position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(90deg, ${color}, #a78bfa)`,
          color: "#0a0a0f", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
          padding: "0.25rem 1rem", borderRadius: "0 0 0.75rem 0.75rem",
          textTransform: "uppercase",
        }}>Most Popular</div>
      )}
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{tier}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "1.5rem" }}>
        <span style={{ color: color, fontSize: "2rem", fontWeight: 800, fontFamily: "'Cabinet Grotesk', sans-serif" }}>${price}</span>
        <span style={{ color: "#475569", fontSize: "0.85rem" }}>/mo</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginBottom: "2rem" }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ color: color, fontSize: "1rem" }}>✦</span>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>{f}</span>
          </div>
        ))}
      </div>
      <Link to="/register" style={{
        display: "block", textAlign: "center",
        background: popular ? `linear-gradient(135deg, ${color}, #a78bfa)` : "transparent",
        color: popular ? "#0a0a0f" : color,
        border: `1px solid ${color}55`,
        borderRadius: "0.75rem", padding: "0.75rem",
        fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
        transition: "opacity 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >{popular ? "Start Free Trial" : "Get Started"}</Link>
    </div>
  );
};

const TechBadge = ({ label }) => (
  <span style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#64748b", fontSize: "0.78rem",
    padding: "0.3rem 0.8rem", borderRadius: "999px",
    fontFamily: "'JetBrains Mono', monospace",
  }}>{label}</span>
);

export default function Home() {
  const [heroRef, heroVisible] = useInView(0.05);
  const [featRef, featVisible] = useInView();
  const [pricRef, pricVisible] = useInView();
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif",
      overflowX: "hidden",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Cabinet+Grotesk:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #6ee7f755; color: #e2e8f0; }
        html { scroll-behavior: smooth; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(1.6);opacity:0} }
        @keyframes slide-up { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 40 ? "rgba(10,10,15,0.85)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(16px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "all 0.3s",
        padding: "0 2rem",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "0.5rem",
              background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 800, color: "#0a0a0f",
              fontFamily: "'Cabinet Grotesk', sans-serif",
            }}>P</div>
            <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#f1f5f9", letterSpacing: "-0.02em" }}>PeerNexus</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/login">Login</NavLink>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 0.5rem" }} />
            <NavLink to="/register" pill>Get Started</NavLink>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", paddingTop: 64 }}>
        <GlowOrb style={{ width: 500, height: 500, background: "#6ee7f7", top: "5%", left: "-10%" }} />
        <GlowOrb style={{ width: 600, height: 600, background: "#a78bfa", top: "10%", right: "-15%" }} />
        <GlowOrb style={{ width: 300, height: 300, background: "#f472b6", bottom: "5%", left: "30%" }} />

        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)",
        }} />

        <div ref={heroRef} style={{
          position: "relative", zIndex: 1, textAlign: "center",
          maxWidth: 820, padding: "0 2rem",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "none" : "translateY(32px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(110,231,247,0.08)", border: "1px solid rgba(110,231,247,0.2)",
            borderRadius: "999px", padding: "0.35rem 1rem", marginBottom: "2rem",
            fontSize: "0.8rem", color: "#6ee7f7", fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6ee7f7", animation: "pulse-ring 1.5s infinite", display: "inline-block" }} />
            Now in Public Beta · WebRTC + Socket.io Powered
          </div>

          <h1 style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: "clamp(2.8rem, 7vw, 5.2rem)",
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: "-0.04em", marginBottom: "1.5rem",
            color: "#f8fafc",
          }}>
            Your Browser is Now<br />
            <span style={{
              background: "linear-gradient(135deg, #6ee7f7 0%, #a78bfa 50%, #f472b6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>an Operating System.</span>
          </h1>

          <p style={{ color: "#64748b", fontSize: "clamp(0.95rem, 2vw, 1.15rem)", lineHeight: 1.75, maxWidth: 560, margin: "0 auto 2.5rem", fontWeight: 400 }}>
            P2P file drops. Persistent messaging. Random video matchmaking.
            All in one unified workspace — no installs, no compromises.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
            <Link to="/register" style={{
              padding: "0.875rem 2rem", borderRadius: "0.875rem",
              background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
              color: "#0a0a0f", fontWeight: 700, fontSize: "0.95rem",
              textDecoration: "none", letterSpacing: "0.01em",
              transition: "opacity 0.2s, transform 0.2s",
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
            >Launch Workspace →</Link>
            <Link to="/pricing" style={{
              padding: "0.875rem 2rem", borderRadius: "0.875rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#94a3b8", fontWeight: 500, fontSize: "0.95rem",
              textDecoration: "none", transition: "border-color 0.2s, color 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.transform = "none"; }}
            >View Pro Plans</Link>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {["WebRTC", "Socket.io", "MongoDB", "Node.js", "React", "Stripe"].map(t => <TechBadge key={t} label={t} />)}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", animation: "float 2s ease-in-out infinite", opacity: 0.4 }}>
          <div style={{ width: 1, height: 48, background: "linear-gradient(to bottom, transparent, #6ee7f7)", margin: "0 auto" }} />
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          <StatCard value={50000} suffix="+" label="Active Users" color="#6ee7f7" />
          <StatCard value={2} suffix="ms" label="Avg Latency" color="#a78bfa" />
          <StatCard value={99} suffix="%" label="Uptime SLA" color="#f472b6" />
          <StatCard value={1} suffix="B+" label="Files Transferred" color="#34d399" />
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 2rem" }}>
        <div ref={featRef} style={{ textAlign: "center", marginBottom: "3.5rem", opacity: featVisible ? 1 : 0, transform: featVisible ? "none" : "translateY(24px)", transition: "all 0.6s" }}>
          <div style={{ display: "inline-block", background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "999px", padding: "0.3rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Core Features
          </div>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            Everything You Need.<br />Nothing You Don't.
          </h2>
          <p style={{ color: "#475569", maxWidth: 480, margin: "0 auto", fontSize: "0.95rem", lineHeight: 1.7 }}>
            Three powerful modules, one seamless workspace built for the modern web.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem" }}>
          <FeatureCard delay="0s" icon="📁" color="#6ee7f7" title="Zero-Server File Drop"
            desc="Drag and drop any file directly to peers via WebRTC Data Channels. No cloud storage, no size limits, instant transfer at full speed." />
          <FeatureCard delay="0.1s" icon="💬" color="#a78bfa" title="Persistent Workspaces"
            desc="A native-feeling messenger with Socket.io real-time delivery, typing indicators, read receipts, and encrypted MongoDB message history." />
          <FeatureCard delay="0.2s" icon="📹" color="#f472b6" title="Global Matchmaking"
            badge="Premium" desc="Jump into the queue and connect face-to-face with strangers via ultra-low latency WebRTC video. Exclusive to Pro users." />
        </div>

        {/* How It Works */}
        <div style={{ marginTop: "5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.5rem", position: "relative" }}>
          <div style={{ gridColumn: "1/-1", textAlign: "center", marginBottom: "2rem" }}>
            <h3 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>How it works</h3>
          </div>
          {[
            { n: "01", label: "Sign Up", desc: "Create your account in 30 seconds", color: "#6ee7f7" },
            { n: "02", label: "Connect", desc: "Find contacts or join the matchmaking queue", color: "#a78bfa" },
            { n: "03", label: "Collaborate", desc: "Share files, chat, or go face-to-face", color: "#f472b6" },
            { n: "04", label: "Upgrade", desc: "Unlock premium features anytime", color: "#34d399" },
          ].map(({ n, label, desc, color }) => (
            <div key={n} style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: color, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{n}</div>
              <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9", marginBottom: "0.4rem" }}>{label}</div>
              <div style={{ color: "#475569", fontSize: "0.85rem", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div ref={pricRef} style={{ textAlign: "center", marginBottom: "3rem", opacity: pricVisible ? 1 : 0, transform: pricVisible ? "none" : "translateY(24px)", transition: "all 0.6s" }}>
            <div style={{ display: "inline-block", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "999px", padding: "0.3rem 1rem", marginBottom: "1rem", fontSize: "0.78rem", color: "#34d399", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Pricing
            </div>
            <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em" }}>
              Simple, Transparent Plans
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem", alignItems: "start" }}>
            <PricingCard tier="Free" price={0} color="#6ee7f7"
              features={["P2P File Sharing", "Persistent Messaging", "5 Contacts", "1GB Transfer / day"]} />
            <PricingCard tier="Pro" price={12} color="#a78bfa" popular
              features={["Everything in Free", "Video Matchmaking", "Unlimited Contacts", "Unlimited Transfer", "Priority Support"]} />
            <PricingCard tier="Team" price={49} color="#f472b6"
              features={["Everything in Pro", "Team Workspaces", "Admin Dashboard", "Custom Domain", "SLA Guarantee"]} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", overflow: "hidden", padding: "6rem 2rem", textAlign: "center" }}>
        <GlowOrb style={{ width: 400, height: 400, background: "#a78bfa", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.04em", marginBottom: "1rem" }}>
            Ready to go peer-to-peer?
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", marginBottom: "2rem" }}>
            Join 50,000+ users already on the network. Free forever.
          </p>
          <Link to="/register" style={{
            display: "inline-block",
            padding: "1rem 2.5rem", borderRadius: "1rem",
            background: "linear-gradient(135deg,#6ee7f7,#a78bfa,#f472b6)",
            color: "#0a0a0f", fontWeight: 700, fontSize: "1rem",
            textDecoration: "none", letterSpacing: "0.01em",
            transition: "opacity 0.2s, transform 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
          >Create Free Account →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{ width: 24, height: 24, borderRadius: "0.35rem", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800, color: "#0a0a0f", fontFamily: "'Cabinet Grotesk', sans-serif" }}>P</div>
          <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, color: "#475569", fontSize: "0.9rem" }}>PeerNexus</span>
        </div>
        <p style={{ color: "#334155", fontSize: "0.8rem" }}>© 2025 PeerNexus. Built with WebRTC & Socket.io.</p>
      </footer>
    </div>
  );
}