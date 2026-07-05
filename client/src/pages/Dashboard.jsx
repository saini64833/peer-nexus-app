import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { chatApi } from "../services/api";
import toast from "react-hot-toast";
/* ─── tiny hook: animated counter ─────────────────────────────────────────── */
function useCount(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ─── Pulse ring around avatar ─────────────────────────────────────────────── */
function PulseRing({ color = "#6ee7f7", size = 80 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {[1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute", inset: -i * 6,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          opacity: 0,
          animation: `pulse-ring ${1.6 + i * 0.5}s ease-out ${i * 0.4}s infinite`,
        }} />
      ))}
      <style>{`@keyframes pulse-ring{0%{transform:scale(1);opacity:.45}100%{transform:scale(1.35);opacity:0}}`}</style>
    </div>
  );
}

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, sub }) {
  const display = useCount(typeof value === "number" ? value : 0);
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hov ? color + "44" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "1rem", padding: "1.35rem 1.25rem",
        cursor: "default", transition: "all 0.25s",
        boxShadow: hov ? `0 0 24px ${color}18` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
        <span style={{ fontSize: "1.25rem" }}>{icon}</span>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.7rem", color: "#f1f5f9", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {typeof value === "number" ? display : value}
      </div>
      <div style={{ color: "#475569", fontSize: "0.78rem", marginTop: "0.3rem", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ color: color, fontSize: "0.7rem", marginTop: "0.4rem", letterSpacing: "0.03em" }}>{sub}</div>}
    </div>
  );
}

