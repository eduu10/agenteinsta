"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { AdminUser, ActivityLogItem } from "@/types";
import {
  Users,
  Activity,
  MessageCircle,
  Heart,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [monitors, setMonitors] = useState<Record<string, unknown>[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<ActivityLogItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Global config
  const [llmProvider, setLlmProvider] = useState("groq");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("llama-3.3-70b-versatile");
  const [showKey, setShowKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create user form
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMessage, setCreateUserMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user && !user.is_admin) {
      router.push("/");
      return;
    }
    loadData();
  }, [user, router]);

  async function loadData() {
    try {
      const [usersData, monitorsData, globalConfig] = await Promise.all([
        api.getUsers(),
        api.getAllMonitors().catch(() => []),
        api.getGlobalConfig(),
      ]);
      setUsers(usersData);
      setMonitors(monitorsData);
      setLlmProvider(globalConfig.llm_provider || "groq");
      setLlmModel(globalConfig.llm_model || "llama-3.3-70b-versatile");
    } catch {
      // Handle error silently
    }
  }

  async function toggleUserActivity(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    setLoadingActivity(true);
    try {
      const activity = await api.getUserActivity(userId, 20);
      setUserActivity(activity);
    } catch {
      setUserActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }

  async function handleSaveGlobalConfig() {
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const data: Record<string, unknown> = {
        llm_provider: llmProvider,
        llm_model: llmModel,
      };
      if (llmApiKey) {
        data.llm_api_key = llmApiKey;
      }
      await api.updateGlobalConfig(data);
      setConfigMessage({ type: "success", text: "Configuracao global salva!" });
      setLlmApiKey("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro";
      setConfigMessage({ type: "error", text: msg });
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    setCreateUserMessage(null);
    try {
      await api.adminCreateUser(newUserEmail, newUserPassword, newUserName);
      setCreateUserMessage({ type: "success", text: `Usuario ${newUserEmail} criado com sucesso!` });
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar usuario";
      setCreateUserMessage({ type: "error", text: msg });
    } finally {
      setCreatingUser(false);
    }
  }

  function getMonitorStatus(userId: string): string {
    const m = monitors.find((m) => (m as { user_id?: string }).user_id === userId);
    return m && (m as { running?: boolean }).running ? "Ativo" : "Parado";
  }

  const llmModels: Record<string, string[]> = {
    groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  };

  if (!user?.is_admin) return null;

  return (
    <div>
      <Header title="Painel Admin" />
      <div className="p-6 max-w-5xl space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Usuarios" value={users.length} color="purple" />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Monitors Ativos"
            value={monitors.filter((m) => (m as { running?: boolean }).running).length}
            color="green"
          />
          <StatCard
            icon={<MessageCircle className="w-5 h-5" />}
            label="Total DMs"
            value={users.reduce((acc, u) => acc + (u.total_dms || 0), 0)}
            color="blue"
          />
          <StatCard
            icon={<Heart className="w-5 h-5" />}
            label="Total Comentarios"
            value={users.reduce((acc, u) => acc + (u.total_comments || 0), 0)}
            color="pink"
          />
        </div>

        {/* Create User */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Criar Novo Usuario
          </h3>

          {createUserMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border mb-4 text-sm ${
              createUserMessage.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {createUserMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {createUserMessage.text}
            </div>
          )}

          <form onSubmit={handleCreateUser}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Nome</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuario"
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Senha</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creatingUser}
              className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
            >
              {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Criar Usuario
            </button>
          </form>
        </div>

        {/* Global LLM Config */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            Configuracao Global (LLM)
          </h3>

          {configMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border mb-4 text-sm ${
              configMessage.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {configMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {configMessage.text}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => { setLlmProvider(e.target.value); setLlmModel(llmModels[e.target.value]?.[0] || ""); }}
                className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="groq">Groq (Gratis)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="Nova chave (deixe vazio para manter)"
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 pr-12 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Modelo</label>
              <select
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {(llmModels[llmProvider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleSaveGlobalConfig}
            disabled={savingConfig}
            className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
          >
            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Config Global
          </button>
        </div>

        {/* Users List */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Usuarios ({users.length})
            </h3>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {users.map((u) => (
              <div key={u.id}>
                <button
                  onClick={() => toggleUserActivity(u.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--secondary)]/50 transition-colors text-left"
                >
                  {expandedUser === u.id ? (
                    <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{u.name || u.email}</span>
                      {u.is_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {u.email} {u.ig_username ? `| @${u.ig_username}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-[var(--muted-foreground)]">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">{u.total_dms || 0}</p>
                      <p>DMs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">{u.total_comments || 0}</p>
                      <p>Comentarios</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getMonitorStatus(u.id) === "Ativo"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                    }`}>
                      {getMonitorStatus(u.id)}
                    </div>
                  </div>
                </button>

                {/* Expanded Activity Log */}
                {expandedUser === u.id && (
                  <div className="px-6 pb-4">
                    <div className="bg-[var(--secondary)] rounded-lg p-4 max-h-60 overflow-y-auto">
                      <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                        Atividade Recente
                      </p>
                      {loadingActivity ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--muted-foreground)]" />
                        </div>
                      ) : userActivity.length === 0 ? (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-4">
                          Sem atividade registrada
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {userActivity.map((a) => (
                            <div key={a.id} className="flex items-start gap-2 text-xs">
                              <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                                a.level === "error" ? "bg-red-400" :
                                a.level === "warning" ? "bg-yellow-400" : "bg-green-400"
                              }`} />
                              <div className="min-w-0">
                                <span className="text-white">{a.message}</span>
                                <span className="text-[var(--muted-foreground)] ml-2">
                                  {new Date(a.created_at).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    green: "from-green-500/20 to-green-500/5 border-green-500/30 text-green-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    pink: "from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl border p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
