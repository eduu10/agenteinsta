"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Instagram, Loader2, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      if (mode === "login") {
        result = await api.login(email, password);
      } else {
        result = await api.register(email, password, name);
      }
      setToken(result.token);
      router.push("/");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao autenticar";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">InstaAgent</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Agente de IA para Instagram
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-[var(--secondary)] rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-white"
              }`}
            >
              Cadastrar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-2 block">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-[var(--secondary)] text-white rounded-lg px-4 py-3 pr-12 text-sm border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted-foreground)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Powered by Agno + Groq
        </p>
      </div>
    </div>
  );
}
