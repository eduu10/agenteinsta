"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import type { MonitorStatus, ActivityLogItem } from "@/types";
import { Play, Square, RefreshCw, Activity, Loader2 } from "lucide-react";

export default function MonitorPage() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [s, a] = await Promise.all([
        api.getMonitorStatus(),
        api.getActivityLog(50),
      ]);
      setStatus(s);
      setActivities(a);
    } catch {
      // Backend not available
    }
  }

  async function handleStart() {
    setActionLoading(true);
    try {
      const result = await api.startMonitor();
      if (result.status === "error") {
        alert(result.message);
      }
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    setActionLoading(true);
    try {
      await api.stopMonitor();
      await loadData();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <Header title="Monitor" />
      <div className="p-6 space-y-6">
        {/* Status Card */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  status?.running
                    ? "bg-green-400 animate-pulse"
                    : "bg-gray-500"
                }`}
              />
              <h3 className="text-lg font-semibold text-white">
                Monitor {status?.running ? "Ativo" : "Parado"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleStart}
                disabled={actionLoading || status?.running}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                  status?.running
                    ? "bg-green-500/5 text-green-400/40 border-green-500/10 cursor-not-allowed"
                    : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                }`}
              >
                {actionLoading && !status?.running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading || !status?.running}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                  !status?.running
                    ? "bg-red-500/5 text-red-400/40 border-red-500/10 cursor-not-allowed"
                    : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                }`}
              >
                {actionLoading && status?.running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Parar
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat label="Total Polls" value={status?.total_polls ?? 0} />
            <Stat label="Ultimo Poll" value={status?.last_poll ? new Date(status.last_poll).toLocaleTimeString("pt-BR") : "-"} />
            <Stat label="Novos Seguidores" value={status?.new_followers_detected ?? 0} color="text-green-400" />
            <Stat label="Novas Curtidas" value={status?.new_likes_detected ?? 0} color="text-pink-400" />
            <Stat label="Erros" value={status?.errors ?? 0} color={status?.errors ? "text-red-400" : undefined} />
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--primary)]" />
              Log de Atividade
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">
              Auto-refresh a cada 5s
            </span>
          </div>

          {activities.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-sm text-center py-8">
              Nenhuma atividade registrada. Inicie o monitor para comecar.
            </p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[var(--secondary)] transition-colors"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                      item.level === "error"
                        ? "bg-red-400"
                        : item.level === "warning"
                        ? "bg-yellow-400"
                        : "bg-green-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {new Date(item.created_at).toLocaleTimeString("pt-BR")}
                      </span>
                      {item.level === "error" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">ERROR</span>
                      )}
                    </div>
                    <p className="text-sm text-white">{item.message}</p>
                    {item.details && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className={`text-sm font-medium ${color || "text-white"}`}>{value}</p>
    </div>
  );
}
