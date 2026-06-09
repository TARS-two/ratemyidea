"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, email: string, userId: string) => void;
  onUpgrade?: () => void;
  isAuthenticated?: boolean;
  mode?: "limit" | "upgrade" | "claim-credit" | "default";
  lang?: string;
}

export default function AuthModal({ onClose, onSuccess, onUpgrade, isAuthenticated = false, mode = "default", lang = "en" }: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return setError("Auth service not available.");
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (tab === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) throw err;
        if (data.user && !data.session) {
          setSuccess(lang === "es"
            ? "Revisa tu email para confirmar tu cuenta."
            : "Check your email to confirm your account.");
          return;
        }
        if (data.session) {
          onSuccess(data.session.access_token, email, data.session.user.id);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.session) {
          onSuccess(data.session.access_token, email, data.session.user.id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    if (!supabase) return setError("Auth service not available.");
    if (!email.trim()) {
      setError(lang === "es" ? "Escribe tu correo para restablecer tu contraseña." : "Enter your email to reset your password.");
      return;
    }

    setResetLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (err) throw err;
      setSuccess(lang === "es"
        ? "Te enviamos un correo para restablecer tu contraseña."
        : "Password reset email sent. Check your inbox.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password reset failed.";
      setError(msg);
    } finally {
      setResetLoading(false);
    }
  }

  const isLimit = mode === "limit";
  const isLimitSignedIn = isLimit && isAuthenticated;
  const isClaimCredit = mode === "claim-credit";
  const canResetFromError = tab === "signin" && error.includes("Invalid login credentials");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-sm p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">
            {isClaimCredit
              ? (lang === "es" ? "Reclama tu evaluación extra" : "Claim your extra evaluation")
              : isLimit
                ? (lang === "es" ? "Límite alcanzado" : "Daily limit reached")
                : (lang === "es" ? "Tu cuenta" : "Your account")}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        {isLimit && (
          <p className="text-sm text-[var(--text-muted)] mb-5 bg-[var(--surface-light)] p-3 rounded-xl">
            {isLimitSignedIn
              ? (lang === "es"
                ? "Ya iniciaste sesión, pero alcanzaste tu límite diario. Actualiza a Pro para evaluaciones ilimitadas."
                : "You're signed in, but you've reached your daily limit. Upgrade to Pro for unlimited evaluations.")
              : (lang === "es"
                ? "Usaste tu evaluación gratis de hoy. Inicia sesión para reclamar o comprar una evaluación extra."
                : "You've used your free evaluation today. Sign in to claim or buy an extra evaluation.")}
          </p>
        )}

        {isClaimCredit && (
          <p className="text-sm text-[var(--text-muted)] mb-5 bg-[var(--surface-light)] p-3 rounded-xl">
            {lang === "es"
              ? "Crea una cuenta gratis para reclamar tu evaluación extra. Podrás conservar el crédito y usarlo aunque cierres esta página."
              : "Create a free account to claim your extra evaluation. You'll keep the credit and can use it even if you close this page."}
          </p>
        )}

        {!isAuthenticated && (
          <>
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
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <p>{error}</p>
                {canResetFromError && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={loading || resetLoading}
                    className="mt-2 font-semibold text-[var(--electric-light)] hover:text-white disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? "..." : (lang === "es" ? "Restablecer contraseña" : "Reset password")}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full py-3 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              {loading ? "..." : tab === "signin"
                ? (lang === "es" ? "Entrar" : "Sign in")
                : (lang === "es" ? "Crear cuenta" : "Create account")}
            </button>

            {tab === "signin" && (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading || resetLoading}
                className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--electric-light)] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {resetLoading ? "..." : (lang === "es" ? "¿Olvidaste tu contraseña?" : "Forgot your password?")}
              </button>
            )}
          </form>
        )}
          </>
        )}

        {isLimit && (
            <div className="mt-4 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                    {lang === "es" ? "¿Necesitas más evaluaciones?" : "Need more evaluations?"}
                </p>
                <button
                    onClick={onUpgrade}
                    disabled={!onUpgrade || loading}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
                >
                    {lang === "es" ? "Actualizar a Pro" : "Upgrade to Pro"}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
