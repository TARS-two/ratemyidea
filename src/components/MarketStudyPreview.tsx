"use client";

import { Lang } from "@/app/i18n";

type PreviewResult = {
  ideaName: string;
  overall: number;
  summary: string;
  risks: string[];
};

interface MarketStudyPreviewProps {
  lang: Lang;
  result: PreviewResult;
  loading: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

function PreviewSection({ title, icon, children, locked = false }: { title: string; icon: string; children: React.ReactNode; locked?: boolean }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 md:p-6">
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
        {lang === "es" ? "Información específica protegida hasta completar la compra" : "Specific information protected until checkout is complete"}
      </span>
    </div>
  );
}

export default function MarketStudyPreview({ lang, result, loading, onClose, onCheckout }: MarketStudyPreviewProps) {
  const isEs = lang === "es";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--electric)]/30 bg-[var(--midnight)] shadow-2xl shadow-[var(--electric)]/10 animate-fade-up">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[var(--surface)] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--electric-light)]">
              {isEs ? "Preview del PDF" : "PDF preview"}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {isEs ? "Market Study — muestra del entregable" : "Market Study — deliverable sample"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              {isEs
                ? "Esta previsualización usa la misma estructura visual del reporte final. Los datos estratégicos se ocultan para proteger el contenido pagado."
                : "This preview uses the same visual structure as the final report. Strategic details are hidden to protect the paid content."}
            </p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-[var(--text-muted)] transition-colors hover:text-white cursor-pointer">✕</button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto bg-[var(--midnight)] px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-inner shadow-black/40 md:p-8">
            <header className="border-b border-white/10 pb-6 text-center">
              <p className="mb-2 text-sm uppercase tracking-wider text-[var(--electric-light)]">Complete Market Study</p>
              <h4 className="text-3xl font-bold text-white">{result.ideaName}</h4>
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-4xl font-bold text-[var(--electric-light)]">{result.overall.toFixed(1)}/10</span>
                <RiskBadge text={isEs ? "CAUTION" : "CAUTION"} tone="caution" />
              </div>
            </header>

            <PreviewSection title={isEs ? "Resumen ejecutivo" : "Executive Summary"} icon="📋">
              <p className="leading-relaxed text-[var(--text-secondary)]">{result.summary}</p>
              <p className="mt-3 text-[var(--text-muted)]">
                {isEs
                  ? "El reporte final amplía esta señal con investigación de mercado, competencia, audiencia objetivo, ruta de lanzamiento, proyecciones financieras y recomendación final."
                  : "The final report expands this signal with market research, competition, target audience, launch path, financial projections, and final recommendation."}
              </p>
            </PreviewSection>

            <div className="relative">
              <PreviewSection title={isEs ? "Análisis de mercado" : "Market Analysis"} icon="📊" locked>
                <p className="mb-5 leading-relaxed text-[var(--text-secondary)]">
                  The market is shaped by rising automation adoption, increasing software spend, and a clear gap between enterprise tools and underserved niche buyers.
                </p>
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "TAM", value: "$4.8B–$7.2B estimated opportunity" },
                    { label: "SAM", value: "$420M reachable segment" },
                    { label: "SOM", value: "$850K–$1.4M realistic early capture" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                      <p className="mb-1 text-xs font-semibold text-[var(--electric-light)]">{item.label}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-28 rounded-xl bg-gradient-to-r from-[var(--electric)]/50 via-cyan-300/25 to-emerald-300/30" />
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <li>→ Demand trend with cited market sources</li>
                    <li>→ Buyer urgency and adoption timing</li>
                    <li>→ Growth drivers and constraints</li>
                  </ul>
                </div>
              </PreviewSection>
              <LockedOverlay lang={lang} />
            </div>

            <div className="relative">
              <PreviewSection title={isEs ? "Análisis competitivo" : "Competitor Analysis"} icon="⚔️" locked>
                <p className="mb-5 text-[var(--text-secondary)]">Competitive landscape summary with 3–5 comparable companies, pricing, strengths, weaknesses, and market gaps.</p>
                <div className="space-y-4">
                  {["Competitor A", "Competitor B", "Competitor C"].map((name) => (
                    <div key={name} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                      <div className="mb-2 flex items-center justify-between"><h5 className="font-semibold text-white">{name}</h5><span className="text-xs text-[var(--text-muted)]">$19–$99/mo</span></div>
                      <p className="mb-2 text-sm text-[var(--text-secondary)]">Positioning, key feature set, and commercial threat level.</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]"><span>+ Strong distribution</span><span>− Weak niche workflow</span></div>
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
                    <h5 className="mb-1 font-semibold text-[var(--electric-light)]">{label}</h5>
                    <p className="mb-3 text-xs text-[var(--text-muted)]">Buyer profile, budget owner, decision trigger, and channels.</p>
                    <ul className="space-y-1 text-sm text-[var(--text-secondary)]"><li>• Pain point with urgency</li><li>• Goal tied to measurable outcome</li><li>• Best acquisition channel</li></ul>
                  </div>
                ))}
              </div>
            </PreviewSection>

            <PreviewSection title={isEs ? "Go-to-Market" : "Go-to-Market Strategy"} icon="🎯" locked>
              <div className="mb-4 rounded-xl border border-[var(--electric)]/20 bg-[var(--surface-light)] p-4">
                <p className="mb-1 text-sm font-semibold text-[var(--electric-light)]">Positioning</p>
                <p className="italic text-[var(--text-secondary)]">“Narrow, fast-to-adopt solution for a painful recurring workflow.”</p>
              </div>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>💰 Pricing strategy with willingness-to-pay rationale.</p>
                <p>📢 Priority channels ranked high / medium / low.</p>
                <p>🗓️ 30/60/90-day launch plan.</p>
              </div>
            </PreviewSection>

            <PreviewSection title={isEs ? "Proyecciones financieras" : "Financial Projections"} icon="💰" locked>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Year 1", revenue: "$48K–$96K", costs: "$18K–$35K" },
                  { label: "Year 2", revenue: "$180K–$420K", costs: "$65K–$140K" },
                ].map((year) => (
                  <div key={year.label} className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                    <h5 className="mb-2 font-semibold text-[var(--electric-light)]">{year.label}</h5>
                    <div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-[var(--text-muted)]">Revenue</span><span className="text-green-300">{year.revenue}</span></div><div className="flex justify-between"><span className="text-[var(--text-muted)]">Costs</span><span className="text-red-300">{year.costs}</span></div></div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[var(--text-muted)]">Includes assumptions, breakeven estimate, and bootstrap vs. funding recommendation.</p>
            </PreviewSection>

            <PreviewSection title={isEs ? "Riesgos y veredicto" : "Risk Assessment & Verdict"} icon="⚠️">
              <div className="space-y-3">
                <div className="rounded-xl border border-white/5 bg-[var(--surface-light)] p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{result.risks[0] || (isEs ? "Validar demanda real antes de escalar." : "Validate real demand before scaling.")}</p>
                    <div className="flex gap-1"><RiskBadge text="L: medium" tone="medium" /><RiskBadge text="I: high" tone="high" /></div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">💡 {isEs ? "El reporte final incluye mitigación y experimento recomendado." : "The final report includes mitigation and a recommended experiment."}</p>
                </div>
              </div>
            </PreviewSection>
          </div>

          <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs text-amber-100">
            {isEs
              ? "Nota: esta es una previsualización genérica basada en la plantilla real del PDF. El Market Study final se genera después de la compra con tu idea, fuentes disponibles y análisis específico. Es una herramienta de apoyo para decidir; no es asesoría legal, financiera ni de inversión, y no garantiza rentabilidad, demanda o éxito comercial."
              : "Note: this is a generic preview based on the real PDF template. The final Market Study is generated after purchase with your idea, available sources, and specific analysis. It is a decision-support tool, not legal, financial, or investment advice, and it does not guarantee profitability, demand, or business success."}
          </div>

          <div className="sticky bottom-0 mx-auto mt-5 max-w-3xl rounded-2xl border border-white/10 bg-[var(--midnight)]/95 p-4 shadow-2xl backdrop-blur-md">
            <button
              onClick={onCheckout}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[var(--electric)] px-6 py-4 text-base font-semibold text-white transition-all hover:bg-[var(--electric-dark)] disabled:opacity-60 cursor-pointer glow-pulse"
            >
              <span aria-hidden="true" className="text-lg">🛒</span>
              <span>{loading ? (isEs ? "Abriendo checkout seguro..." : "Opening secure checkout...") : (isEs ? "Comprar Market Study" : "Buy Market Study")}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">$49 USD</span>
            </button>
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              {isEs ? "Pago seguro procesado por Stripe" : "Secure payment processed by Stripe"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
