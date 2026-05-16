import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ─── Animated network canvas ─────────────────────────────────────────────── */
function NetworkCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const nodes = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,  y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.8 + 1,      pulse: Math.random() * Math.PI * 2,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((n) => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(110,231,247,${(1 - d / 140) * 0.16})`; ctx.lineWidth = 0.7; ctx.stroke();
        }
      }
      nodes.forEach((n) => {
        const g = Math.sin(n.pulse) * 0.5 + 0.5;
        const rad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        rad.addColorStop(0, `rgba(110,231,247,${0.4 + g * 0.3})`);
        rad.addColorStop(1, "rgba(110,231,247,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = rad; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${0.7 + g * 0.3})`; ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }} />;
}

const Eye = ({ open }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}
  </svg>
);

const iStyle = (err, foc) => ({
  width: "100%", boxSizing: "border-box",
  background: foc ? "rgba(110,231,247,0.04)" : "rgba(255,255,255,0.03)",
  border: `1px solid ${err ? "rgba(248,113,113,0.55)" : foc ? "rgba(110,231,247,0.45)" : "rgba(255,255,255,0.08)"}`,
  borderRadius: "0.65rem", outline: "none",
  padding: "0.78rem 2.8rem 0.78rem 1rem",
  color: "#f1f5f9", fontSize: "0.9rem",
  fontFamily: "'DM Sans', sans-serif",
  transition: "border-color 0.2s, background 0.2s",
});

export default function LoginForm() {
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [errors, setErrors]   = useState({});
  const [focused, setFocused] = useState({});
  const [showPw, setShowPw]   = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const validate = (d) => {
    const e = {};
    if (!d.email.trim())              e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(d.email)) e.email = "Invalid email address";
    if (!d.password)                  e.password = "Password is required";
    else if (d.password.length < 6)   e.password = "Minimum 6 characters";
    return e;
  };

  const set = (k) => (ev) => {
    const val = ev.target.value;
    setForm((p) => ({ ...p, [k]: val }));
    if (touched[k]) setErrors((p) => ({ ...p, [k]: validate({ ...form, [k]: val })[k] }));
  };
  const blur = (k) => () => {
    setTouched((p) => ({ ...p, [k]: true }));
    setFocused((p) => ({ ...p, [k]: false }));
    setErrors((p) => ({ ...p, [k]: validate(form)[k] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const r = await login(form);
    if (r.success) navigate("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#06060f", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes ping{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes floatIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 1000px #0c0c1a inset!important;
          -webkit-text-fill-color:#f1f5f9!important;caret-color:#f1f5f9;
        }
        @media(max-width:768px){.lp-left{display:none!important;}}
      `}</style>

      {/* ── Left: visual panel ── */}
      <div className="lp-left" style={{
        flex: "0 0 50%", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "2.5rem",
      }}>
        <NetworkCanvas />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(6,6,15,0.9) 0%,rgba(6,6,15,0.35) 60%,rgba(6,6,15,0.95) 100%)" }} />

        {/* floating logo top */}
        <div style={{ position: "absolute", top: "2rem", left: "2.5rem", display: "flex", alignItems: "center", gap: "0.6rem", zIndex: 2 }}>
          <div style={{ width: 34, height: 34, borderRadius: "0.55rem", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#06060f" }}>P</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#f1f5f9", letterSpacing: "-0.02em" }}>PeerNexus</span>
        </div>

        {/* bottom copy */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,3vw,2.6rem)", color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            The peer-to-peer<br />
            <span style={{ background: "linear-gradient(90deg,#6ee7f7,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>workspace OS.</span>
          </h2>
          <p style={{ color: "#475569", fontSize: "0.875rem", lineHeight: 1.7, maxWidth: 320, marginBottom: "1.75rem" }}>
            File drops, persistent chats, and live video — all over WebRTC, right in your browser.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {[["📁","Zero-server P2P file sharing"],["💬","Socket.io persistent workspaces"],["📹","WebRTC video matchmaking"]].map(([ic, tx]) => (
              <div key={tx} style={{ display: "flex", alignItems: "center", gap: "0.65rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.55rem", padding: "0.55rem 0.85rem", backdropFilter: "blur(6px)" }}>
                <span style={{ fontSize: "0.9rem" }}>{ic}</span>
                <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{tx}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2rem 1.5rem",
        background: "rgba(9,9,18,0.97)",
        borderLeft: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          width: "100%", maxWidth: 390,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(22px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
          {/* badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(110,231,247,0.07)", border: "1px solid rgba(110,231,247,0.18)", borderRadius: "999px", padding: "0.22rem 0.7rem", marginBottom: "1rem", fontSize: "0.68rem", color: "#6ee7f7", letterSpacing: "0.08em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7f7", display: "inline-block", animation: "ping 1.9s ease-in-out infinite" }} />
            SECURE CONNECTION
          </div>

          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.85rem", color: "#f8fafc", letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>
            Sign in
          </h1>
          <p style={{ color: "#475569", fontSize: "0.85rem", marginBottom: "2rem" }}>
            Your workspace is waiting.
          </p>

          <form onSubmit={submit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem" }}>
                <span style={{ color: errors.email ? "#f87171" : "#6ee7f7" }}>✦</span> Email
              </label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={set("email")} onFocus={() => setFocused((p) => ({ ...p, email: true }))} onBlur={blur("email")}
                style={iStyle(errors.email, focused.email)} autoComplete="email" />
              {errors.email && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.42rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  <span style={{ color: errors.password ? "#f87171" : "#6ee7f7" }}>⬡</span> Password
                </label>
                <Link to="/forgot-password" style={{ color: "#6ee7f7", fontSize: "0.73rem", textDecoration: "none" }}>Forgot?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password}
                  onChange={set("password")} onFocus={() => setFocused((p) => ({ ...p, password: true }))} onBlur={blur("password")}
                  style={iStyle(errors.password, focused.password)} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                  style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568", display: "flex", padding: 0 }}>
                  <Eye open={showPw} />
                </button>
              </div>
              {errors.password && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.password}</p>}
            </div>

            <div style={{ marginBottom: "1.6rem" }} />

            {/* CTA */}
            <button type="submit" disabled={authLoading} style={{
              width: "100%", padding: "0.85rem",
              background: authLoading ? "rgba(110,231,247,0.2)" : "linear-gradient(135deg,#6ee7f7,#a78bfa)",
              border: "none", borderRadius: "0.7rem", color: "#06060f",
              fontWeight: 700, fontSize: "0.92rem", cursor: authLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
              transition: "opacity 0.2s, transform 0.15s",
            }}
              onMouseEnter={(e) => { if (!authLoading) e.currentTarget.style.opacity = "0.87"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { if (!authLoading) e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {authLoading
                ? <><span style={{ width: 14, height: 14, border: "2.5px solid rgba(6,6,15,0.25)", borderTopColor: "#06060f", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />Signing in…</>
                : <>Sign In →</>}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.6rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ color: "#1e293b", fontSize: "0.7rem", letterSpacing: "0.06em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <p style={{ textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
            No account?{" "}
            <Link to="/register" style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}>
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}