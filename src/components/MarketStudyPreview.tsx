"use client";

import { Lang } from "@/app/i18n";

type PreviewResult = {
  ideaName: string;
  overall: number;
  summary: string;
  risks: string[];
  strengths?: string[];
  nextSteps?: string[];
  categories: {
    name: string;
    score: number;
    emoji: string;
    comment: string;
  }[];
};

type PricingDisplay = {
  pricingRegion: string;
  marketStudy: {
    display: string;
    regionLabel?: string;
  };
};

interface MarketStudyPreviewProps {
  lang: Lang;
  result: PreviewResult;
  loading: boolean;
  pricing: PricingDisplay | null;
  onClose: () => void;
  onCheckout: () => void;
}

function PreviewSection({ title, kicker, icon, children, locked = false }: { title: string; kicker?: string; icon: string; children: React.ReactNode; locked?: boolean }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 md:p-6">
      {kicker && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--electric-light)]">{kicker}</p>}
      <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
        <span>{icon}</span> {title}
      </h4>
      <div className={locked ? "select-none blur-[3px]" : ""}>{children}</div>
    </section>
  );
}

function RiskBadge({ text, tone }: { text: string; tone: "high" | "medium" | "low" | "caution" }) {
  const classes: Record<typeof tone, string> = {
    high: "border-red-500/30 bg-red-500/20 text-red-300",
    medium: "border-yellow-500/30 bg-yellow-500/20 text-yellow-200",
    low: "border-green-500/30 bg-green-500/20 text-green-300",
    caution: "border-amber-400/30 bg-amber-400/20 text-amber-200",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${classes[tone]}`}>{text}</span>;
}

function LockedOverlay({ lang }: { lang: Lang }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 px-4 text-center">
      <span className="rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-sm">
        {lang === "es" ? "Investigación específica desbloqueada después de la compra" : "Specific research unlocked after purchase"}
      </span>
    </div>
  );
}

function PlaceholderLines() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-full rounded-full bg-white/20" />
      <div className="h-3 w-11/12 rounded-full bg-white/15" />
      <div className="h-3 w-4/5 rounded-full bg-white/10" />
    </div>
  );
}

export default function MarketStudyPreview({ lang, result, loading, pricing, onClose, onCheckout }: MarketStudyPreviewProps) {
  const isEs = lang === "es";
  const primaryRisk = result.risks[0] || (isEs ? "Validar demanda real antes de escalar." : "Validate real demand before scaling.");
  const marketStudyPrice = pricing?.marketStudy.display || "$29 USD";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-[var(--electric)]/30 bg-[var(--midnight)] shadow-2xl shadow-[var(--electric)]/10 animate-fade-up sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <div className="relative shrink-0 border-b border-white/10 bg-[var(--surface)] px-5 py-5 text-center sm:px-6 sm:text-left">
          <button onClick={onClose} aria-label={isEs ? "Cerrar preview" : "Close preview"} className="absolute right-4 top-4 text-xl leading-none text-[var(--text-muted)] transition-colors hover:text-white cursor-pointer">✕</button>
          <div className="mx-auto min-w-0 max-w-2xl sm:mx-0">
            <button
              type="button"
              onClick={onClose}
              className="marketStudyBackButton mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--electric)]/40 hover:text-white"
            >
              <span aria-hidden="true">←</span>
              {isEs ? "Volver al análisis básico" : "Back to basic analysis"}
            </button>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {isEs ? "Market Study — preview del reporte PDF" : "Market Study — PDF report preview"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              {isEs
                ? "El Market Study hace investigación más profunda sobre tu idea: contexto de mercado, competidores, clientes, riesgos, señales de precio y recomendaciones go-to-market, y lo entrega como reporte descargable de AI Norte."
                : "The Market Study runs deeper research on your idea: market context, competitors, customer segments, risks, pricing signals, and go-to-market recommendations, then packages it into a downloadable AI Norte report."}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--midnight)] px-4 py-6 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-8">
          <div className="mx-auto max-w-3xl space-y-5">
            <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--electric)]/15 p-7 text-center">
              <p className="mb-2 text-sm uppercase tracking-wider text-[var(--electric-light)]">Complete Market Study</p>
              <h4 className="text-3xl font-bold text-white">{result.ideaName}</h4>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">AI Norte Research Brief</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Executive Summary · Market Analysis · Competitor Analysis · Target Audience · Go-to-Market · Financial Projections
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <span className="text-4xl font-bold text-[var(--electric-light)]">{result.overall.toFixed(1)}/10</span>
                <RiskBadge text="PREVIEW" tone="caution" />
              </div>
            </header>

            <PreviewSection
              title={isEs ? "Señal del análisis básico" : "Basic analysis signal"}
              kicker={isEs ? "desbloqueado" : "unlocked"}
              icon="📋"
            >
              <p className="leading-relaxed text-[var(--text-secondary)]">{result.summary}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.categories.map((category) => (
                  <div key={category.name} className="rounded-xl border border-white/10 bg-[var(--surface-light)] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold text-white"><span className="mr-1">{category.emoji}</span>{category.name}</p>
                      <span className="rounded-full bg-[var(--electric)]/15 px-2 py-0.5 text-xs font-bold text-[var(--electric-light)]">{category.score}/10</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--text-muted)]">{category.comment}</p>
                  </div>
                ))}
              </div>
              {result.strengths && result.strengths.length > 0 && (
                <div className="mt-5 rounded-xl border border-green-400/15 bg-green-400/10 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-green-200">{isEs ? "Fortalezas ya detectadas" : "Already-detected strengths"}</p>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    {result.strengths.slice(0, 2).map((strength) => <li key={strength}>• {strength}</li>)}
                  </ul>
                </div>
              )}
            </PreviewSection>

            <div className="relative">
              <PreviewSection title={isEs ? "Análisis de mercado" : "Market Analysis"} icon="📊" locked>
                <p className="mb-5 leading-relaxed text-[var(--text-secondary)]">Market sizing, demand signals, adoption timing, source-backed trends, and constraints.</p>
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  {["TAM", "SAM", "SOM"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                      <p className="mb-2 text-xs font-semibold text-[var(--electric-light)]">{label}</p>
                      <PlaceholderLines />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-28 rounded-xl bg-gradient-to-r from-[var(--electric)]/50 via-cyan-300/25 to-emerald-300/30" />
                  <PlaceholderLines />
                </div>
              </PreviewSection>
              <LockedOverlay lang={lang} />
            </div>

            <div className="relative">
              <PreviewSection title={isEs ? "Análisis competitivo" : "Competitor Analysis"} icon="⚔️" locked>
                <p className="mb-5 text-[var(--text-secondary)]">Competitive landscape summary with comparable companies, pricing, strengths, weaknesses, and market gaps.</p>
                <div className="space-y-4">
                  {["Competitor profile", "Positioning gap", "Defensibility angle"].map((name) => (
                    <div key={name} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                      <div className="mb-2 flex items-center justify-between"><h5 className="font-semibold text-white">{name}</h5><span className="text-xs text-[var(--text-muted)]">locked</span></div>
                      <PlaceholderLines />
                    </div>
                  ))}
                </div>
              </PreviewSection>
              <LockedOverlay lang={lang} />
            </div>

            <PreviewSection title={isEs ? "Audiencia objetivo" : "Target Audience"} icon="👥" locked>
              <div className="grid gap-4 sm:grid-cols-2">
                {[isEs ? "Persona primaria" : "Primary persona", isEs ? "Persona secundaria" : "Secondary persona"].map((label) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                    <h5 className="mb-3 font-semibold text-[var(--electric-light)]">{label}</h5>
                    <PlaceholderLines />
                  </div>
                ))}
              </div>
            </PreviewSection>

            <PreviewSection title={isEs ? "Go-to-Market" : "Go-to-Market Strategy"} icon="🎯" locked>
              <div className="mb-4 rounded-xl border border-[var(--electric)]/20 bg-[var(--surface-light)] p-4">
                <p className="mb-1 text-sm font-semibold text-[var(--electric-light)]">Positioning</p>
                <PlaceholderLines />
              </div>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>💰 Pricing rationale</p>
                <p>📢 Priority channels</p>
                <p>🗓️ 30/60/90-day launch plan</p>
              </div>
            </PreviewSection>

            <PreviewSection title={isEs ? "Proyecciones financieras" : "Financial Projections"} icon="💰" locked>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                {["Year 1", "Year 2"].map((year) => (
                  <div key={year} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                    <h5 className="mb-3 font-semibold text-[var(--electric-light)]">{year}</h5>
                    <PlaceholderLines />
                  </div>
                ))}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Includes assumptions, breakeven estimate, and bootstrap vs. funding recommendation.</p>
            </PreviewSection>

            <PreviewSection title={isEs ? "Riesgos y veredicto" : "Risk Assessment & Verdict"} icon="⚠️">
              <div className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <RiskBadge text={isEs ? "Valor incluido en el preview" : "Free preview value"} tone="caution" />
                  <RiskBadge text={isEs ? "Probabilidad: media" : "Likelihood: medium"} tone="medium" />
                  <RiskBadge text={isEs ? "Impacto: alto" : "Impact: high"} tone="high" />
                </div>
                <div className="mb-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{primaryRisk}</p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">💡 {isEs ? "El reporte final incluye mitigación y experimento recomendado." : "The final report includes mitigation and a recommended experiment."}</p>
              </div>
            </PreviewSection>
          </div>

          <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs text-amber-100">
            {isEs
              ? "Nota: esta es una previsualización genérica basada en la plantilla real del PDF. La sección desbloqueada usa únicamente información ya producida por tu análisis básico; el Market Study final se genera después de la compra con investigación, fuentes disponibles y análisis específico."
              : "Note: this is a generic preview based on the real PDF template. The unlocked section only uses information already produced by your basic analysis; the final Market Study is generated after purchase with research, available sources, and specific analysis."}
          </div>

          <div className="sticky bottom-3 mx-auto mt-5 max-w-3xl rounded-2xl border border-white/10 bg-[var(--midnight)]/95 p-3 shadow-2xl backdrop-blur-md sm:p-4">
            <button
              onClick={onCheckout}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--electric)] px-7 py-5 text-base font-black text-white shadow-lg shadow-[var(--electric)]/25 transition-all hover:-translate-y-0.5 hover:bg-[var(--electric-dark)] hover:shadow-[0_0_32px_rgba(108,58,255,0.45)] disabled:opacity-60 cursor-pointer glow-pulse"
            >
              <span aria-hidden="true" className="text-2xl">🛒</span>
              <span className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-1">
                {loading ? (
                  <span>{isEs ? "Abriendo checkout seguro..." : "Opening secure checkout..."}</span>
                ) : isEs ? (
                  <>
                    <span>Comprar</span>
                    <span>Market Study</span>
                  </>
                ) : (
                  <>
                    <span>Buy</span>
                    <span>Market Study</span>
                  </>
                )}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{marketStudyPrice}</span>
            </button>
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              {isEs ? "Precio regional aplicado cuando está disponible. Pago seguro procesado por Stripe" : "Regional pricing applied when available. Secure payment processed by Stripe"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
