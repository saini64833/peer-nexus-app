import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const NAV_LINKS = {
  guest: [
    { to: "/login", label: "Login" },
  ],
  shared: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/messages", label: "Messages" },
  ],
  premium: [
    { to: "/matchmaking", label: "Go Live" , badge: "PRO" },
  ],
};

const Logo = () => (
  <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
    <div style={{
      width: 30, height: 30, borderRadius: "0.45rem",
      background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Cabinet Grotesk', 'DM Sans', sans-serif",
      fontWeight: 900, fontSize: "1rem", color: "#0a0a0f",
    }}>P</div>
    <span style={{
      fontFamily: "'Cabinet Grotesk', 'DM Sans', sans-serif",
      fontWeight: 800, fontSize: "1.1rem",
      color: "#f1f5f9", letterSpacing: "-0.02em",
    }}>PeerNexus</span>
  </Link>
);

const NavItem = ({ to, label, badge, active, onClick }) => (
  <Link to={to} onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: "0.4rem",
    color: active ? "#f1f5f9" : "#64748b",
    fontSize: "0.875rem", fontWeight: active ? 500 : 400,
    textDecoration: "none",
    padding: "0.4rem 0.75rem",
    borderRadius: "0.5rem",
    background: active ? "rgba(255,255,255,0.06)" : "transparent",
    border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
    transition: "color 0.2s, background 0.2s",
    position: "relative",
  }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "transparent"; }}}
  >
    {label}
    {badge && (
      <span style={{
        fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
        background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
        color: "#0a0a0f", padding: "0.1rem 0.4rem",
        borderRadius: "999px", textTransform: "uppercase",
      }}>{badge}</span>
    )}
  </Link>
);

