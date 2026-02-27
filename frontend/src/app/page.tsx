"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import type { DashboardStats, MonitorStatus, ActivityLogItem } from "@/types";
import { MessageCircle, Heart, UserPlus, Activity, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monitor, setMonitor] = useState<MonitorStatus | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [s, m, a] = await Promise.all([
        api.getConversationStats(),
        api.getMonitorStatus(),
        api.getActivityLog(10),
      ]);
      setStats(s);
      setMonitor(m);
      setActivities(a);
      setError("");
    } catch {
      setError("Nao foi possivel conectar ao backend. Verifique se o servidor esta rodando.");
    }
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Conversas"
            value={stats?.total_conversations ?? 0}
            icon={<MessageCircle className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            title="DMs Enviados"
            value={stats?.total_dms_sent ?? 0}
            icon={<MessageCircle className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Comentarios"
            value={stats?.total_comments_posted ?? 0}
            icon={<Heart className="w-5 h-5" />}
            color="pink"
          />
          <StatCard
            title="Seguidores Saudados"
            value={stats?.total_followers_greeted ?? 0}
            icon={<UserPlus className="w-5 h-5" />}
            color="green"
          />
        </div>

        {/* Monitor Status */}
        {monitor && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--primary)]" />
              Status do Monitor
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Status</p>
                <p className={`text-sm font-medium ${monitor.running ? "text-green-400" : "text-gray-400"}`}>
                  {monitor.running ? "Rodando" : "Parado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Total Polls</p>
                <p className="text-sm font-medium text-white">{monitor.total_polls}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Novos Seguidores</p>
                <p className="text-sm font-medium text-white">{monitor.new_followers_detected}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Novas Curtidas</p>
                <p className="text-sm font-medium text-white">{monitor.new_likes_detected}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Erros</p>
                <p className={`text-sm font-medium ${monitor.errors > 0 ? "text-red-400" : "text-white"}`}>
                  {monitor.errors}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Atividade Recente</h3>
          {activities.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-sm">
              Nenhuma atividade ainda. Inicie o monitor nas configuracoes.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      item.level === "error"
                        ? "bg-red-400"
                        : item.level === "warning"
                        ? "bg-yellow-400"
                        : "bg-green-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.message}</p>
                    {item.details && (
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {item.details}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {new Date(item.created_at).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/30 text-pink-400",
    green: "from-green-500/20 to-green-600/5 border-green-500/30 text-green-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[var(--muted-foreground)] text-xs font-medium uppercase tracking-wider">
          {title}
        </span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
