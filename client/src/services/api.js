import axios from "axios";

/**
 * Central axios instance for PeerNexus
 * - Sends cookies automatically
 * - Handles silent token refresh
 * - Prevents multiple refresh calls (queue system)
 */

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

// ─────────────────────────────────────────────
// Main API instance
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─────────────────────────────────────────────
// Refresh API instance (no interceptors)
// ─────────────────────────────────────────────
const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// ─────────────────────────────────────────────
// Refresh queue control
// ─────────────────────────────────────────────
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve();
  });
  pendingQueue = [];
};

// ─────────────────────────────────────────────
// Response interceptor
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isRefreshRequest =
      original.url?.includes("/auth/refresh");

    // Ignore non-401 or retry already done or refresh call itself
    if (
      error.response?.status !== 401 ||
      original._retry ||
      isRefreshRequest
    ) {
      return Promise.reject(error);
    }

    // Queue requests while refreshing
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => api.request(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await refreshApi.get("/auth/refresh");

      processQueue(null);

      return api.request(original);
    } catch (refreshError) {
      processQueue(refreshError);

      // cleanup auth state
      api.defaults.headers.common.Authorization = "";

      window.dispatchEvent(new CustomEvent("auth:logout"));

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────
export const authApi = {
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

  login: (credentials) => api.post("/auth/login", credentials),

  logout: () => api.post("/auth/logout"),

  refresh: () => refreshApi.get("/auth/refresh"),

  getMe: () => api.get("/auth/me"),

  updateProfile: (data) => api.patch("/auth/me", data),

  changePassword: (data) => api.patch("/auth/change-password", data),
};

// ─────────────────────────────────────────────
// Chat API
// ─────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get("/chat/conversations"),

  getOrCreateConversation: (userId) =>
    api.post("/chat/conversations", { participantId: userId }),

  getMessages: (conversationId, page = 1) =>
    api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, limit: 30 },
    }),

  sendMessage: (conversationId, content) =>
    api.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    }),

  sendImageMessage: (conversationId, formData) =>
    api.post(
      `/chat/conversations/${conversationId}/messages/image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),

  sendFileMetadata: (conversationId, data) =>
    api.post(`/chat/conversations/${conversationId}/messages/file`, data),

  searchUsers: (query) =>
    api.get("/chat/users/search", { params: { q: query } }),
};

// ─────────────────────────────────────────────
// Payment API
// ─────────────────────────────────────────────
export const paymentApi = {
  createCheckoutSession: (priceId) =>
    api.post("/payment/checkout", { priceId }),

  getSubscription: () => api.get("/payment/subscription"),

  getBillingPortal: () => api.post("/payment/portal"),
};

export default api;