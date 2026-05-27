import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen grid-bg px-6 py-12 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface)]/80 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <Link href="/" className="text-sm text-[var(--electric-light)] hover:underline">← Rate My Idea</Link>

        <section className="mt-8 space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Terms / Términos</p>
          <h1 className="text-3xl font-bold">Terms of Use</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: May 27, 2026</p>

          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
            <p className="font-semibold">Rate My Idea is a decision-support tool, not financial, legal, investment, or professional advice.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Scores, evaluations, and market studies are estimates based on available information and AI analysis. They do not guarantee profitability, demand, funding, investment, or business success.</p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Use of the service</h2>
            <p>You are responsible for your business decisions. Rate My Idea can help you structure thinking, compare risks, and identify next steps, but it cannot replace professional judgment, legal counsel, financial advice, or market validation with real customers.</p>

            <h2 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Payments</h2>
            <p>Paid products such as Pro or Market Study checkout are processed through Stripe. Prices and availability may change. Payment disputes, refunds, or support requests can be sent to <a href="mailto:tars@ai-norte.com" className="text-[var(--electric-light)] hover:underline">tars@ai-norte.com</a>.</p>

            <h2 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">AI limitations</h2>
            <p>AI-generated analysis can be incomplete, outdated, or wrong. You should verify important claims, numbers, sources, and assumptions before acting on them.</p>

            <h2 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Idea privacy</h2>
            <p>We do not sell, publish, or use your ideas to build competing businesses. See the Privacy Policy for how evaluations may be stored and used to operate the service.</p>
          </div>
        </section>

        <section className="mt-10 space-y-5 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-bold">Términos de Uso</h2>
          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4">
            <p className="font-semibold">Rate My Idea es una herramienta de apoyo para decidir, no asesoría financiera, legal, de inversión ni profesional.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Los scores, evaluaciones y estudios de mercado son estimaciones basadas en información disponible y análisis con IA. No garantiza rentabilidad, demanda, financiamiento, inversión ni éxito comercial.</p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Uso del servicio</h3>
            <p>El usuario es responsable de sus decisiones de negocio. Rate My Idea ayuda a estructurar criterio, comparar riesgos e identificar siguientes pasos, pero no reemplaza juicio profesional, asesoría legal/financiera ni validación real con clientes.</p>

            <h3 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Pagos</h3>
            <p>Los productos pagados como Pro o Market Study se procesan mediante Stripe. Los precios y disponibilidad pueden cambiar. Para soporte o dudas de pago: <a href="mailto:tars@ai-norte.com" className="text-[var(--electric-light)] hover:underline">tars@ai-norte.com</a>.</p>

            <h3 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Limitaciones de IA</h3>
            <p>El análisis generado con IA puede ser incompleto, desactualizado o incorrecto. Verifica claims, números, fuentes y supuestos importantes antes de tomar decisiones.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
