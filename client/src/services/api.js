  import axios from "axios";

  /**
   * Central axios instance for all PeerNexus API calls.
   *
   * - Sends cookies on every request (withCredentials)
   * - On 401, automatically attempts a silent token refresh
   * - If refresh also fails, clears the session and redirects to /login
   */
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
  // ── Main axios instance ───────────────────────────────────────────────────────
  const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,          // send httpOnly cookies automatically
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
  });

  // ── Refresh-token axios instance (no interceptors to avoid infinite loop) ─────
  const refreshApi = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10_000,
  });

  // ── Track whether a refresh is already in flight ──────────────────────────────
  let isRefreshing = false;
  let pendingQueue = []; // requests waiting on the refresh

  const processPending = (error) => {
    pendingQueue.forEach(({ resolve, reject }) =>
      error ? reject(error) : resolve()
    );
    pendingQueue = [];
  };

  // ── Response interceptor ──────────────────────────────────────────────────────
 api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url === "/auth/refresh"
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => api(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await refreshApi.get("/auth/refresh");

      processPending(null);

      return api(original);
    } catch (refreshError) {
      processPending(refreshError);

      window.dispatchEvent(new CustomEvent("auth:logout"));

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
  // ── Auth endpoints ────────────────────────────────────────────────────────────
  export const authApi = {
    /**
     * Register a new user.
     * Uses FormData because the server expects multipart (avatar upload).
     * @param {{ fullName, userName, email, password, avatar: File }} data
     */
    register: (data) => {
      const form = new FormData();
      form.append("fullName", data.fullName);
      form.append("userName", data.userName);
      form.append("email", data.email);
      form.append("password", data.password);
      if (data.avatar) form.append("avatar", data.avatar);

      return api.post("/auth/register", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },

    /**
     * Login with email/userName + password.
     * Server sets httpOnly cookies on success.
     */
    login: (credentials) => api.post("/auth/login", credentials),

    /** Logout — clears server-side refresh token + cookies. */
    logout: () => api.post("/auth/logout"),

    /** Silently refresh the access token using the refresh-token cookie. */
    refresh: () => refreshApi.get("/auth/refresh"),

    /** Fetch the currently authenticated user's profile. */
    getMe: () => api.get("/auth/me"),

    /** Update profile fields (fullName, userName, etc.) */
    updateProfile: (data) => api.patch("/auth/me", data),

    /** Change password. */
    changePassword: (data) => api.patch("/auth/change-password", data),
  };

  // ── Chat / messaging endpoints ────────────────────────────────────────────────
export const chatApi = {
  /** Get all conversations for the current user. */
  getConversations: () => api.get("/chat/conversations"),

  /** Get or create a conversation with a specific user. */
  getOrCreateConversation: (userId) =>
    api.post("/chat/conversations", { participantId: userId }),

  /** Get messages for a conversation. Supports pagination via `page`. */
  getMessages: (conversationId, page = 1) =>
    api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit: 30 },
    }),

  /** Send a text message. */
  sendMessage: (conversationId, content) =>
    api.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    }),

  /** Send image message */
  sendImageMessage: (conversationId, formData) =>
    api.post(
      `/chat/conversations/${conversationId}/messages/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    ),

  /** Send file metadata for WebRTC transfer */
  sendFileMetadata: (conversationId, data) =>
    api.post(
      `/chat/conversations/${conversationId}/messages/file`,
      data
    ),

  /** Search users */
  searchUsers: (query) =>
    api.get("/chat/users/search", {
      params: { q: query },
    }),
};

  // ── Payment / billing endpoints ───────────────────────────────────────────────
  export const paymentApi = {
    /** Create a Stripe Checkout session and return the URL. */
    createCheckoutSession: (priceId) =>
      api.post("/payment/checkout", { priceId }),

    /** Get the current user's subscription status. */
    getSubscription: () => api.get("/payment/subscription"),

    /** Open Stripe billing portal for the current user. */
    getBillingPortal: () => api.post("/payment/portal"),
  };

  export default api;