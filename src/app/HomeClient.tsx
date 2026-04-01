"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { Lang, t } from "./i18n";

/* ---------- types ---------- */
interface Source {
  title: string;
  url: string;
  domain: string;
}

interface ScoreResult {
  ideaName: string;
  keywords: string[];
  overall: number;
  categories: {
    name: string;
    score: number;
    emoji: string;
    comment: string;
  }[];
  summary: string;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
  sources: Source[];
}

/* ---------- score ring ---------- */
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 10) * circumference;
  const color =
    score >= 7.5
      ? "var(--accent-green)"
      : score >= 5
        ? "var(--accent-yellow)"
        : "var(--accent-red)";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--surface-light)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-score-fill"
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-[var(--text-muted)]">/ 10</span>
      </div>
    </div>
  );
}

/* ---------- category bar ---------- */
function CategoryBar({
  category,
  delay,
}: {
  category: ScoreResult["categories"][0];
  delay: number;
}) {
  const pct = (category.score / 10) * 100;
  const color =
    category.score >= 7.5
      ? "bg-green-500"
      : category.score >= 5
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {category.emoji} {category.name}
        </span>
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {category.score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 bg-[var(--surface-light)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {category.comment}
      </p>
    </div>
  );
}

/* ---------- main page ---------- */
export default function HomeClient() {
  const [lang, setLang] = useState<Lang>("en");
  const [idea, setIdea] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [hideIdea, setHideIdea] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const s = t[lang];

  // Load lang from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "es" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          email: email.trim() || undefined,
          lang,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Something went wrong. Try again.");
      }

      const data = await res.json();
      setResult(data);

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function getOgImageUrl() {
    if (!result) return "/api/og";
    const params = new URLSearchParams({ score: result.overall.toFixed(1) });
    if (result.keywords?.length) params.set("keywords", result.keywords.join(","));
    if (hideIdea) {
      params.set("hidden", "1");
    } else if (result.ideaName) {
      params.set("name", result.ideaName);
    }
    return `/api/og?${params.toString()}`;
  }

  function getShareText() {
    if (!result) return "";
    const scoreStr = result.overall.toFixed(1);
    return lang === "es"
      ? `Acabo de evaluar mi idea de negocio y obtuve ${scoreStr}/10 🧠\n\nEvalúa la tuya gratis → ratemyidea.ai`
      : `I just rated my business idea and got ${scoreStr}/10 🧠\n\nRate yours free → ratemyidea.ai`;
  }

  async function handleDownloadImage() {
    try {
      const res = await fetch(getOgImageUrl());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ratemyidea-${result?.overall.toFixed(1) || "score"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(getOgImageUrl(), "_blank");
    }
  }

  async function handleShareNative() {
    try {
      const res = await fetch(getOgImageUrl());
      const blob = await res.blob();
      const file = new File([blob], "ratemyidea.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text: getShareText(),
          files: [file],
        });
        return;
      }
    } catch {
      // fallback below
    }
    // Fallback: copy text
    navigator.clipboard.writeText(getShareText());
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  function handleShareTwitter() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  function handleShareWhatsApp() {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function handleCopyText() {
    navigator.clipboard.writeText(getShareText());
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  function handleReset() {
    setResult(null);
    setIdea("");
    setEmail("");
    setError("");
    setHideIdea(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen grid-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-lg tracking-tight">
              {s.brand}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span className={lang === "en" ? "text-[var(--text-primary)]" : ""}>
                EN
              </span>
              <span className="mx-1 text-[var(--text-muted)]">|</span>
              <span className={lang === "es" ? "text-[var(--text-primary)]" : ""}>
                ES
              </span>
            </button>
            <a
              href="https://ai-norte.com"
              className="items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--electric-light)] transition-colors hidden sm:flex"
              target="_blank"
              rel="noopener"
            >
              <span>by</span>
              <img src="/ainorte-logo.svg" alt="AI Norte" className="h-4 w-4" />
              <span className="text-[var(--electric-light)]">AI Norte</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero + Form */}
      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-2xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {s.heroTitle1}
              <span className="gradient-text">{s.heroTitle2}</span>
            </h1>
            <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-lg mx-auto">
              {s.heroSubtitle}
            </p>
          </div>

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="idea"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {s.labelIdea}
                </label>
                <textarea
                  id="idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={s.placeholderIdea}
                  rows={4}
                  maxLength={1000}
                  required
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] focus:border-transparent resize-none transition-all"
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-[var(--text-muted)]">
                    {s.hintDetail}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {idea.length}/1000
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {s.labelEmail}{" "}
                  <span className="text-[var(--text-muted)]">{s.labelEmailHint}</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={s.placeholderEmail}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !idea.trim()}
                className="w-full py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all cursor-pointer text-lg glow-pulse"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {s.analyzing}
                  </span>
                ) : (
                  s.submitButton
                )}
              </button>
            </form>
          )}

          {/* Results */}
          {result && (
            <div ref={resultRef} className="space-y-8 animate-fade-up">
              {/* Overall Score */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">
                  {s.yourScore}
                </p>
                <ScoreRing score={result.overall} />
                <p className="mt-4 text-[var(--text-secondary)] max-w-md mx-auto">
                  {result.summary}
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="font-semibold text-lg">{s.breakdown}</h3>
                {result.categories.map((cat, i) => (
                  <CategoryBar key={cat.name} category={cat} delay={i * 100} />
                ))}
              </div>

              {/* Strengths & Risks */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-green-400 mb-3">
                    💪 {s.strengths}
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((str, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex gap-2"
                      >
                        <span className="text-green-500 shrink-0">✓</span>
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-red-400 mb-3">
                    ⚠️ {s.risks}
                  </h3>
                  <ul className="space-y-2">
                    {result.risks.map((r, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex gap-2"
                      >
                        <span className="text-red-500 shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold text-[var(--electric-light)] mb-3">
                  🚀 {s.nextSteps}
                </h3>
                <ol className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <li
                      key={i}
                      className="text-sm text-[var(--text-secondary)] flex gap-3"
                    >
                      <span className="text-[var(--electric)] font-mono font-bold shrink-0">
                        {i + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6">
                  <h3 className="font-semibold text-[var(--text-secondary)] mb-3">
                    📚 {s.sources}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-light)] border border-white/5 rounded-full text-xs text-[var(--text-secondary)] hover:border-[var(--electric)]/40 hover:text-[var(--electric-light)] transition-all"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
                          alt=""
                          className="w-3.5 h-3.5 rounded-sm"
                        />
                        <span className="font-medium">{source.domain}</span>
                        <span className="text-[var(--text-muted)] max-w-[180px] truncate hidden sm:inline">
                          — {source.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Upsell */}
              <div className="bg-gradient-to-r from-[var(--electric)]/20 to-purple-500/20 border border-[var(--electric)]/30 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-lg mb-2">
                  {s.upsellTitle}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {s.upsellDesc}
                </p>
                <button
                  disabled
                  className="px-6 py-3 bg-[var(--electric)] text-white font-semibold rounded-xl opacity-70 cursor-not-allowed"
                >
                  {s.upsellButton}
                </button>
              </div>

              {/* Share + Try Again */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] font-medium hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  📤 {s.shareScore}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] font-medium hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  🔄 {s.rateAnother}
                </button>
              </div>
            </div>
          )}

          {/* Social proof / stats */}
          {!result && (
            <div className="mt-16 grid grid-cols-3 gap-4 text-center">
              {[
                { num: s.statFree, label: s.statFreeLabel },
                { num: s.statSpeed, label: s.statSpeedLabel },
                { num: s.statAI, label: s.statAILabel },
              ].map((stat, i) => (
                <div key={i} className="p-4">
                  <p className="text-2xl font-bold gradient-text">{stat.num}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="bg-[var(--surface)] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-semibold text-lg">{s.shareScore}</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Real OG Image Preview */}
            <div className="px-6 pb-4">
              <div className="rounded-2xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={hideIdea ? "hidden" : "visible"}
                  src={getOgImageUrl()}
                  alt="Share card preview"
                  className="w-full aspect-[1200/630] object-cover"
                />
              </div>
            </div>

            {/* Hide idea toggle */}
            <div className="px-6 pb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={hideIdea}
                    onChange={(e) => setHideIdea(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--surface-light)] border border-white/10 rounded-full peer-checked:bg-[var(--electric)] transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--electric-light)] transition-colors">
                    🔒 {s.hideIdea}
                  </span>
                  <p className="text-xs text-[var(--text-muted)]">{s.hideIdeaHint}</p>
                </div>
              </label>
            </div>

            {/* Share buttons */}
            <div className="px-6 pb-6 space-y-2">
              {/* Primary: Download image */}
              <button
                onClick={handleDownloadImage}
                className="w-full py-3 bg-[var(--electric)] hover:bg-[var(--electric-dark)] text-white font-semibold rounded-xl transition-all cursor-pointer"
              >
                ⬇️ {s.downloadImage}
              </button>
              {/* Secondary row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShareTwitter}
                  className="py-2.5 bg-[var(--surface-light)] border border-white/10 rounded-xl text-sm text-[var(--text-primary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  𝕏
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 bg-[var(--surface-light)] border border-white/10 rounded-xl text-sm text-[var(--text-primary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  💬
                </button>
                <button
                  onClick={handleCopyText}
                  className="py-2.5 bg-[var(--surface-light)] border border-white/10 rounded-xl text-sm text-[var(--text-primary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  {shared ? "✓" : "📋"}
                </button>
              </div>
              {/* Native share (mobile) */}
              <button
                onClick={handleShareNative}
                className="w-full py-2.5 bg-[var(--surface-light)] border border-white/10 rounded-xl text-sm text-[var(--text-primary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer sm:hidden"
              >
                📱 {s.moreOptions}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <a
            href="https://ai-norte.com"
            className="flex items-center gap-1.5 hover:text-[var(--electric-light)] transition-colors"
            target="_blank"
            rel="noopener"
          >
            <span>{s.footerCopy}</span>
            <img src="/ainorte-logo.svg" alt="AI Norte" className="h-4 w-4" />
            <span className="text-[var(--electric-light)]">AI Norte</span>
          </a>
          <span>{s.footerTagline}</span>
        </div>
      </footer>
    </div>
  );
}
