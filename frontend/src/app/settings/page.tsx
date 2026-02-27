"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import { Save, TestTube, Loader2, CheckCircle, XCircle, Eye, EyeOff, Upload, KeyRound } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    ig_username: "",
    ig_password: "",
    app_id: "",
    app_secret: "",
    access_token: "",
    page_id: "",
    instagram_business_account_id: "",
    api_mode: "instagrapi",
    llm_provider: "groq",
    llm_api_key: "",
    llm_model: "llama-3.3-70b-versatile",
    polling_interval_seconds: 60,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        setForm((prev) => ({
          ...prev,
          ig_username: settings.ig_username || "",
          app_id: settings.app_id || "",
          page_id: settings.page_id || "",
          instagram_business_account_id: settings.instagram_business_account_id || "",
          api_mode: settings.api_mode || "instagrapi",
          llm_provider: settings.llm_provider || "groq",
          llm_model: settings.llm_model || "llama-3.3-70b-versatile",
          polling_interval_seconds: settings.polling_interval_seconds || 60,
        }));
        setSessionActive(settings.ig_session_active || false);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      // Only send non-empty fields
      const data: Record<string, unknown> = {};
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && value !== undefined) {
          data[key] = value;
        }
      });
      await api.updateSettings(data);
      setMessage({ type: "success", text: "Configuracoes salvas com sucesso!" });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Erro ao salvar";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      // Save first, then test
      await handleSave();
      const result = await api.testConnection();
      if (result.success) {
        setMessage({ type: "success", text: `Conexao OK! Conta: @${result.account?.username || result.account?.name || "conectado"}` });
      } else {
        setMessage({ type: "error", text: `Falha na conexao: ${result.error}` });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Erro ao testar";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setTesting(false);
    }
  }

  async function handleImportSession() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      setMessage(null);
      try {
        const text = await file.text();
        JSON.parse(text); // validate JSON
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const resp = await fetch(`${API_URL}/api/settings/import-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_json: text }),
        });
        if (resp.ok) {
          setMessage({ type: "success", text: "Sessao importada com sucesso! Teste a conexao." });
          setSessionActive(true);
        } else {
          const err = await resp.json();
          setMessage({ type: "error", text: `Erro: ${err.detail}` });
        }
      } catch {
        setMessage({ type: "error", text: "Arquivo JSON invalido." });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  function toggleSecret(field: string) {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function updateForm(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const llmModels: Record<string, string[]> = {
    groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  };

  return (
    <div>
      <Header title="Configuracoes" />
      <div className="p-6 max-w-3xl space-y-6">
        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* API Mode */}
        <Section title="Modo da API">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateForm("api_mode", "instagrapi")}
              className={`p-4 rounded-xl border text-left transition-all ${
                form.api_mode === "instagrapi"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] bg-[var(--secondary)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <p className="text-sm font-medium text-white">instagrapi (Nao-oficial)</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Mais funcoes: ve seguidores, curtidas, envia DMs. Risco de ban.
              </p>
            </button>
            <button
              onClick={() => updateForm("api_mode", "graph_api")}
              className={`p-4 rounded-xl border text-left transition-all ${
                form.api_mode === "graph_api"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border)] bg-[var(--secondary)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <p className="text-sm font-medium text-white">Graph API (Oficial)</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Mais seguro, mas limitado. Requer Facebook App + Business Account.
              </p>
            </button>
          </div>
        </Section>

        {/* Instagrapi Config */}
        {form.api_mode === "instagrapi" && (
          <Section title="Credenciais Instagram (instagrapi)">
            <div className="space-y-4">
              <InputField
                label="Username do Instagram"
                value={form.ig_username}
                onChange={(v) => updateForm("ig_username", v)}
                placeholder="seu_usuario"
              />
              <SecretField
                label="Senha do Instagram"
                value={form.ig_password}
                onChange={(v) => updateForm("ig_password", v)}
                show={showSecrets.ig_password}
                onToggle={() => toggleSecret("ig_password")}
                placeholder="sua_senha"
              />

              {/* Session Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                sessionActive
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-yellow-500/10 border-yellow-500/30"
              }`}>
                <KeyRound className={`w-4 h-4 ${sessionActive ? "text-green-400" : "text-yellow-400"}`} />
                <div className="flex-1">
                  <p className={`text-sm ${sessionActive ? "text-green-400" : "text-yellow-400"}`}>
                    {sessionActive ? "Sessao ativa importada" : "Sem sessao - login direto do servidor pode ser bloqueado"}
                  </p>
                </div>
                <button
                  onClick={handleImportSession}
                  disabled={importing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--secondary)] text-xs text-[var(--secondary-foreground)] hover:text-white border border-[var(--border)] transition-colors"
                >
                  {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Importar Sessao
                </button>
              </div>

              <div className="bg-[var(--secondary)] rounded-lg p-3 space-y-1">
                <p className="text-xs text-[var(--muted-foreground)] font-medium">Como conectar ao Instagram:</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  1. No seu PC, execute: <code className="bg-black/30 px-1 rounded">python backend/login_local.py</code>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  2. Faca login com seu Instagram (usa o IP do seu PC, nao o do servidor)
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  3. O script exporta a sessao e envia automaticamente para o servidor
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  4. Ou clique em &quot;Importar Sessao&quot; acima e selecione o arquivo <code className="bg-black/30 px-1 rounded">ig_session.json</code>
                </p>
              </div>

              <p className="text-xs text-yellow-400/80">
                Aviso: Usar a API nao-oficial pode resultar em ban da conta. Use com cautela.
              </p>
            </div>
          </Section>
        )}

        {/* Graph API Config */}
        {form.api_mode === "graph_api" && (
          <Section title="Credenciais Instagram Graph API">
            <div className="space-y-4">
              <InputField label="App ID" value={form.app_id} onChange={(v) => updateForm("app_id", v)} placeholder="123456789" />
              <SecretField label="App Secret" value={form.app_secret} onChange={(v) => updateForm("app_secret", v)} show={showSecrets.app_secret} onToggle={() => toggleSecret("app_secret")} placeholder="abc123..." />
              <SecretField label="Access Token" value={form.access_token} onChange={(v) => updateForm("access_token", v)} show={showSecrets.access_token} onToggle={() => toggleSecret("access_token")} placeholder="EAAxxxxxx..." />
              <InputField label="Page ID" value={form.page_id} onChange={(v) => updateForm("page_id", v)} placeholder="123456789" />
              <InputField label="Instagram Business Account ID" value={form.instagram_business_account_id} onChange={(v) => updateForm("instagram_business_account_id", v)} placeholder="17841234567890" />
            </div>
          </Section>
        )}

        {/* LLM Config */}
        <Section title="Configuracao do LLM (IA)">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Provider</label>
              <select
                value={form.llm_provider}
                onChange={(e) => {
                  updateForm("llm_provider", e.target.value);
                  updateForm("llm_model", llmModels[e.target.value]?.[0] || "");
                }}
                className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="groq">Groq (Gratis)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <SecretField
              label="API Key"
              value={form.llm_api_key}
              onChange={(v) => updateForm("llm_api_key", v)}
              show={showSecrets.llm_api_key}
              onToggle={() => toggleSecret("llm_api_key")}
              placeholder={form.llm_provider === "groq" ? "gsk_xxxx..." : "sk-xxxx..."}
            />
            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">Modelo</label>
              <select
                value={form.llm_model}
                onChange={(e) => updateForm("llm_model", e.target.value)}
                className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {(llmModels[form.llm_provider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Monitoring Config */}
        <Section title="Monitoramento">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">
              Intervalo de Polling (segundos)
            </label>
            <input
              type="number"
              min={30}
              max={300}
              value={form.polling_interval_seconds}
              onChange={(e) => updateForm("polling_interval_seconds", parseInt(e.target.value) || 60)}
              className="w-32 bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Minimo 30s. Intervalos menores aumentam o risco de deteccao.
            </p>
          </div>
        </Section>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--secondary)] text-[var(--secondary-foreground)] font-medium text-sm hover:text-white border border-[var(--border)] disabled:opacity-50 transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Testar Conexao
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="text-base font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
      />
    </div>
  );
}

function SecretField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 pr-12 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
        />
        <button
          onClick={onToggle}
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
