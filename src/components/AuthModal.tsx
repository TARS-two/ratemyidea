"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, email: string) => void;
  mode?: "limit" | "upgrade" | "default";
  lang?: string;
}

export default function AuthModal({ onClose, onSuccess, mode = "default", lang = "en" }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return setError("Auth service not available.");
    setLoading(true);
    setError("");

    try {
      if (tab === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user && !data.session) {
          setSuccess(lang === "es"
            ? "Revisa tu email para confirmar tu cuenta."
            : "Check your email to confirm your account.");
          return;
        }
        if (data.session) {
          onSuccess(data.session.access_token, email);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.session) {
          onSuccess(data.session.access_token, email);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isLimit = mode === "limit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-sm p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">
            {isLimit
              ? (lang === "es" ? "Límite alcanzado" : "Daily limit reached")
              : (lang === "es" ? "Tu cuenta" : "Your account")}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        {isLimit && (
          <p className="text-sm text-[var(--text-muted)] mb-5 bg-[var(--surface-light)] p-3 rounded-xl">
            {lang === "es"
              ? "Usaste tus 2 evaluaciones gratuitas de hoy. Crea una cuenta para continuar."
              : "You've used your 2 free evaluations today. Sign in to continue or upgrade to Pro."}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-[var(--surface-light)] rounded-xl p-1">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                tab === t
                  ? "bg-[var(--electric)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "signin"
                ? (lang === "es" ? "Iniciar sesión" : "Sign in")
                : (lang === "es" ? "Registrarse" : "Sign up")}
            </button>
          ))}
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "es" ? "tu@email.com" : "you@email.com"}
              required
              className="w-full px-4 py-3 bg-[var(--midnight)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] transition-all text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={lang === "es" ? "Contraseña" : "Password"}
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[var(--midnight)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] transition-all text-sm"
            />

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              {loading ? "..." : tab === "signin"
                ? (lang === "es" ? "Entrar" : "Sign in")
                : (lang === "es" ? "Crear cuenta" : "Create account")}
            </button>
          </form>
        )}

        {isLimit && (
            <div className="mt-4 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                    {lang === "es" ? "¿Necesitas más evaluaciones?" : "Need more evaluations?"}
                </p>
                <button
                    onClick={() => window.location.href = "/upgrade"}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
                >
                    {lang === "es" ? "Actualizar a Pro" : "Upgrade to Pro"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