/* ─── Feature card ─────────────────────────────────────────────────────────── */
function FeatureCard({ to, icon, title, desc, color, badge, locked }) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onClick={() => !locked && navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !locked ? `linear-gradient(135deg, ${color}0d, rgba(255,255,255,0.02))` : "rgba(255,255,255,0.025)",
        border: `1px solid ${hov && !locked ? color + "44" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "1.1rem", padding: "1.5rem 1.25rem",
        cursor: locked ? "default" : "pointer",
        transition: "all 0.25s",
        transform: hov && !locked ? "translateY(-3px)" : "none",
        boxShadow: hov && !locked ? `0 8px 32px ${color}18` : "none",
        position: "relative", overflow: "hidden",
        opacity: locked ? 0.5 : 1,
      }}
    >
      {badge && (
        <span style={{
          position: "absolute", top: "1rem", right: "1rem",
          background: `${color}22`, color, border: `1px solid ${color}44`,
          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
          padding: "0.15rem 0.5rem", borderRadius: "999px", textTransform: "uppercase",
        }}>{badge}</span>
      )}
      {locked && (
        <span style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "0.9rem" }}>🔒</span>
      )}
      <div style={{
        width: 44, height: 44, borderRadius: "0.7rem",
        background: `${color}18`, border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.3rem", marginBottom: "1rem",
        transition: "transform 0.25s",
        transform: hov && !locked ? "scale(1.1) rotate(-4deg)" : "none",
      }}>{icon}</div>
      <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.4rem", fontFamily: "'Syne', sans-serif" }}>{title}</h3>
      <p style={{ color: "#475569", fontSize: "0.8rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
      {!locked && (
        <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.3rem", color, fontSize: "0.78rem", fontWeight: 600 }}>
          Open <span style={{ transition: "transform 0.2s", transform: hov ? "translateX(3px)" : "none", display: "inline-block" }}>→</span>
        </div>
      )}
    </div>
  );
}

/* ─── Contact row ──────────────────────────────────────────────────────────── */
function ContactRow({ contact, isOnline, onClick }) {
  const [hov, setHov] = useState(false);
  const initials = contact.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.65rem 0.75rem", borderRadius: "0.65rem",
        background: hov ? "rgba(255,255,255,0.05)" : "transparent",
        cursor: "pointer", transition: "background 0.2s",
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {contact.avatar
          ? <img src={contact.avatar} alt={contact.fullName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.08)" }} />
          : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#06060f" }}>{initials}</div>
        }
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 9, height: 9, borderRadius: "50%",
          background: isOnline ? "#4ade80" : "#334155",
          border: "1.5px solid #09091a",
          boxShadow: isOnline ? "0 0 5px #4ade80" : "none",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.fullName}</div>
        <div style={{ color: isOnline ? "#4ade80" : "#334155", fontSize: "0.7rem" }}>
          {isOnline ? "● Online" : "○ Offline"}
        </div>
      </div>
      <div style={{ color: "#334155", fontSize: "0.75rem", opacity: hov ? 1 : 0, transition: "opacity 0.2s" }}>💬</div>
    </div>
  );
}

/* ─── Activity item ────────────────────────────────────────────────────────── */
function ActivityItem({ icon, text, time, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ width: 32, height: 32, borderRadius: "0.5rem", background: `${color}18`, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5, margin: 0 }}>{text}</p>
        <span style={{ color: "#334155", fontSize: "0.7rem" }}>{time}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, isPremium } = useAuth();
  const { onlineUsers, isConnected } = useSocket();
  const navigate = useNavigate();

  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQ, setSearchQ]     = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  /* load recent conversations to get contacts */
  useEffect(() => {
    chatApi.getConversations()
      .then(({ data }) => {
        const participants = (data.data || []).map((conv) => {
          const other = conv.participants?.find((p) => p._id !== user?._id);
          return other || null;
        }).filter(Boolean);
        setContacts(participants.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  /* debounced user search */
  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); return; }
    clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      chatApi.searchUsers(searchQ)
        .then(({ data }) => setSearchRes(data.data?.slice(0, 6) || []))
        .catch(() => setSearchRes([]))
        .finally(() => setSearching(false));
    }, 380);
    return () => clearTimeout(searchTimer.current);
  }, [searchQ]);

  const onlineCount  = onlineUsers.length;
  const contactCount = contacts.length;
  const greeting     = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const initials = user?.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const recentActivity = [
    { icon: "📁", text: "P2P file transfer session", time: "2 min ago", color: "#6ee7f7" },
    { icon: "💬", text: "New message from a contact", time: "18 min ago", color: "#a78bfa" },
    { icon: "🔗", text: "WebRTC connection established", time: "1 hr ago", color: "#34d399" },
    { icon: "📹", text: "Video matchmaking session ended", time: "3 hrs ago", color: "#f472b6" },
    { icon: "✦",  text: "Account status updated", time: "Yesterday", color: "#facc15" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#06060f",
      fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::selection{background:rgba(110,231,247,0.2);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
      `}</style>

      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem",
        opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* ── Top: greeting + status bar ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <p style={{ color: "#334155", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{greeting}</p>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3vw,2.2rem)", color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              {user?.fullName?.split(" ")[0] ?? "Peer"} <span style={{ background: "linear-gradient(90deg,#6ee7f7,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>↗</span>
            </h1>
          </div>

          {/* Status indicators */}
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "999px", padding: "0.35rem 0.8rem", fontSize: "0.75rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isConnected ? "#4ade80" : "#f87171", boxShadow: isConnected ? "0 0 5px #4ade80" : "none", display: "inline-block" }} />
              <span style={{ color: isConnected ? "#4ade80" : "#f87171" }}>{isConnected ? "Connected" : "Offline"}</span>
            </div>
            {isPremium && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "linear-gradient(135deg,rgba(110,231,247,0.12),rgba(167,139,250,0.12))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "999px", padding: "0.35rem 0.8rem", fontSize: "0.72rem", color: "#a78bfa", fontWeight: 600, letterSpacing: "0.04em" }}>
                ✦ PRO
              </div>
            )}
            <Link to="/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "0.55rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#475569", textDecoration: "none", fontSize: "0.9rem", transition: "background 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#475569"; }}
            >⚙</Link>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }} className="dash-grid">

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Profile hero card */}
            <div style={{
              background: "linear-gradient(135deg, rgba(110,231,247,0.07) 0%, rgba(167,139,250,0.06) 50%, rgba(244,114,182,0.04) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1.25rem", padding: "1.75rem",
              position: "relative", overflow: "hidden",
            }}>
              {/* bg glow */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(110,231,247,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                {/* Avatar with pulse */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <PulseRing color="#6ee7f7" size={72} />
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: 72, height: 72, borderRadius: "50%",
                  }}>
                    {user?.avatar
                      ? <img src={user.avatar} alt={user.fullName} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(110,231,247,0.4)" }} />
                      : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#06060f", border: "2px solid rgba(110,231,247,0.4)" }}>{initials}</div>
                    }
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.25rem", color: "#f8fafc", letterSpacing: "-0.02em" }}>{user?.fullName}</h2>
                    {isPremium && <span style={{ background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", color: "#06060f", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", letterSpacing: "0.08em", textTransform: "uppercase" }}>PRO</span>}
                  </div>
                  <p style={{ color: "#475569", fontSize: "0.82rem", marginTop: "0.15rem" }}>@{user?.userName}</p>
                  <p style={{ color: "#334155", fontSize: "0.78rem" }}>{user?.email}</p>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
                  <Link to="/settings" style={{
                    padding: "0.55rem 1.1rem", borderRadius: "0.6rem",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#94a3b8", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500,
                    transition: "background 0.2s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  >Edit Profile</Link>
                  {!isPremium && (
                    <Link to="/pricing" style={{
                      padding: "0.55rem 1.1rem", borderRadius: "0.6rem",
                      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                      color: "#06060f", fontSize: "0.8rem", textDecoration: "none", fontWeight: 700,
                      letterSpacing: "0.01em",
                    }}>Upgrade →</Link>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.9rem" }} className="stats-grid">
              <StatCard icon="🟢" label="Online Now"   value={onlineCount}  color="#4ade80" sub="peers active" />
              <StatCard icon="👥" label="Contacts"     value={contactCount} color="#6ee7f7" sub="in network" />
              <StatCard icon="📁" label="Files Shared" value={0}            color="#a78bfa" sub="this session" />
              <StatCard icon="✦"  label="Plan"         value={isPremium ? "Pro" : "Free"} color={isPremium ? "#6ee7f7" : "#475569"} />
            </div>

            {/* Feature cards */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#f1f5f9" }}>Workspace</h3>
                <span style={{ color: "#334155", fontSize: "0.75rem" }}>3 modules</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.9rem" }} className="feature-grid">
                <FeatureCard
                  to="/messages" icon="💬" color="#a78bfa"
                  title="Messages"
                  desc="Real-time encrypted chat with Socket.io persistent history."
                />
                <FeatureCard
                  to="/files" icon="📁" color="#6ee7f7"
                  title="File Drop"
                  desc="Zero-server WebRTC direct peer file transfers."
                />
                <FeatureCard
                  to="/matchmaking" icon="📹" color="#f472b6"
                  title="Go Live" badge="PRO"
                  desc="WebRTC video matchmaking with random peers."
                  locked={!isPremium}
                />
              </div>
            </div>

            {/* User search */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#f1f5f9", marginBottom: "0.9rem" }}>Find Peers</h3>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#334155", fontSize: "0.85rem", pointerEvents: "none" }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search by username or email…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.65rem",
                    padding: "0.7rem 0.9rem 0.7rem 2.1rem",
                    color: "#f1f5f9", fontSize: "0.85rem", outline: "none",
                    fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                  }}
                />
                {searching && (
                  <div style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#6ee7f7", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                )}
              </div>

              {searchRes.length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  {searchRes.map((u) => (
                    <ContactRow
                      key={u._id}
                      contact={u}
                      isOnline={onlineUsers.includes(u._id)}
                      onClick={async () => {
                        try {
                         await chatApi.getOrCreateConversation(u._id);
                         navigate("/messages");
                       }catch {
                         toast.error("Could not open conversation");
                       }
                      }}
                    />
                  ))}
                </div>
              )}
              {searchQ.trim() && !searching && searchRes.length === 0 && (
                <p style={{ color: "#334155", fontSize: "0.8rem", textAlign: "center", marginTop: "1rem" }}>No peers found for "{searchQ}"</p>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Online contacts */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#f1f5f9" }}>Contacts</h3>
                <Link to="/messages" style={{ color: "#6ee7f7", fontSize: "0.72rem", textDecoration: "none", fontWeight: 500 }}>See all →</Link>
              </div>

              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#6ee7f7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : contacts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {contacts.slice(0, 8).map((c) => (
                    <ContactRow
                      key={c._id}
                      contact={c}
                      isOnline={onlineUsers.includes(c._id)}
                      onClick={() => navigate("/messages")}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>🌐</div>
                  <p style={{ color: "#334155", fontSize: "0.78rem", lineHeight: 1.5 }}>
                    No contacts yet.<br />Search for peers above.
                  </p>
                </div>
              )}
            </div>

            {/* Upgrade banner (free users only) */}
            {!isPremium && (
              <div style={{
                background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(244,114,182,0.08))",
                border: "1px solid rgba(167,139,250,0.22)",
                borderRadius: "1.1rem", padding: "1.25rem",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>📹</div>
                <h4 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", marginBottom: "0.4rem" }}>Unlock Video Matchmaking</h4>
                <p style={{ color: "#475569", fontSize: "0.75rem", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Go live with random peers worldwide. Upgrade to Pro.
                </p>
                <Link to="/pricing" style={{
                  display: "block", padding: "0.65rem",
                  background: "linear-gradient(135deg,#a78bfa,#f472b6)",
                  color: "#06060f", borderRadius: "0.65rem",
                  textDecoration: "none", fontWeight: 700, fontSize: "0.82rem",
                  letterSpacing: "0.01em",
                }}>View Plans →</Link>
              </div>
            )}

            {/* Recent activity */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.1rem" }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#f1f5f9", marginBottom: "0.75rem" }}>Recent Activity</h3>
              <div>
                {recentActivity.map((a, i) => (
                  <ActivityItem key={i} {...a} />
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.1rem", padding: "1.1rem" }}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.88rem", color: "#f1f5f9", marginBottom: "0.75rem" }}>Quick Links</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {[
                  { to: "/messages",    icon: "💬", label: "Open Messages" },
                  { to: "/pricing",     icon: "✦",  label: "View Plans"    },
                  { to: "/settings",    icon: "⚙",  label: "Settings"      },
                  { to: "/",            icon: "🏠",  label: "Home"          },
                ].map(({ to, icon, label }) => (
                  <Link key={to} to={to} style={{
                    display: "flex", alignItems: "center", gap: "0.65rem",
                    padding: "0.55rem 0.5rem", borderRadius: "0.55rem",
                    color: "#64748b", fontSize: "0.82rem", textDecoration: "none",
                    transition: "background 0.15s, color 0.15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#e2e8f0"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
                  >
                    <span style={{ fontSize: "0.85rem", width: 20, textAlign: "center" }}>{icon}</span>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media(max-width:1024px){
          .dash-grid{grid-template-columns:1fr!important;}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
        }
        @media(max-width:640px){
          .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
          .feature-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  );
}