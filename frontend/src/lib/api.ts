const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API error");
  }
  return res.json();
}

export const api = {
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

  // Monitor
  getMonitorStatus: () => fetchApi("/api/monitor/status"),

  startMonitor: () =>
    fetchApi("/api/monitor/start", { method: "POST" }),

  stopMonitor: () =>
    fetchApi("/api/monitor/stop", { method: "POST" }),

  getActivityLog: (limit = 50) =>
    fetchApi(`/api/monitor/activity-log?limit=${limit}`),
};
