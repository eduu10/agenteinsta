"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import { Save, TestTube, Loader2, CheckCircle, XCircle, Eye, EyeOff, Upload, KeyRound, Shield, Clock, Bot } from "lucide-react";

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
    polling_interval_seconds: 60,
    // Bot control
    welcome_dm_enabled: true,
    auto_comment_enabled: true,
    max_dms_per_day: 20,
    max_comments_per_day: 20,
    delay_between_dms: 45,
    delay_between_comments: 60,
    delay_between_media_checks: 5,
    followers_per_check: 20,
    media_posts_per_check: 3,
    delay_randomization_max: 30,
  });
  const [dailyUsage, setDailyUsage] = useState({ dms_sent_today: 0, comments_posted_today: 0 });
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
          polling_interval_seconds: settings.polling_interval_seconds || 60,
          // Bot control
          welcome_dm_enabled: settings.welcome_dm_enabled ?? true,
          auto_comment_enabled: settings.auto_comment_enabled ?? true,
          max_dms_per_day: settings.max_dms_per_day ?? 20,
          max_comments_per_day: settings.max_comments_per_day ?? 20,
          delay_between_dms: settings.delay_between_dms ?? 45,
          delay_between_comments: settings.delay_between_comments ?? 60,
          delay_between_media_checks: settings.delay_between_media_checks ?? 5,
          followers_per_check: settings.followers_per_check ?? 20,
          media_posts_per_check: settings.media_posts_per_check ?? 3,
          delay_randomization_max: settings.delay_randomization_max ?? 30,
        }));
        setSessionActive(settings.ig_session_active || false);
        setDailyUsage({
          dms_sent_today: settings.dms_sent_today ?? 0,
          comments_posted_today: settings.comments_posted_today ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
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
        await api.importSession(text);
        setMessage({ type: "success", text: "Sessao importada com sucesso! Teste a conexao." });
        setSessionActive(true);
      } catch {
        setMessage({ type: "error", text: "Erro ao importar sessao." });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  function toggleSecret(field: string) {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function updateForm(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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

        {/* === BOT CONTROL SECTIONS === */}

        {/* Bot Functions */}
        <Section title="Funcoes do Bot" icon={<Bot className="w-5 h-5 text-[var(--primary)]" />}>
          <div className="divide-y divide-[var(--border)]">
            <ToggleField
              label="DM de Boas-Vindas"
              description="Envia mensagem automatica para novos seguidores"
              enabled={form.welcome_dm_enabled}
              onChange={(v) => updateForm("welcome_dm_enabled", v)}
            />
            <ToggleField
              label="Comentarios Automaticos"
              description="Comenta nas postagens quando alguem curte"
              enabled={form.auto_comment_enabled}
              onChange={(v) => updateForm("auto_comment_enabled", v)}
            />
          </div>
        </Section>

        {/* Safety Limits */}
        <Section title="Limites de Seguranca" icon={<Shield className="w-5 h-5 text-yellow-400" />}>
          <div className="space-y-5">
            {/* Daily Usage Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--secondary)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted-foreground)]">DMs Enviadas Hoje</p>
                <p className="text-lg font-semibold text-white">
                  {dailyUsage.dms_sent_today}
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">
                    {" "}/ {form.max_dms_per_day}
                  </span>
                </p>
                <div className="w-full bg-[var(--border)] rounded-full h-1.5 mt-2">
                  <div
                    className="bg-[var(--primary)] h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (dailyUsage.dms_sent_today / Math.max(1, form.max_dms_per_day)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="bg-[var(--secondary)] rounded-lg p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Comentarios Hoje</p>
                <p className="text-lg font-semibold text-white">
                  {dailyUsage.comments_posted_today}
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">
                    {" "}/ {form.max_comments_per_day}
                  </span>
                </p>
                <div className="w-full bg-[var(--border)] rounded-full h-1.5 mt-2">
                  <div
                    className="bg-pink-500 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (dailyUsage.comments_posted_today / Math.max(1, form.max_comments_per_day)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Limit Controls */}
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Max DMs por Dia"
                value={form.max_dms_per_day}
                onChange={(v) => updateForm("max_dms_per_day", v)}
                min={1}
                max={50}
                description="Recomendado: 15-25. Acima de 30 risco de bloqueio."
              />
              <NumberField
                label="Max Comentarios por Dia"
                value={form.max_comments_per_day}
                onChange={(v) => updateForm("max_comments_per_day", v)}
                min={1}
                max={50}
                description="Recomendado: 15-25. Acima de 30 risco de bloqueio."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Seguidores por Verificacao"
                value={form.followers_per_check}
                onChange={(v) => updateForm("followers_per_check", v)}
                min={5}
                max={50}
                description="Quantos seguidores buscar a cada poll."
              />
              <NumberField
                label="Posts por Verificacao"
                value={form.media_posts_per_check}
                onChange={(v) => updateForm("media_posts_per_check", v)}
                min={1}
                max={10}
                description="Quantos posts verificar curtidas por poll."
              />
            </div>
          </div>
        </Section>

        {/* Timing */}
        <Section title="Temporizacao" icon={<Clock className="w-5 h-5 text-blue-400" />}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Delay entre DMs"
                value={form.delay_between_dms}
                onChange={(v) => updateForm("delay_between_dms", v)}
                min={10}
                max={300}
                unit="segundos"
                description="Minimo recomendado: 30s. Imita comportamento humano."
              />
              <NumberField
                label="Delay entre Comentarios"
                value={form.delay_between_comments}
                onChange={(v) => updateForm("delay_between_comments", v)}
                min={10}
                max={300}
                unit="segundos"
                description="Minimo recomendado: 45s."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Delay entre Verificacoes de Midia"
                value={form.delay_between_media_checks}
                onChange={(v) => updateForm("delay_between_media_checks", v)}
                min={2}
                max={30}
                unit="segundos"
                description="Pausa entre checar diferentes posts."
              />
              <NumberField
                label="Variacao Aleatoria Max"
                value={form.delay_randomization_max}
                onChange={(v) => updateForm("delay_randomization_max", v)}
                min={0}
                max={120}
                unit="segundos"
                description="Adicionado aleatoriamente a cada delay."
              />
            </div>

            {/* Safety Best Practices Callout */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-xs text-yellow-400 font-medium mb-1">Boas Praticas de Seguranca</p>
              <ul className="text-xs text-yellow-400/80 space-y-1 list-disc list-inside">
                <li>Mantenha delays maiores que 30s para evitar deteccao</li>
                <li>Nao ultrapasse 30 DMs ou comentarios por dia</li>
                <li>Contas novas devem comecar com limites menores (5-10/dia)</li>
                <li>A variacao aleatoria ajuda a evitar padroes detectaveis</li>
                <li>Aumente os limites gradualmente ao longo de semanas</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <div className="flex gap-3 pb-8">
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

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
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

function ToggleField({ label, description, enabled, onChange }: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-[var(--primary)]" : "bg-[var(--secondary)] border border-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, unit, description }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
  description?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
          className="w-24 bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        {unit && <span className="text-xs text-[var(--muted-foreground)]">{unit}</span>}
      </div>
      {description && (
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>
      )}
    </div>
  );
}
