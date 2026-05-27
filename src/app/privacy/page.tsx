import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen grid-bg px-6 py-12 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface)]/80 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <Link href="/" className="text-sm text-[var(--electric-light)] hover:underline">← Rate My Idea</Link>

        <section className="mt-8 space-y-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Privacy Policy / Política de Privacidad</p>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-[var(--text-secondary)]">Last updated: May 27, 2026</p>

          <div className="rounded-2xl border border-[var(--electric)]/25 bg-[var(--electric)]/10 p-4">
            <p className="font-semibold">We do not sell your ideas, publish them, or use them to build competing businesses.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Evaluations may be stored only to provide your results, history, improve product quality, operate the service, and prevent abuse.</p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">What we may collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your submitted idea and generated evaluation.</li>
              <li>Your email if you create an account or request follow-up.</li>
              <li>Basic usage and technical data needed for rate limiting, security, and abuse prevention.</li>
              <li>Payment status from Stripe. We do not store your card details.</li>
            </ul>

            <h2 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">How we use it</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To generate and show your evaluation or market study.</li>
              <li>To save history for logged-in users when that feature is enabled.</li>
              <li>To improve Rate My Idea and troubleshoot product issues.</li>
              <li>To prevent spam, bots, and excessive AI usage costs.</li>
            </ul>

            <h2 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Your choices</h2>
            <p>You can contact us to request deletion or correction of account-related data. Some records may be retained when required for security, payment, legal, or operational reasons.</p>
          </div>
        </section>

        <section className="mt-10 space-y-5 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-bold">Política de Privacidad</h2>
          <div className="rounded-2xl border border-[var(--electric)]/25 bg-[var(--electric)]/10 p-4">
            <p className="font-semibold">No vendemos tus ideas, no las publicamos y no las usamos para construir negocios competidores.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Las evaluaciones pueden guardarse solo para mostrar resultados, historial, mejorar la calidad del producto, operar el servicio y prevenir abuso.</p>
          </div>

          <div className="space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Qué podemos recopilar</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>La idea enviada y la evaluación generada.</li>
              <li>Tu correo si creas una cuenta o pides seguimiento.</li>
              <li>Datos técnicos mínimos para límites de uso, seguridad y prevención de abuso.</li>
              <li>Estado de pago desde Stripe. No guardamos datos de tarjeta.</li>
            </ul>

            <h3 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Para qué lo usamos</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Generar y mostrar tu evaluación o estudio de mercado.</li>
              <li>Guardar historial para usuarios con sesión cuando la función esté activa.</li>
              <li>Mejorar Rate My Idea y resolver problemas del producto.</li>
              <li>Prevenir spam, bots y costos excesivos de uso de IA.</li>
            </ul>

            <h3 className="pt-3 text-xl font-semibold text-[var(--text-primary)]">Contacto</h3>
            <p>Para solicitudes de privacidad, eliminación o corrección: <a href="mailto:tars@ai-norte.com" className="text-[var(--electric-light)] hover:underline">tars@ai-norte.com</a>.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
