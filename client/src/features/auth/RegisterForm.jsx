import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ─── Animated ring canvas ────────────────────────────────────────────────── */
function RingCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const tick = () => {
      t += 0.008;
      const cx = canvas.width / 2, cy = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 3 rotating rings
      [
        { r: Math.min(cx, cy) * 0.72, dash: [6, 12], speed: 1,    color: "rgba(110,231,247,0.18)", lw: 1 },
        { r: Math.min(cx, cy) * 0.55, dash: [3, 9],  speed: -1.4, color: "rgba(167,139,250,0.18)", lw: 1 },
        { r: Math.min(cx, cy) * 0.38, dash: [8, 16], speed: 0.7,  color: "rgba(244,114,182,0.14)", lw: 0.8 },
      ].forEach(({ r, dash, speed, color, lw }) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * speed);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.restore();
      });
      // nodes on outer ring
      const count = 8, R = Math.min(cx, cy) * 0.72;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + t;
        const x = cx + Math.cos(angle) * R, y = cy + Math.sin(angle) * R;
        const g = Math.sin(t * 2 + i) * 0.5 + 0.5;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
        grad.addColorStop(0, `rgba(110,231,247,${0.5 + g * 0.4})`);
        grad.addColorStop(1, "rgba(110,231,247,0)");
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(167,139,250,${0.7 + g * 0.3})`; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} />;
}

/* ─── Strength bar ─────────────────────────────────────────────────────────── */
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return [
    { score: s, label: "Weak",   color: "#f87171" },
    { score: s, label: "Fair",   color: "#fb923c" },
    { score: s, label: "Good",   color: "#facc15" },
    { score: s, label: "Strong", color: "#4ade80" },
    { score: s, label: "Great",  color: "#6ee7f7" },
  ][s];
};

/* ─── Avatar dropzone ──────────────────────────────────────────────────────── */
function AvatarPicker({ value, preview, onChange, error }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const pick = useCallback((file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    onChange(file);
  }, [onChange]);
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ color: error ? "#f87171" : "#6ee7f7" }}>◈</span> Profile photo
      </label>
      <div
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        style={{
          display: "flex", alignItems: "center", gap: "1rem",
          padding: "0.9rem 1.1rem",
          background: drag ? "rgba(110,231,247,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px dashed ${error ? "rgba(248,113,113,0.55)" : drag ? "rgba(110,231,247,0.45)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "0.7rem", cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: preview ? `url(${preview}) center/cover` : "linear-gradient(135deg,rgba(110,231,247,0.12),rgba(167,139,250,0.12))",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem", overflow: "hidden",
          boxShadow: preview ? "0 0 0 2px rgba(110,231,247,0.3)" : "none",
          transition: "box-shadow 0.2s",
        }}>
          {!preview && "📷"}
        </div>
        <div>
          <p style={{ color: value ? "#94a3b8" : "#64748b", fontSize: "0.82rem", margin: 0 }}>
            {value ? value.name : "Drop photo or click to upload"}
          </p>
          <p style={{ color: "#2d3748", fontSize: "0.72rem", margin: "0.15rem 0 0" }}>JPG or PNG · max 5 MB</p>
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/jpg" style={{ display: "none" }}
          onChange={(e) => pick(e.target.files[0])} />
      </div>
      {error && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {error}</p>}
    </div>
  );
}

/* ─── Eye icon ────────────────────────────────────────────────────────────── */
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

/* ─── Step progress ────────────────────────────────────────────────────────── */
const StepBar = ({ step }) => (
  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.75rem" }}>
    {[1, 2].map((i) => (
      <div key={i} style={{
        flex: 1, height: 3, borderRadius: "999px",
        background: i <= step ? "linear-gradient(90deg,#6ee7f7,#a78bfa)" : "rgba(255,255,255,0.07)",
        transition: "background 0.4s",
      }} />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function RegisterForm() {
  const { register, authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: "", userName: "", email: "", password: "", confirm: "", avatar: null });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors]   = useState({});
  const [focused, setFocused] = useState({});
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);
  const [touched, setTouched] = useState({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const strength = getStrength(form.password);

  const validate = (d, s) => {
    const e = {};
    if (s === 1 || s === "all") {
      if (!d.fullName.trim())           e.fullName = "Full name is required";
      else if (d.fullName.trim().length < 2) e.fullName = "Too short";
      if (!d.userName.trim())           e.userName = "Username is required";
      else if (!/^[a-zA-Z0-9_]{3,20}$/.test(d.userName)) e.userName = "3–20 chars: letters, numbers, underscores";
      if (!d.email.trim())              e.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(d.email)) e.email = "Invalid email address";
    }
    if (s === 2 || s === "all") {
      if (!d.password)                  e.password = "Password is required";
      else if (d.password.length < 6)   e.password = "Minimum 6 characters";
      if (!d.confirm)                   e.confirm = "Please confirm your password";
      else if (d.confirm !== d.password) e.confirm = "Passwords don't match";
      if (!d.avatar)                    e.avatar = "Profile photo is required";
    }
    return e;
  };

  const set = (k) => (ev) => {
    const val = ev.target.value;
    setForm((p) => ({ ...p, [k]: val }));
    if (touched[k]) setErrors((p) => ({ ...p, [k]: validate({ ...form, [k]: val }, step)[k] }));
  };
  const blur = (k) => () => {
    setTouched((p) => ({ ...p, [k]: true }));
    setFocused((p) => ({ ...p, [k]: false }));
    setErrors((p) => ({ ...p, [k]: validate(form, step)[k] }));
  };
  const setAvatar = (file) => {
    setForm((p) => ({ ...p, avatar: file }));
    setAvatarPreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, avatar: undefined }));
  };

  const next = (e) => {
    e.preventDefault();
    setTouched({ fullName: true, userName: true, email: true });
    const errs = validate(form, 1);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true, avatar: true });
    const errs = validate(form, 2);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const r = await register({ fullName: form.fullName, userName: form.userName, email: form.email, password: form.password, avatar: form.avatar });
    if (r.success) navigate("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#06060f", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes ping{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 1000px #0c0c1a inset!important;
          -webkit-text-fill-color:#f1f5f9!important;caret-color:#f1f5f9;
        }
        @media(max-width:768px){.rp-left{display:none!important;}}
      `}</style>

      {/* ── Left: visual panel ── */}
      <div className="rp-left" style={{
        flex: "0 0 46%", position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at 40% 50%, rgba(110,231,247,0.05) 0%, transparent 70%), radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.05) 0%, transparent 60%)",
      }}>
        <RingCanvas />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(6,6,15,0.8) 100%)" }} />

        {/* logo top */}
        <div style={{ position: "absolute", top: "2rem", left: "2.5rem", display: "flex", alignItems: "center", gap: "0.6rem", zIndex: 2 }}>
          <div style={{ width: 34, height: 34, borderRadius: "0.55rem", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#06060f" }}>P</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#f1f5f9", letterSpacing: "-0.02em" }}>PeerNexus</span>
        </div>

        {/* center text */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌐</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,2.5vw,2rem)", color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "0.75rem" }}>
            Join the network
          </h2>
          <p style={{ color: "#475569", fontSize: "0.82rem", lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
            Connect with peers directly. Share files instantly. No middlemen, no cloud storage — just pure P2P.
          </p>

          {/* stat pills */}
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginTop: "1.75rem", flexWrap: "wrap" }}>
            {[["50K+","Users"],["2ms","Latency"],["100%","P2P"]].map(([val, lbl]) => (
              <div key={lbl} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.6rem", padding: "0.6rem 0.9rem", textAlign: "center", backdropFilter: "blur(6px)" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1rem", color: "#6ee7f7" }}>{val}</div>
                <div style={{ color: "#334155", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</div>
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
        overflowY: "auto",
      }}>
        <div style={{
          width: "100%", maxWidth: 410,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(22px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          padding: "1rem 0",
        }}>
          {/* badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: "999px", padding: "0.22rem 0.7rem", marginBottom: "1rem", fontSize: "0.68rem", color: "#a78bfa", letterSpacing: "0.08em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", animation: "ping 2s ease-in-out infinite" }} />
            CREATE ACCOUNT
          </div>

          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.85rem", color: "#f8fafc", letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>
            {step === 1 ? "Who are you?" : "Secure it."}
          </h1>
          <p style={{ color: "#475569", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
            {step === 1 ? "Step 1 of 2 — Your identity" : "Step 2 of 2 — Password & photo"}
          </p>

          <StepBar step={step} />

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={next} noValidate style={{ animation: "slideIn 0.3s ease" }}>
              {/* Full name */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ color: errors.fullName ? "#f87171" : "#6ee7f7" }}>✦</span> Full name
                </label>
                <input type="text" placeholder="Alex Johnson" value={form.fullName}
                  onChange={set("fullName")} onFocus={() => setFocused((p) => ({ ...p, fullName: true }))} onBlur={blur("fullName")}
                  style={iStyle(errors.fullName, focused.fullName)} autoComplete="name" autoFocus />
                {errors.fullName && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.fullName}</p>}
              </div>

              {/* Username */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ color: errors.userName ? "#f87171" : "#6ee7f7" }}>⬡</span> Username
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#2d3748", fontSize: "0.9rem", pointerEvents: "none" }}>@</span>
                  <input type="text" placeholder="alexj" value={form.userName}
                    onChange={set("userName")} onFocus={() => setFocused((p) => ({ ...p, userName: true }))} onBlur={blur("userName")}
                    style={{ ...iStyle(errors.userName, focused.userName), paddingLeft: "1.8rem" }}
                    autoComplete="username" spellCheck={false} />
                </div>
                {errors.userName && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.userName}</p>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ color: errors.email ? "#f87171" : "#6ee7f7" }}>◈</span> Email
                </label>
                <input type="email" placeholder="you@example.com" value={form.email}
                  onChange={set("email")} onFocus={() => setFocused((p) => ({ ...p, email: true }))} onBlur={blur("email")}
                  style={iStyle(errors.email, focused.email)} autoComplete="email" />
                {errors.email && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.email}</p>}
              </div>

              <button type="submit" style={{
                width: "100%", padding: "0.85rem", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                border: "none", borderRadius: "0.7rem", color: "#06060f",
                fontWeight: 700, fontSize: "0.92rem", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
                transition: "opacity 0.2s, transform 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.87"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "none"; }}
              >Continue →</button>
            </form>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={submit} noValidate style={{ animation: "slideIn 0.3s ease" }}>
              {/* Password */}
              <div style={{ marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ color: errors.password ? "#f87171" : "#6ee7f7" }}>⬡</span> Password
                </label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder="••••••••" value={form.password}
                    onChange={set("password")} onFocus={() => setFocused((p) => ({ ...p, password: true }))} onBlur={blur("password")}
                    style={iStyle(errors.password, focused.password)} autoComplete="new-password" autoFocus />
                  <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                    style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568", display: "flex", padding: 0 }}>
                    <Eye open={showPw} />
                  </button>
                </div>
                {errors.password && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.password}</p>}
              </div>

              {/* Strength */}
              {form.password.length > 0 && (
                <div style={{ marginBottom: "1.1rem" }}>
                  <div style={{ display: "flex", gap: 3, marginTop: "0.5rem" }}>
                    {[1,2,3,4].map((i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: "999px", background: i <= strength.score ? strength.color : "rgba(255,255,255,0.06)", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <p style={{ color: strength.color, fontSize: "0.7rem", marginTop: "0.28rem", transition: "color 0.3s" }}>{strength.label}</p>
                </div>
              )}

              {/* Confirm */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.42rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ color: errors.confirm ? "#f87171" : "#6ee7f7" }}>✦</span> Confirm password
                </label>
                <div style={{ position: "relative" }}>
                  <input type={showCf ? "text" : "password"} placeholder="••••••••" value={form.confirm}
                    onChange={set("confirm")} onFocus={() => setFocused((p) => ({ ...p, confirm: true }))} onBlur={blur("confirm")}
                    style={iStyle(errors.confirm, focused.confirm)} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowCf((v) => !v)} tabIndex={-1}
                    style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4a5568", display: "flex", padding: 0 }}>
                    <Eye open={showCf} />
                  </button>
                </div>
                {form.confirm.length > 0 && (
                  <p style={{ fontSize: "0.7rem", marginTop: "0.28rem", color: form.confirm === form.password ? "#4ade80" : "#f87171" }}>
                    {form.confirm === form.password ? "✓ Passwords match" : "✗ Passwords don't match"}
                  </p>
                )}
                {errors.confirm && form.confirm.length === 0 && <p style={{ color: "#f87171", fontSize: "0.72rem", marginTop: "0.28rem" }}>✕ {errors.confirm}</p>}
              </div>

              {/* Avatar */}
              <AvatarPicker value={form.avatar} preview={avatarPreview} onChange={setAvatar} error={errors.avatar} />

              {/* Terms */}
              <p style={{ color: "#2d3748", fontSize: "0.73rem", lineHeight: 1.6, marginBottom: "1.4rem" }}>
                By creating an account you agree to our{" "}
                <Link to="/terms" style={{ color: "#6ee7f7", textDecoration: "none" }}>Terms</Link> and{" "}
                <Link to="/privacy" style={{ color: "#6ee7f7", textDecoration: "none" }}>Privacy Policy</Link>.
              </p>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button type="button" onClick={() => setStep(1)} disabled={authLoading}
                  style={{ flex: "0 0 auto", padding: "0.85rem 1rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.7rem", color: "#4a5568", fontSize: "0.9rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >← Back</button>

                <button type="submit" disabled={authLoading} style={{
                  flex: 1, padding: "0.85rem",
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
                    ? <><span style={{ width: 14, height: 14, border: "2.5px solid rgba(6,6,15,0.25)", borderTopColor: "#06060f", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />Creating…</>
                    : <>Create Account →</>}
                </button>
              </div>
            </form>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.6rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ color: "#1e293b", fontSize: "0.7rem", letterSpacing: "0.06em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          <p style={{ textAlign: "center", color: "#475569", fontSize: "0.85rem" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#6ee7f7", fontWeight: 600, textDecoration: "none" }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}