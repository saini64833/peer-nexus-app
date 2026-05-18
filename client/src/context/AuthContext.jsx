import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import toast from "react-hot-toast";
import { authApi } from "../services/api.js";

// ── State shape ───────────────────────────────────────────────────────────────
// {
//   user: null | { _id, fullName, userName, email, avatar, isPremium, status }
//   loading: boolean   — true during the initial session check
//   authLoading: false  — true only during login / register / logout actions
// }

const initialState = {
  user: null,
  loading: true,       // checking existing session on mount
  authLoading: false,  // in-flight login/register/logout
};

// ── Reducer ───────────────────────────────────────────────────────────────────
const AUTH = {
  SET_USER:        "SET_USER",
  CLEAR_USER:      "CLEAR_USER",
  SET_LOADING:     "SET_LOADING",
  SET_AUTH_LOADING:"SET_AUTH_LOADING",
};

function reducer(state, action) {
  switch (action.type) {
    case AUTH.SET_USER:
      return { ...state, user: action.payload, loading: false, authLoading: false };
    case AUTH.CLEAR_USER:
      return { ...state, user: null, loading: false, authLoading: false };
    case AUTH.SET_LOADING:
      return { ...state, loading: action.payload };
    case AUTH.SET_AUTH_LOADING:
      return { ...state, authLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const { data } = await authApi.getMe();
        if (!cancelled) {
          dispatch({ type: AUTH.SET_USER, payload: data.data });
        }
      } catch {
        // No valid session — that's fine, stay logged out
        if (!cancelled) dispatch({ type: AUTH.CLEAR_USER });
      }
    };

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // ── Listen for forced logout (triggered by api.js on failed refresh) ────────
  useEffect(() => {
    const handler = () => dispatch({ type: AUTH.CLEAR_USER });
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  // ── Register ────────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    dispatch({ type: AUTH.SET_AUTH_LOADING, payload: true });
    const toastId = toast.loading("Creating your account…");
    try {
      const { data } = await authApi.register(formData);
      dispatch({ type: AUTH.SET_USER, payload: data.data });
      toast.success("Welcome to PeerNexus! 🎉", { id: toastId });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message, { id: toastId });
      dispatch({ type: AUTH.SET_AUTH_LOADING, payload: false });
      return { success: false, message };
    }
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    dispatch({ type: AUTH.SET_AUTH_LOADING, payload: true });
    const toastId = toast.loading("Signing you in…");
    try {
      await authApi.login(credentials);
      const { data } = await authApi.getMe();
      dispatch({ type: AUTH.SET_USER, payload: data.data });
      toast.success(`Welcome back, ${data.data.fullName.split(" ")[0]}!`, { id: toastId });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(message, { id: toastId });
      dispatch({ type: AUTH.SET_AUTH_LOADING, payload: false });
      return { success: false, message };
    }
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    dispatch({ type: AUTH.SET_AUTH_LOADING, payload: true });
    try {
      await authApi.logout();
    } catch {
      // Even if the server call fails, clear client state
    } finally {
      dispatch({ type: AUTH.CLEAR_USER });
    }
  }, []);

  // ── Update user in context (after profile edit etc.) ───────────────────────
  const updateUser = useCallback((updatedFields) => {
    dispatch({
      type: AUTH.SET_USER,
      payload: { ...state.user, ...updatedFields },
    });
  }, [state.user]);

  // ── Refresh user from server ────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.getMe();
      dispatch({ type: AUTH.SET_USER, payload: data.data });
    } catch {
      // silently fail
    }
  }, []);

  const value = {
    user:        state.user,
    loading:     state.loading,
    authLoading: state.authLoading,
    isAuthenticated: !!state.user,
    isPremium:   !!state.user?.isPremium,
    register,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export default AuthContext;