const Avatar = ({ user }) => {
  const initials = user?.fullName
    ? user.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  return user?.avatar
    ? <img src={user.avatar} alt={user.fullName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
    : (
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.7rem", fontWeight: 700, color: "#0a0a0f",
      }}>{initials}</div>
    );
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setDropOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...");
    try {
      await logout();
      toast.success("Logged out successfully", { id: toastId });
      navigate("/");
    } catch {
      toast.error("Logout failed. Try again.", { id: toastId });
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Cabinet+Grotesk:wght@700;800;900&display=swap');
        .nav-mobile-menu {
          animation: slideDown 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-dropdown {
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        fontFamily: "'DM Sans', sans-serif",
        background: scrolled ? "rgba(10,10,15,0.88)" : "rgba(10,10,15,0.4)",
        backdropFilter: "blur(16px)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        transition: "background 0.3s, border-color 0.3s",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          padding: "0 1.5rem",
          height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Logo />

          {/* Desktop links */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }} className="desktop-nav">
            {user && NAV_LINKS.shared.map(l => (
              <NavItem key={l.to} {...l} active={isActive(l.to)} />
            ))}
            {user?.isPremium && NAV_LINKS.premium.map(l => (
              <NavItem key={l.to} {...l} active={isActive(l.to)} />
            ))}
            {!user && (
              <NavItem to="/login" label="Login" active={isActive("/login")} />
            )}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {!user ? (
              <Link to="/register" style={{
                padding: "0.45rem 1.1rem",
                background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                color: "#0a0a0f", borderRadius: "0.6rem",
                fontWeight: 600, fontSize: "0.875rem",
                textDecoration: "none", transition: "opacity 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Get Started</Link>
            ) : (
              /* Avatar dropdown */
              <div ref={dropRef} style={{ position: "relative" }}>
                <button onClick={() => setDropOpen(v => !v)} style={{
                  background: "none", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "999px", cursor: "pointer", padding: "0.15rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
                  onMouseLeave={e => { if (!dropOpen) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                  <Avatar user={user} />
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem", paddingRight: "0.4rem" }}>
                    {dropOpen ? "▲" : "▼"}
                  </span>
                </button>

                {dropOpen && (
                  <div className="nav-dropdown" style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "#111118", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "0.875rem", padding: "0.5rem",
                    minWidth: 200, zIndex: 300,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                  }}>
                    {/* User info */}
                    <div style={{ padding: "0.75rem 0.75rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "0.35rem" }}>
                      <div style={{ color: "#f1f5f9", fontWeight: 500, fontSize: "0.875rem" }}>{user.fullName}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem", marginTop: "0.1rem" }}>{user.email}</div>
                      {user.isPremium && (
                        <span style={{ display: "inline-block", marginTop: "0.4rem", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", color: "#0a0a0f", padding: "0.15rem 0.5rem", borderRadius: "999px", textTransform: "uppercase" }}>Pro</span>
                      )}
                    </div>
                    {[
                      { to: "/dashboard", label: "Dashboard", icon: "⊞" },
                      { to: "/settings", label: "Settings", icon: "⚙" },
                      { to: "/pricing", label: "Upgrade Plan", icon: "✦" },
                    ].map(item => (
                      <Link key={item.to} to={item.to} onClick={() => setDropOpen(false)} style={{
                        display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.55rem 0.75rem", borderRadius: "0.5rem",
                        color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none",
                        transition: "background 0.15s, color 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#f1f5f9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        <span style={{ fontSize: "0.9rem", width: 18, textAlign: "center" }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.35rem", paddingTop: "0.35rem" }}>
                      <button onClick={() => { setDropOpen(false); handleLogout(); }} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.55rem 0.75rem", borderRadius: "0.5rem",
                        color: "#f87171", fontSize: "0.85rem", background: "none",
                        border: "none", cursor: "pointer", textAlign: "left",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: "0.9rem", width: 18, textAlign: "center" }}>⎋</span>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger */}
            <button onClick={() => setMobileOpen(v => !v)} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.5rem", width: 36, height: 36, cursor: "pointer",
              display: "none", alignItems: "center", justifyContent: "center",
              color: "#94a3b8", fontSize: "1.1rem",
            }} className="hamburger" aria-label="Menu">
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="nav-mobile-menu" style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(10,10,15,0.98)",
            padding: "1rem 1.5rem 1.25rem",
            display: "flex", flexDirection: "column", gap: "0.35rem",
          }}>
            {user && (
              <>
                <div style={{ color: "#475569", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.4rem 0.5rem 0.2rem" }}>Navigation</div>
                {NAV_LINKS.shared.map(l => (
                  <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} style={{
                    color: isActive(l.to) ? "#f1f5f9" : "#64748b",
                    padding: "0.65rem 0.75rem", borderRadius: "0.6rem",
                    background: isActive(l.to) ? "rgba(255,255,255,0.05)" : "transparent",
                    textDecoration: "none", fontSize: "0.9rem", fontWeight: isActive(l.to) ? 500 : 400,
                    display: "block",
                  }}>{l.label}</Link>
                ))}
                {user.isPremium && NAV_LINKS.premium.map(l => (
                  <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} style={{
                    color: "#6ee7f7", padding: "0.65rem 0.75rem", borderRadius: "0.6rem",
                    textDecoration: "none", fontSize: "0.9rem", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: "0.5rem",
                  }}>
                    {l.label}
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "linear-gradient(135deg,#6ee7f7,#a78bfa)", color: "#0a0a0f", padding: "0.1rem 0.4rem", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l.badge}</span>
                  </Link>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
                  <button onClick={() => { setMobileOpen(false); handleLogout(); }} style={{
                    width: "100%", padding: "0.7rem", borderRadius: "0.6rem",
                    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                    color: "#f87171", fontWeight: 500, fontSize: "0.9rem", cursor: "pointer",
                  }}>Logout</button>
                </div>
              </>
            )}
            {!user && (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} style={{ color: "#94a3b8", padding: "0.65rem 0.75rem", borderRadius: "0.6rem", textDecoration: "none", fontSize: "0.9rem", display: "block" }}>Login</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} style={{
                  display: "block", textAlign: "center", padding: "0.7rem",
                  background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
                  color: "#0a0a0f", borderRadius: "0.6rem",
                  textDecoration: "none", fontWeight: 600, fontSize: "0.9rem",
                }}>Get Started</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div style={{ height: 60 }} />

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}