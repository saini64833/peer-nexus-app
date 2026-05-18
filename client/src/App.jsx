import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Navbar from "./components/Navbar";
import Loader from "./components/Loader";

// ── Lazy pages ──────────────────────────────────────────────────────────────
const Home            = lazy(() => import("./pages/Home"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const WhatsAppClone   = lazy(() => import("./pages/WhatsAppClone"));
const OmegleCloneRoom = lazy(() => import("./pages/OmegleCloneRoom"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const LoginForm       = lazy(() => import("./features/auth/LoginForm"));
const RegisterForm    = lazy(() => import("./features/auth/RegisterForm"));
const Files = lazy(() => import("./pages/FileDrop"));
// ── Route guards ─────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader type="route" message="Checking session…" />;
  return user ? children : <Navigate to="/login" replace />;
};

const PremiumRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader type="route" message="Verifying access…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isPremium) return <Navigate to="/pricing" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader type="route" message="Loading…" />;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// ── Page fallback ─────────────────────────────────────────────────────────────
const PageFallback = () => <Loader type="route" message="Loading page…" />;

// ── Layout wrapper (Navbar + content) ────────────────────────────────────────
const Layout = ({ children, hideNav = false }) => (
  <>
    {!hideNav && <Navbar />}
    <main>{children}</main>
  </>
);

// ── Toast config ──────────────────────────────────────────────────────────────
const toastOptions = {
  duration: 3500,
  style: {
    background: "#111118",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontFamily: "'DM Sans', sans-serif",
    padding: "0.75rem 1rem",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  success: {
    iconTheme: { primary: "#6ee7f7", secondary: "#0a0a0f" },
  },
  error: {
    iconTheme: { primary: "#f87171", secondary: "#0a0a0f" },
  },
  loading: {
    iconTheme: { primary: "#a78bfa", secondary: "#0a0a0f" },
  },
};

// ── App routes ────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={
          <Layout>
            <Home />
          </Layout>
        } />

        <Route path="/pricing" element={
          <Layout>
            <Pricing />
          </Layout>
        } />

        {/* Auth — redirect if already logged in */}
        <Route path="/login" element={
          <GuestRoute>
            <Layout hideNav>
              <LoginForm />
            </Layout>
          </GuestRoute>
        } />

        <Route path="/register" element={
          <GuestRoute>
            <Layout hideNav>
              <RegisterForm />
            </Layout>
          </GuestRoute>
        } />

        {/* Protected */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/messages" element={
          <PrivateRoute>
            <Layout>
              <WhatsAppClone />
            </Layout>
          </PrivateRoute>
        } />
      <Route
        path="/files"
        element={
          <PrivateRoute>
          <Layout>
          <Files />
            </Layout>
          </PrivateRoute>
        }
      />
        {/* Premium only */}
        <Route path="/matchmaking" element={
          <PremiumRoute>
            <Layout>
              <OmegleCloneRoom />
            </Layout>
          </PremiumRoute>
        } />

        {/* 404 fallback */}
        <Route path="*" element={
          <Layout>
            <div style={{
              minHeight: "80vh", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "1rem",
              fontFamily: "'DM Sans', sans-serif", background: "#0a0a0f",
              color: "#475569", textAlign: "center", padding: "2rem",
            }}>
              <span style={{ fontSize: "4rem", fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 900, color: "#1e293b" }}>404</span>
              <p style={{ fontSize: "1rem", color: "#475569" }}>Page not found.</p>
              <a href="/" style={{ color: "#6ee7f7", fontSize: "0.875rem", textDecoration: "none" }}>← Back to Home</a>
            </div>
          </Layout>
        } />
      </Routes>
    </Suspense>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={toastOptions}
            containerStyle={{ top: 72 }} // below fixed navbar
          />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}