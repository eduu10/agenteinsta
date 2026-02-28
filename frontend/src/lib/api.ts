const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window !== "undefined") return localStorage.getItem("token");
  return null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("token");
}

async function fetchApi(path: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API error");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => fetchApi("/api/auth/me"),

  // Health
  health: () => fetchApi("/api/health"),

  // Agent Chat
  chat: (message: string, sessionId?: string) =>
    fetchApi("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    }),

  // Conversations
  getConversations: (page = 1, limit = 20, eventType?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (eventType) params.set("event_type", eventType);
    return fetchApi(`/api/conversations?${params}`);
  },

  getConversationStats: () => fetchApi("/api/conversations/stats"),

  getConversation: (id: number) => fetchApi(`/api/conversations/${id}`),

  // Settings
  getSettings: () => fetchApi("/api/settings"),

  updateSettings: (data: Record<string, unknown>) =>
    fetchApi("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  testConnection: () =>
    fetchApi("/api/settings/test-connection", { method: "POST" }),

  importSession: (sessionJson: string) =>
    fetchApi("/api/settings/import-session", {
      method: "POST",
      body: JSON.stringify({ session_json: sessionJson }),
    }),

  // Monitor
  getMonitorStatus: () => fetchApi("/api/monitor/status"),

  startMonitor: () =>
    fetchApi("/api/monitor/start", { method: "POST" }),

  stopMonitor: () =>
    fetchApi("/api/monitor/stop", { method: "POST" }),

  getActivityLog: (limit = 50) =>
    fetchApi(`/api/monitor/activity-log?limit=${limit}`),

  // Admin
  adminCreateUser: (email: string, password: string, name: string) =>
    fetchApi("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  getUsers: () => fetchApi("/api/admin/users"),

  getUserActivity: (userId: string, limit = 50) =>
    fetchApi(`/api/admin/users/${userId}/activity?limit=${limit}`),

  getAllMonitors: () => fetchApi("/api/admin/monitors"),

  getGlobalConfig: () => fetchApi("/api/admin/global-config"),

  updateGlobalConfig: (data: Record<string, unknown>) =>
    fetchApi("/api/admin/global-config", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
