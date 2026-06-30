"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import Script from "next/script";
import { Lang, t } from "./i18n";
import AuthModal from "@/components/AuthModal";
import BenchmarkChart from "@/components/BenchmarkChart";
import MarketStudyPreview from "@/components/MarketStudyPreview";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const PENDING_SHARE_CREDIT_KEY = "rmi_pending_share_credit_claim";
const CHECKOUT_RESULT_KEY = "rmi_checkout_open_result";
const NEXT_PUBLIC_TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/* ---------- types ---------- */
interface Source {
  title: string;
  url: string;
  domain: string;
  sourceQuality?: number;
  qualityTier?: string;
  provider?: string;
  query?: string;
  usedInPrompt?: boolean;
}

interface Badge {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

interface ScoreResult {
  ideaName: string;
  keywords: string[];
  overall: number;
  category: string;
  basicBenchmark?: BasicBenchmark;
  badge: Badge;
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

interface BenchmarkData {
  percentile: number;
  topPercent?: number;
  totalInCategory: number;
  category: string;
  distribution: { range: string; count: number }[];
  subscoreAverages?: { name: string; average: number | null }[];
  strongerThanSimilar?: string[];
  weakerThanSimilar?: string[];
  improvementLevers?: string[];
  disclaimer?: string;
  insufficient?: boolean;
}

interface BasicBenchmark {
  category: string;
  categoryShare: number;
  categoryAverage: number | null;
  sampleSize: number;
  totalSampleSize: number;
  isAboveAverage: boolean | null;
  commonWeakness: string;
  commonStrength: string;
  signalSource?: "normalized_tags" | "category_fallback";
  signalSampleSize?: number;
  disclaimer: string;
}

interface UserSession {
  token: string;
  email: string;
  userId: string;
  isPro: boolean;
}

interface UserProfile {
  is_pro: boolean;
  free_evaluations_left: number;
  last_share_date: string | null;
}

interface EvaluationMeta {
  isPro: boolean;
  freeEvaluationsUsed: number;
  freeEvaluationsLeft: number;
}

interface PricingDisplay {
  detectedCountry: string;
  pricingRegion: string;
  marketStudy: {
    display: string;
    currency: string;
    regionLabel?: string;
  };
}

interface HistoryEvaluation {
  id: string;
  idea_name: string | null;
  idea_text: string;
  overall_score: number | null;
  category: string | null;
  created_at: string;
  result_json: ScoreResult | null;
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Error && value.message.trim()) return value.message;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested = record.message ?? record.error ?? record.detail ?? record.description;
    if (nested !== value) {
      return getErrorMessage(nested, fallback);
    }
  }

  return fallback;
}

function detectIdeaLanguage(text: string): Lang {
  const normalized = text.toLowerCase();
  const spanishSignals = [
    " que ", " para ", " con ", " una ", " un ", " los ", " las ", " negocio", " mercado",
    " clientes", " méxico", " mexico", " español", " años", " sería", " podría", " quiero", " tengo",
  ];
  const hasSpanishChars = /[áéíóúñ¿¡]/i.test(text);
  const padded = ` ${normalized} `;
  const signalCount = spanishSignals.filter((signal) => padded.includes(signal)).length;

  return hasSpanishChars || signalCount >= 2 ? "es" : "en";
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
    <div className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--surface-light)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-score-fill"
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold sm:text-6xl" style={{ color }}>
          {score.toFixed(1)}
        </span>
        <span className="text-sm font-semibold text-[var(--text-muted)]">/ 10</span>
      </div>
    </div>
  );
}

const DIMENSION_LABELS_ES: Record<string, string> = {
  "Market Demand": "Demanda de mercado",
  Competition: "Competencia",
  "Revenue Potential": "Potencial de ingresos",
  Feasibility: "Viabilidad",
  Scalability: "Escalabilidad",
  Differentiation: "Diferenciación",
};

const BENCHMARK_SIGNAL_COPY_ES: Record<string, string> = {
  "unclear monetization or service-area assumptions": "monetización o alcance geográfico poco claros",
  "stronger niche demand when the location is specific": "mejores señales cuando la ubicación está bien definida",
  "weak differentiation against existing tools": "diferenciación débil frente a herramientas existentes",
  "clearer value when the buyer and workflow are narrow": "valor más claro cuando el comprador y el flujo son específicos",
  "crowded channels and unclear acquisition cost": "canales saturados y costo de adquisición poco claro",
  "stronger demand when the niche has repeat purchase behavior": "mayor demanda cuando el nicho compra de forma recurrente",
  "limited evidence of willingness to pay": "poca evidencia de disposición a pagar",
  "stronger traction when the customer segment is specific": "mejor tracción cuando el segmento de cliente es específico",
  "unclear monetization or differentiation": "monetización o diferenciación poco claras",
  "stronger signals when the target customer is specific": "mejores señales cuando el cliente objetivo es específico",
  "specific customer": "cliente específico",
  "clear pain": "dolor claro",
  "repeat purchase": "compra recurrente",
  "strong niche": "nicho fuerte",
  "low build complexity": "baja complejidad inicial",
  "high willingness to pay": "alta disposición a pagar",
  "timely trend": "tendencia oportuna",
  "clear distribution": "distribución clara",
  "defensible insight": "insight defendible",
  "unclear customer": "cliente poco claro",
  "weak differentiation": "diferenciación débil",
  "unclear monetization": "monetización poco clara",
  "crowded channel": "canal saturado",
  "high build complexity": "alta complejidad inicial",
  "low willingness to pay": "baja disposición a pagar",
  "vague scope": "alcance vago",
  "unclear acquisition": "adquisición poco clara",
  "location assumptions": "supuestos de ubicación",
  "market too small": "mercado demasiado pequeño",
  "regulated market": "mercado regulado",
  "platform dependency": "dependencia de plataforma",
  "long sales cycle": "ciclo de venta largo",
  "trust barrier": "barrera de confianza",
  "data dependency": "dependencia de datos",
  "operational complexity": "complejidad operativa",
  "copycat risk": "riesgo de copia",
  "pricing sensitivity": "sensibilidad al precio",
};

const IMPROVEMENT_LEVER_COPY_ES: Record<string, string> = {
  "Validate demand with 5 target buyers.": "Valida la demanda con 5 compradores objetivo.",
  "Clarify why buyers would choose this over existing alternatives.": "Aclara por qué alguien elegiría esto frente a alternativas existentes.",
  "Add concrete pricing and purchase-frequency assumptions.": "Agrega supuestos concretos de precio y frecuencia de compra.",
  "Reduce the first version to one deliverable you can test this week.": "Reduce la primera versión a un entregable que puedas probar esta semana.",
  "Identify the repeatable acquisition channel before building more features.": "Identifica un canal repetible de adquisición antes de construir más features.",
  "Define the exact customer segment.": "Define el segmento exacto de cliente.",
  "Add pricing and willingness-to-pay assumptions.": "Agrega supuestos de precio y disposición a pagar.",
};

function benchmarkLabel(value: string, lang: Lang | string) {
  return lang === "es" ? (DIMENSION_LABELS_ES[value] ?? value) : value;
}

function benchmarkCopy(value: string, lang: Lang | string) {
  return lang === "es" ? (BENCHMARK_SIGNAL_COPY_ES[value] ?? IMPROVEMENT_LEVER_COPY_ES[value] ?? value) : value;
}

function getProUpsellCopy(score: number, lang: Lang) {
  if (score >= 7.5) {
    return lang === "es"
      ? {
          headline: "Tu idea ya tiene una señal fuerte. Ahora hay que protegerla.",
          body: "Esta idea salió fuerte. Pro te ayuda a proteger lo bueno: compararla, planear ejecución e identificar qué todavía podría romperse.",
        }
      : {
          headline: "Your idea has strong signal. Now protect the upside.",
          body: "This idea scored high. Pro helps you protect the upside: benchmark it, plan execution, and identify what could still break.",
        };
  }

  if (score >= 5) {
    return lang === "es"
      ? {
          headline: "Tu idea ya tiene una señal. Ahora hay que hacerla más fuerte.",
          body: "Esta idea tiene potencial, pero los puntos débiles importan. Pro te ayuda a mejorarla antes de gastar tiempo o dinero.",
        }
      : {
          headline: "Your idea has signal. Now make it stronger.",
          body: "This idea has potential, but the weak spots matter. Pro helps you improve the idea before spending time or money.",
        };
  }

  return lang === "es"
    ? {
        headline: "Esta idea quizá necesita un giro. Pro te ayuda a encontrarlo.",
        body: "Esta idea quizá necesita un giro. Pro te ayuda a entender qué cambiar y si una versión más fuerte es posible.",
      }
    : {
        headline: "This idea may need a pivot. Pro helps you find it.",
        body: "This idea may need a pivot. Pro helps you understand what to change and whether a stronger version is possible.",
      };
}

function getProUpsellCards(lang: Lang) {
  return lang === "es"
    ? [
        {
          icon: "🧭",
          title: "Compara tu idea",
          body: "Ve cómo se compara tu score contra ideas similares de la misma categoría.",
        },
        {
          icon: "🧪",
          title: "Presiona los puntos débiles",
          body: "Detecta qué riesgos están bajando tu score y qué deberías validar primero.",
        },
        {
          icon: "🗂",
          title: "Guarda tus ideas",
          body: "Conserva tus evaluaciones, compara versiones y no pierdas tus mejores ideas.",
        },
        {
          icon: "⚡",
          title: "Convierte análisis en acción",
          body: "Genera 10 próximos pasos concretos para saber qué hacer esta semana.",
        },
      ]
    : [
        {
          icon: "🧭",
          title: "Compare your idea",
          body: "See how your score compares against similar ideas in the same category.",
        },
        {
          icon: "🧪",
          title: "Stress-test the weak spots",
          body: "Find the exact risks dragging your score down and what to validate first.",
        },
        {
          icon: "🗂",
          title: "Save and revisit your ideas",
          body: "Keep your evaluations, compare versions, and avoid losing your best thinking.",
        },
        {
          icon: "⚡",
          title: "Turn analysis into action",
          body: "Generate 10 focused next steps so you know what to do this week.",
        },
      ];
}

function BasicBenchmarkCard({
  benchmark,
  userScore,
  lang,
}: {
  benchmark: BasicBenchmark;
  userScore: number;
  lang: Lang;
}) {
  const categoryAverage = benchmark.categoryAverage;
  const averageWidth = Math.min(((categoryAverage ?? userScore) / 10) * 100, 100);
  const userWidth = Math.min((userScore / 10) * 100, 100);
  const comparisonCopy =
    benchmark.isAboveAverage === null
      ? lang === "es"
        ? "Aún no hay suficiente muestra en esta categoría para afirmar si está arriba o abajo del promedio."
        : "There is not enough sample depth in this category yet to say whether it is above or below average."
      : benchmark.isAboveAverage
        ? lang === "es"
          ? "Tu score está por encima del promedio actual de la categoría."
          : "Your score is above the current category average."
        : lang === "es"
          ? "Tu score está por debajo del promedio actual de la categoría."
          : "Your score is below the current category average.";
  const signalConfidenceCopy = benchmark.signalSource === "normalized_tags"
    ? lang === "es"
      ? `Confianza de patrón: basada en ${benchmark.signalSampleSize ?? 0} señales normalizadas de esta categoría.`
      : `Pattern confidence: based on ${benchmark.signalSampleSize ?? 0} normalized signals in this category.`
    : lang === "es"
      ? "Confianza de patrón: muestra baja; usando fallback heurístico por categoría."
      : "Pattern confidence: low sample; using category heuristic fallback.";

  return (
    <section className="rounded-2xl border border-[var(--electric)]/20 bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--electric-light)]">
            {lang === "es" ? "Benchmark básico" : "Basic benchmark"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {lang === "es" ? "Cómo se compara esta idea" : "How this idea compares"}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
          {benchmark.category}
        </span>
      </div>

      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        {lang === "es" ? "Comparamos tu idea contra ideas similares en:" : "Your idea is being compared against similar ideas in:"} {benchmark.category}
      </p>

      <div className="mb-5 rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 grid gap-2 text-xs text-[var(--text-muted)] sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--electric)]" />
            <span>{lang === "es" ? "Tu score" : "Your score"}: {userScore.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
            <span>{lang === "es" ? "Promedio de esta categoría" : "This category average"}: {categoryAverage?.toFixed(1) ?? "—"}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[10px] text-[var(--text-muted)]">{lang === "es" ? "Tu score" : "Your score"}</div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-light)]">
              <div className="h-full rounded-full bg-[var(--electric)]" style={{ width: `${userWidth}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] text-[var(--text-muted)]">{lang === "es" ? "Promedio de categoría" : "Category average"}</div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-light)]">
              <div className="h-full rounded-full bg-amber-300/70" style={{ width: `${averageWidth}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          {lang === "es" ? "Señal de categoría" : "Category signal"}
        </p>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>• {benchmark.categoryShare}% {lang === "es" ? `de todas las ideas evaluadas están en esta categoría (${benchmark.sampleSize} de ${benchmark.totalSampleSize}).` : `of all evaluated ideas are in this category (${benchmark.sampleSize} of ${benchmark.totalSampleSize}).`}</li>
          <li>• {comparisonCopy}</li>
          <li>• {lang === "es" ? "Debilidad común" : "Common weakness"}: {benchmarkCopy(benchmark.commonWeakness, lang)}</li>
          <li>• {lang === "es" ? "Fortaleza común" : "Common strength"}: {benchmarkCopy(benchmark.commonStrength, lang)}</li>
          <li>• {signalConfidenceCopy}</li>
        </ul>
      </div>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        {lang === "es"
          ? "Basado en la muestra actual de ideas evaluadas. Este benchmark es direccional, no un ranking científico."
          : "Based on the current sample of evaluated ideas. This benchmark is directional, not a scientific ranking."}
      </p>
    </section>
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

function cleanStepMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^[-•]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^([^:]{2,80}):\s*/, "$1 — ")
    .trim();
}

function formatStrategicPlanSteps(plan: string) {
  const normalized = plan.replace(/\r\n/g, "\n").trim();
  const matches = Array.from(normalized.matchAll(/(?:^|\n)\s*(\d{1,2})[.)]\s+([\s\S]*?)(?=\n\s*\d{1,2}[.)]\s+|$)/g));

  if (matches.length > 0) {
    return matches.slice(0, 10).map((match, index) => ({
      number: Number(match[1]) || index + 1,
      text: cleanStepMarkdown(match[2]),
    }));
  }

  return normalized
    .split("\n")
    .map(cleanStepMarkdown)
    .filter(Boolean)
    .slice(0, 10)
    .map((text, index) => ({ number: index + 1, text }));
}

/* ---------- main page ---------- */
export default function HomeClient() {
  const [lang, setLang] = useState<Lang>("en");
  const [idea, setIdea] = useState("");
  const [market, setMarket] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [hideIdea, setHideIdea] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMarketStudyPreview, setShowMarketStudyPreview] = useState(false);
  const [proCheckoutLoading, setProCheckoutLoading] = useState(false);
  const [marketStudyCheckoutLoading, setMarketStudyCheckoutLoading] = useState(false);
  const [extraEvalCheckoutLoading, setExtraEvalCheckoutLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"limit" | "upgrade" | "claim-credit" | "default">("default");
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [evaluationMeta, setEvaluationMeta] = useState<EvaluationMeta | null>(null);
  const [pricing, setPricing] = useState<PricingDisplay | null>(null);
  const [claimShareCreditAfterAuth, setClaimShareCreditAfterAuth] = useState(false);
  const [shareCreditClaimed, setShareCreditClaimed] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [strategicPlan, setStrategicPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [ideaHistory, setIdeaHistory] = useState<HistoryEvaluation[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [savedCurrentResultKey, setSavedCurrentResultKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const s = t[lang];
  const marketStudyPriceDisplay = pricing?.marketStudy.display || "$29 USD";
  const marketStudyUpsellButton = lang === "es"
    ? `Obtener Estudio Completo — ${marketStudyPriceDisplay}`
    : `Get Full Study — ${marketStudyPriceDisplay}`;
  const isCurrentPro = Boolean(userSession?.isPro || userProfile?.is_pro || evaluationMeta?.isPro);
  const isProfileHydrating = Boolean(userSession && userProfile === null);
  const showHeaderUpgradeCta = !isProfileHydrating && !isCurrentPro;

  const hasSharedTodayForDisplay = userProfile && userProfile.last_share_date
    ? new Date(userProfile.last_share_date).toDateString() === new Date().toDateString()
    : false;
  const canClaimShareCredit = Boolean(
    evaluationMeta &&
    !isCurrentPro &&
    evaluationMeta.freeEvaluationsLeft === 0 &&
    !hasSharedTodayForDisplay &&
    !shareCreditClaimed
  );
  const shouldShowFinalFreeCta = Boolean(
    evaluationMeta &&
    !isCurrentPro &&
    evaluationMeta.freeEvaluationsLeft === 0
  );

  function renderTurnstile() {
    if (!NEXT_PUBLIC_TURNSTILE_SITE_KEY || !turnstileContainerRef.current || !window.turnstile || turnstileWidgetIdRef.current) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      theme: "dark",
      size: "compact",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  }

  function resetTurnstile() {
    if (!turnstileWidgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(turnstileWidgetIdRef.current);
    setTurnstileToken("");
  }

  async function refreshUserAndProfile() {
    if (!supabase) {
      console.error("Supabase client is not configured.");
      return null;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching Supabase session:", sessionError);
      return null;
    }

    if (!session) return null;

    const baseSession: UserSession = {
      token: session.access_token,
      email: session.user.email || "",
      userId: session.user.id,
      isPro: false,
    };
    setUserSession(baseSession);

    const { data: subscription, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("plan, status, extra_credits")
      .eq("user_id", session.user.id)
      .maybeSingle();

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: shareCredit } = await supabase
      .from("share_tokens")
      .select("created_at")
      .eq("sharer_user_id", session.user.id)
      .is("evaluation_id", null)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscriptionError) {
      const isPro = subscription?.plan === "pro" && (subscription?.status === "active" || subscription?.status === "trialing");
      setUserProfile({
        is_pro: isPro,
        free_evaluations_left: subscription?.extra_credits ?? 0,
        last_share_date: shareCredit?.created_at ?? null,
      });
      setShareCreditClaimed(Boolean(shareCredit?.created_at));
      if (isPro) await fetchIdeaHistory(session.user.id);
      else setIdeaHistory([]);
      const hydratedSession = { ...baseSession, isPro };
      setUserSession(hydratedSession);
      return hydratedSession;
    }

    console.error("Error fetching user subscription:", subscriptionError);
    return baseSession;
  }

  useEffect(() => {
    renderTurnstile();
  }, [userSession?.isPro, result]);

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      try {
        const res = await fetch("/api/pricing");
        const data = await res.json();
        if (!cancelled && data?.marketStudy?.display) {
          setPricing(data as PricingDisplay);
        }
      } catch {
        // Keep the hardcoded fallback in MarketStudyPreview if pricing lookup fails.
      }
    }

    loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  async function claimPendingShareCredit(token: string) {
    if (localStorage.getItem(PENDING_SHARE_CREDIT_KEY) !== "true") return;
    const granted = await claimShareCredit(token);
    if (granted) localStorage.removeItem(PENDING_SHARE_CREDIT_KEY);
  }

  function persistCurrentResultForCheckout() {
    if (!result) return;
    try {
      sessionStorage.setItem(CHECKOUT_RESULT_KEY, JSON.stringify({
        result,
        idea,
        market,
        email,
        lang,
        evaluationMeta,
      }));
    } catch (error) {
      console.warn("Could not persist open result before checkout:", error);
    }
  }

  function restoreCurrentResultFromCheckout() {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_RESULT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        result?: ScoreResult;
        idea?: string;
        market?: string;
        email?: string;
        lang?: Lang;
        evaluationMeta?: EvaluationMeta | null;
      };
      if (!saved.result) return;
      setResult(saved.result);
      setIdea(saved.idea || "");
      setMarket(saved.market || "");
      setEmail(saved.email || "");
      if (saved.lang === "en" || saved.lang === "es") {
        setLang(saved.lang);
        localStorage.setItem("lang", saved.lang);
      }
      setEvaluationMeta(saved.evaluationMeta || null);
      sessionStorage.removeItem(CHECKOUT_RESULT_KEY);
    } catch (error) {
      console.warn("Could not restore open result after checkout:", error);
      sessionStorage.removeItem(CHECKOUT_RESULT_KEY);
    }
  }

  // Load lang + session from localStorage and Supabase on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang === "en" || savedLang === "es") {
      setLang(savedLang);
    } else if (navigator.language?.toLowerCase().startsWith("es")) {
      setLang("es");
    }

    restoreCurrentResultFromCheckout();

    async function boot() {
      const session = await refreshUserAndProfile();
      if (session?.token) await claimPendingShareCredit(session.token);
      const params = new URLSearchParams(window.location.search);
      const checkoutSessionId = params.get("session_id");

      if (params.get("extra_eval") === "success" && checkoutSessionId && session?.token) {
        try {
          const response = await fetch("/api/stripe/extra-evaluation/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: checkoutSessionId, authToken: session.token }),
          });
          const data = await response.json();
          if (response.ok) {
            setUserProfile(prevProfile => ({
              is_pro: prevProfile?.is_pro ?? false,
              free_evaluations_left: data.extraCredits ?? Math.max(prevProfile?.free_evaluations_left ?? 0, 1),
              last_share_date: prevProfile?.last_share_date ?? null,
            }));
            setEvaluationMeta(prevMeta => prevMeta ? { ...prevMeta, freeEvaluationsLeft: data.extraCredits ?? Math.max(prevMeta.freeEvaluationsLeft, 1) } : prevMeta);
            await refreshUserAndProfile();
          } else {
            console.error("Could not confirm extra evaluation checkout:", data.error);
          }
        } catch (error) {
          console.error("Could not confirm extra evaluation checkout:", error);
        } finally {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      if (params.get("subscribed") === "true" && checkoutSessionId && session?.token) {
        try {
          const response = await fetch("/api/stripe/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: checkoutSessionId, authToken: session.token }),
          });
          const data = await response.json();
          if (response.ok && data.isPro) {
            setUserProfile(prevProfile => ({
              is_pro: true,
              free_evaluations_left: prevProfile?.free_evaluations_left ?? 0,
              last_share_date: prevProfile?.last_share_date ?? null,
            }));
            setUserSession(prev => prev ? { ...prev, isPro: true } : prev);
            await refreshUserAndProfile();
          } else if (!response.ok) {
            console.error("Could not confirm Pro checkout:", data.error);
          }
        } catch (error) {
          console.error("Could not confirm Pro checkout:", error);
        } finally {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    boot();
  }, []);

  useEffect(() => {
    function resetCheckoutLoading() {
      setProCheckoutLoading(false);
      setMarketStudyCheckoutLoading(false);
      setExtraEvalCheckoutLoading(false);
    }

    window.addEventListener("pageshow", resetCheckoutLoading);
    window.addEventListener("focus", resetCheckoutLoading);
    return () => {
      window.removeEventListener("pageshow", resetCheckoutLoading);
      window.removeEventListener("focus", resetCheckoutLoading);
    };
  }, []);

  function toggleLang() {
    const next = lang === "en" ? "es" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
  }

  async function handleAuthSuccess(token: string, authEmail: string, userId: string) {
    const session: UserSession = { token, email: authEmail, userId, isPro: false };
    setUserSession(session);
    localStorage.setItem("rmi_session", JSON.stringify(session));
    setShowAuthModal(false);
    const hydratedSession = await refreshUserAndProfile();
    if ((hydratedSession?.isPro || session.isPro) && result) {
      await saveCurrentResultToProHistory(hydratedSession || session);
    }
    if (claimShareCreditAfterAuth || localStorage.getItem(PENDING_SHARE_CREDIT_KEY) === "true") {
      setClaimShareCreditAfterAuth(false);
      void claimPendingShareCredit(token);
    }
  }

  async function handleSignOut() {
    await supabase?.auth.signOut();
    setUserSession(null);
    setUserProfile(null);
    setEvaluationMeta(null);
    setBenchmark(null);
    setStrategicPlan(null);
    setIdeaHistory([]);
    setSelectedHistoryId(null);
    setResult(null);
    setShareCreditClaimed(false);
    setClaimShareCreditAfterAuth(false);
    localStorage.removeItem("rmi_session");
    localStorage.removeItem(PENDING_SHARE_CREDIT_KEY);
    sessionStorage.removeItem(CHECKOUT_RESULT_KEY);
    turnstileWidgetIdRef.current = null;
    setTimeout(renderTurnstile, 0);
  }

  async function fetchBenchmark(score: number, category: string, categories?: ScoreResult["categories"]) {
    try {
      const params = new URLSearchParams({ score: String(score), category });
      if (categories?.length) params.set("subscores", JSON.stringify(categories.map(({ name, score }) => ({ name, score }))));
      const res = await fetch(`/api/benchmark?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.insufficient) setBenchmark(data);
      }
    } catch { /* non-critical */ }
  }

  async function fetchIdeaHistory(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("evaluations")
      .select("id, idea_name, idea_text, overall_score, category, created_at, result_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching Pro history:", error);
      return;
    }

    setIdeaHistory((data || []) as HistoryEvaluation[]);
  }

  async function saveCurrentResultToProHistory(session: UserSession) {
    if (!result || !session?.token) return;
    const currentKey = `${session.userId}:${idea.trim()}:${result.overall.toFixed(1)}`;
    if (savedCurrentResultKey === currentKey) return;

    try {
      const response = await fetch("/api/history/save-current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authToken: session.token,
          ideaText: idea.trim(),
          result,
          lang,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Could not save current result to Pro history:", data.error);
        return;
      }
      setSavedCurrentResultKey(currentKey);
      await fetchIdeaHistory(session.userId);
      if (data.id) setSelectedHistoryId(data.id);
    } catch (error) {
      console.error("Could not save current result to Pro history:", error);
    }
  }

  function selectHistoryEvaluation(item: HistoryEvaluation) {
    setSelectedHistoryId(item.id);
    setIdea(item.idea_text);
    setStrategicPlan(null);
    setBenchmark(null);
    if (item.result_json) {
      setResult(item.result_json);
      setEvaluationMeta({ isPro: true, freeEvaluationsUsed: 0, freeEvaluationsLeft: 0 });
      if (item.result_json.category) void fetchBenchmark(item.result_json.overall, item.result_json.category, item.result_json.categories);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }

  async function handleGeneratePlan() {
    if (!userSession) {
      setAuthModalMode("upgrade");
      setShowAuthModal(true);
      return;
    }
    if (!result) return;
    setPlanLoading(true);
    try {
      const res = await fetch("/api/strategic-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText: idea.trim(),
          ideaName: result.ideaName,
          lang,
          authToken: userSession.token,
        }),
      });
      const data = await res.json();
      if (data.plan) setStrategicPlan(data.plan);
      else setError(data.error || "Could not generate plan.");
    } catch {
      setError("Could not generate plan. Try again.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    const detectedIdeaLang = detectIdeaLanguage(idea.trim());
    if (detectedIdeaLang !== lang) {
      setLang(detectedIdeaLang);
      localStorage.setItem("lang", detectedIdeaLang);
    }

    setLoading(true);
    setError("");
    setResult(null);
    setEvaluationMeta(null);
    setBenchmark(null);
    setStrategicPlan(null);
    setSavedCurrentResultKey(null);

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          market: market.trim() || undefined,
          email: email.trim() || undefined,
          lang: detectedIdeaLang,
          authToken: userSession?.token,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "limit_reached") {
          setAuthModalMode("limit");
          setShowAuthModal(true);
        } else {
          setError(getErrorMessage(errData.message ?? errData.error, "Too many requests. Try again later."));
        }
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(getErrorMessage(errData.error ?? errData.message, "Something went wrong. Try again."));
      }

      const data = await res.json();
      setResult(data);
      setEvaluationMeta({
        isPro: Boolean(data.isPro),
        freeEvaluationsUsed: data.freeEvaluationsUsed ?? 0,
        freeEvaluationsLeft: data.freeEvaluationsLeft ?? 0,
      });
      if (userSession && data.isPro) {
        setUserProfile(prevProfile => ({
          is_pro: true,
          free_evaluations_left: prevProfile?.free_evaluations_left ?? 0,
          last_share_date: prevProfile?.last_share_date ?? null,
        }));
        setUserSession(prev => prev ? { ...prev, isPro: true } : prev);
        void fetchIdeaHistory(userSession.userId);
      } else if (userSession && !data.isPro) {
        setUserProfile(prevProfile => ({
          is_pro: false,
          free_evaluations_left: data.freeEvaluationsLeft ?? prevProfile?.free_evaluations_left ?? 0,
          last_share_date: prevProfile?.last_share_date ?? null,
        }));
      }

      // Pro-only benchmark
      if ((userSession?.isPro || data.isPro) && data.category) fetchBenchmark(data.overall, data.category, data.categories);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong."));
    } finally {
      resetTurnstile();
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

  function getShareCardUrl() {
    if (!result) return "/api/share-card";
    const params = new URLSearchParams({ score: result.overall.toFixed(1) });
    if (result.keywords?.length) params.set("keywords", result.keywords.join(","));
    if (hideIdea) {
      params.set("hidden", "1");
    } else if (result.ideaName) {
      params.set("name", result.ideaName);
    }
    return `/api/share-card?${params.toString()}`;
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
      const res = await fetch(getShareCardUrl());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ratemyidea-${result?.overall.toFixed(1) || "score"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(getShareCardUrl(), "_blank");
    }
  }

  async function getShareImage(): Promise<File | null> {
    try {
      const res = await fetch(getShareCardUrl());
      const blob = await res.blob();
      return new File([blob], "ratemyidea.png", { type: "image/png" });
    } catch {
      return null;
    }
  }

  async function claimShareCredit(token = userSession?.token) {
    if (!token) return false;
    try {
      const response = await fetch("/api/share-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setShareCreditClaimed(true);
        setUserProfile(prevProfile => prevProfile ? {
          ...prevProfile,
          free_evaluations_left: data.freeEvaluationsLeft !== undefined ? data.freeEvaluationsLeft : prevProfile.free_evaluations_left + 1,
          last_share_date: data.lastShareDate ?? new Date().toISOString(),
        } : {
          is_pro: false,
          free_evaluations_left: data.freeEvaluationsLeft ?? 1,
          last_share_date: data.lastShareDate ?? new Date().toISOString(),
        });
        setEvaluationMeta(prevMeta => prevMeta ? {
          ...prevMeta,
          freeEvaluationsLeft: data.freeEvaluationsLeft ?? Math.max(prevMeta.freeEvaluationsLeft, 1),
        } : prevMeta);
        return true;
      }
      console.error("Error al otorgar crédito por compartir:", data.error);
    } catch (error) {
      console.error("Error de red al llamar a /api/share-credit:", error);
    }
    return false;
  }

  async function handlePostShareCreditClaim() {
    if (!canClaimShareCredit) return;
    if (!userSession) {
      localStorage.setItem(PENDING_SHARE_CREDIT_KEY, "true");
      setClaimShareCreditAfterAuth(true);
      setAuthModalMode("claim-credit");
      setShowShareModal(false);
      setShowAuthModal(true);
      return;
    }
    await claimShareCredit(userSession.token);
  }

  async function handleShareWithImage(target?: "whatsapp" | "twitter" | "linkedin") {
    const file = await getShareImage();
    const text = getShareText();

    // Try native share with image (works great on mobile)
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          text,
          files: [file],
        });
        await handlePostShareCreditClaim();
        return;
      } catch {
        // User cancelled or error — fall through to platform-specific
      }
    }

    // Fallback to platform-specific (text only, but better than nothing)
    const encodedText = encodeURIComponent(text);
    switch (target) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodedText}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://ratemyidea.ai")}`, "_blank");
        break;
      default:
        if (file) {
          await handleDownloadImage();
        }
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    }
    await handlePostShareCreditClaim();
  }

  function handleCopyText() {
    navigator.clipboard.writeText(getShareText());
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  async function startProCheckout() {
    if (!userSession) {
      setAuthModalMode("upgrade");
      setShowAuthModal(true);
      return;
    }

    setProCheckoutLoading(true);
    setError("");
    persistCurrentResultForCheckout();
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userSession?.email || email.trim() || undefined,
          userId: userSession?.userId,
          lang,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start Pro checkout. Please try again.");
        setProCheckoutLoading(false);
      }
    } catch {
      setError("Could not start Pro checkout. Please try again.");
      setProCheckoutLoading(false);
    }
  }

  async function startExtraEvaluationCheckout() {
    if (!userSession) {
      setAuthModalMode("default");
      setShowAuthModal(true);
      return;
    }

    setExtraEvalCheckoutLoading(true);
    setError("");
    persistCurrentResultForCheckout();
    try {
      const res = await fetch("/api/stripe/extra-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authToken: userSession.token,
          email: userSession.email || email.trim() || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Could not start extra evaluation checkout. Please try again.");
        setExtraEvalCheckoutLoading(false);
      }
    } catch {
      setError("Could not start extra evaluation checkout. Please try again.");
      setExtraEvalCheckoutLoading(false);
    }
  }

  async function startMarketStudyCheckout() {
    setMarketStudyCheckoutLoading(true);
    setError("");
    persistCurrentResultForCheckout();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: idea.trim(),
          market: market.trim() || undefined,
          lang,
          email: email.trim() || undefined,
          freeResult: result ? { overall: result.overall, ideaName: result.ideaName } : undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed. Please try again.");
        setMarketStudyCheckoutLoading(false);
      }
    } catch {
      setError("Could not start checkout. Please try again.");
      setMarketStudyCheckoutLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setIdea("");
    setMarket("");
    setEmail("");
    setError("");
    setHideIdea(false);
    setEvaluationMeta(null);
    setBenchmark(null);
    setStrategicPlan(null);
    sessionStorage.removeItem(CHECKOUT_RESULT_KEY);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen grid-bg">
      {NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={renderTurnstile}
        />
      )}
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              aria-label="Go to Rate My Idea home"
              onClick={(e) => {
                e.preventDefault();
                handleReset();
              }}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <span className="text-xl">🧠</span>
              <span className="font-bold text-lg tracking-tight">
                {s.brand}
              </span>
            </a>
            <a
              href="https://ai-norte.com"
              className="items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--electric-light)] transition-colors hidden sm:flex"
              target="_blank" rel="noopener"
            >
              <span>by</span>
              <img src="/ainorte-logo.svg" alt="AI Norte" className="h-4 w-4" />
              <span className="text-[var(--electric-light)]">AI Norte</span>
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLang}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span className={lang === "en" ? "text-[var(--text-primary)]" : ""}>EN</span>
              <span className="mx-1 text-[var(--text-muted)]">|</span>
              <span className={lang === "es" ? "text-[var(--text-primary)]" : ""}>ES</span>
            </button>

            {showHeaderUpgradeCta && (
              <button
                onClick={startProCheckout}
                disabled={proCheckoutLoading}
                className="inline-flex cursor-pointer items-center justify-center rounded-full border border-amber-300/30 bg-gradient-to-r from-amber-300/25 to-yellow-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-100 shadow-lg shadow-amber-300/20 transition-all hover:border-amber-200/60 hover:from-amber-300/35 disabled:opacity-60 sm:px-4"
              >
                {proCheckoutLoading ? (
                  lang === "es" ? "..." : "..."
                ) : lang === "es" ? (
                  <>
                    <span className="sm:hidden">Pro</span>
                    <span className="hidden sm:inline">Obtener cuenta Pro</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Pro</span>
                    <span className="hidden sm:inline">Get Pro account</span>
                  </>
                )}
              </button>
            )}

            {userSession ? (
              <div className="flex items-center gap-2">
                {isCurrentPro && (
                  <>
                    <a
                      href="#pro-history"
                      className="hidden items-center rounded-xl bg-[var(--electric)] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-[var(--electric)]/20 transition-all hover:bg-[var(--electric-dark)] sm:inline-flex"
                    >
                      Idea history
                    </a>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-amber-100">✨ Pro member</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <button
                        onClick={handleSignOut}
                        className="max-w-24 truncate font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        {userSession.email.split("@")[0]}
                      </button>
                    </div>
                  </>
                )}
                {!isCurrentPro && (
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer max-w-24 truncate"
                  >
                    {userSession.email.split("@")[0]}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setAuthModalMode("default"); setShowAuthModal(true); }}
                className="text-xs font-medium px-3 py-1.5 bg-[var(--surface)] border border-white/10 rounded-lg text-[var(--text-secondary)] hover:border-[var(--electric)]/50 transition-all cursor-pointer"
              >
                {lang === "es" ? "Iniciar sesión" : "Sign in"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero + Form */}
      <main className="pt-28 pb-20 px-6">
        <div className={`mx-auto ${isCurrentPro ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6" : "max-w-2xl"}`}>
          <div className="min-w-0">
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
                  htmlFor="market"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {lang === "es" ? "Mercado / ubicación" : "Market / location"}{" "}
                  <span className="text-[var(--text-muted)]">{lang === "es" ? "(opcional)" : "(optional)"}</span>
                </label>
                <input
                  id="market"
                  type="text"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  placeholder={lang === "es" ? "ej. México, LATAM, Monterrey, online/global" : "e.g. Mexico, LATAM, USA, online/global"}
                  maxLength={80}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-white/10 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--electric)] focus:border-transparent transition-all"
                />
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  {lang === "es" ? "Si lo dejas vacío, asumimos un mercado general y lo diremos en el análisis." : "If you leave it blank, we assume a general market and state that in the analysis."}
                </p>
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

              {NEXT_PUBLIC_TURNSTILE_SITE_KEY && !userSession?.isPro && (
                <div className="flex flex-col items-end gap-1 pt-1">
                  <div className="scale-90 origin-top-right opacity-85 transition-opacity hover:opacity-100">
                    <div ref={turnstileContainerRef} />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Anti-abuse check
                  </span>
                </div>
              )}
            </form>
          )}

          {/* Results */}
          {result && (
            <div ref={resultRef} className="scroll-mt-28 space-y-8 animate-fade-up">
              {isCurrentPro && (
                <section
                  data-testid="pro-result-panel"
                  className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-300/15 via-[var(--surface)] to-[var(--electric)]/10 p-6 shadow-2xl shadow-amber-300/10"
                >
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200">
                        ✨ Pro analysis unlocked
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
                        {lang === "es" ? "Tu evaluación Pro está lista" : "Your Pro evaluation is ready"}
                      </h2>
                      <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
                        {lang === "es"
                          ? "Además del score base, esta vista conecta benchmark, historial y plan de acción para decidir el siguiente movimiento."
                          : "Beyond the base score, this view connects benchmark, history, and an action plan so you can decide the next move."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-64">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="font-semibold text-amber-100">Benchmark included</p>
                        <p className="mt-1 text-[var(--text-muted)]">{lang === "es" ? "Comparación activa" : "Comparison active"}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="font-semibold text-amber-100">10-step plan ready</p>
                        <p className="mt-1 text-[var(--text-muted)]">{lang === "es" ? "Créditos Pro" : "Pro credits"}</p>
                      </div>
                      <a
                        href="#pro-history"
                        className="col-span-2 rounded-xl bg-[var(--electric)] px-4 py-2.5 text-center text-xs font-bold text-white transition-all hover:bg-[var(--electric-dark)]"
                      >
                        {lang === "es" ? "Ver historial Pro" : "View Pro history"}
                      </a>
                    </div>
                  </div>
                </section>
              )}

              {/* Score card + share actions */}
              <div data-testid="score-share-card" className="bg-[var(--surface)] border border-white/10 rounded-3xl p-6 text-center shadow-xl shadow-black/10 sm:p-8">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {s.yourScore}
                </p>
                {result.badge && (
                  <div className="mb-5 flex justify-center">
                    <span
                      className="rounded-full px-4 py-1.5 text-sm font-bold"
                      style={{ color: result.badge.color, backgroundColor: result.badge.bg, border: `1px solid ${result.badge.color}40` }}
                    >
                      {result.badge.emoji} {result.badge.label}
                    </span>
                  </div>
                )}
                <ScoreRing score={result.overall} />

                <div className="mt-6 space-y-4">
                  <h2 className="mx-auto max-w-2xl truncate text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                    {hideIdea ? (lang === "es" ? "🔒 Idea oculta" : "🔒 Idea hidden") : result.ideaName}
                  </h2>

                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <label className="scoreHideIdeaToggle group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-[var(--electric)]/40 hover:bg-white/5">
                      <span className="relative inline-flex h-6 w-11 items-center">
                        <input
                          type="checkbox"
                          checked={hideIdea}
                          onChange={(e) => setHideIdea(e.target.checked)}
                          aria-label={hideIdea ? (lang === "es" ? "Mostrar idea" : "Show idea") : (lang === "es" ? "Ocultar idea" : "Hide idea")}
                          className="sr-only peer"
                        />
                        <span className="absolute inset-0 rounded-full border border-white/10 bg-[var(--surface-light)] transition-colors peer-checked:bg-[var(--electric)]" />
                        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]">
                        <span aria-hidden="true">{hideIdea ? "🔓" : "🔒"}</span>{" "}
                        {hideIdea
                          ? (lang === "es" ? "Mostrar idea" : "Show idea")
                          : (lang === "es" ? "Ocultar idea" : "Hide idea")}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowShareModal(true)}
                      aria-label={lang === "es" ? "Abrir preview para compartir score card" : "Open score card share preview"}
                      className="scorePrimaryShareButton inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--electric)] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--electric)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--electric-dark)] hover:shadow-[0_0_24px_rgba(108,58,255,0.38)] focus:outline-none focus:ring-2 focus:ring-[var(--electric-light)]/60"
                    >
                      📤 {lang === "es" ? "Compartir" : "Share"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
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

              {result.basicBenchmark && (
                <BasicBenchmarkCard benchmark={result.basicBenchmark} userScore={result.overall} lang={lang} />
              )}

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



              {/* Benchmark */}
              {isCurrentPro && benchmark && (
                <section className="rounded-3xl border border-amber-300/20 bg-[var(--surface)] p-5 shadow-xl shadow-black/10">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Pro insight benchmark</p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        {lang === "es" ? "Cómo se compara esta idea" : "How this idea compares"}
                      </h3>
                    </div>
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {lang === "es" ? "Solo Pro" : "Pro only"}
                    </span>
                  </div>
                  <BenchmarkChart data={benchmark} userScore={result.overall} lang={lang} />
                </section>
              )}

              {/* Strategic Plan */}
              {strategicPlan ? (
                <section className="rounded-3xl border border-amber-300/20 bg-[var(--surface)] p-5 shadow-xl shadow-black/10">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                        {lang === "es" ? "Plan de acción Pro" : "Pro action plan"}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                        🧭 {lang === "es" ? "10 siguientes pasos" : "10-step action plan"}
                      </h3>
                    </div>
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      {lang === "es" ? "Solo Pro" : "Pro only"}
                    </span>
                  </div>
                  <ol className="space-y-3">
                    {formatStrategicPlanSteps(strategicPlan).map((step) => (
                      <li
                        key={`${step.number}-${step.text}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-[var(--electric)]/15 px-2.5 py-1 text-xs font-bold text-[var(--electric-light)]">
                            {lang === "es" ? `Paso ${step.number}` : `Step ${step.number}`}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                          {step.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : isCurrentPro ? (
                <div className="relative overflow-hidden rounded-3xl border border-[var(--electric)]/30 bg-gradient-to-br from-[var(--electric)]/20 via-[var(--surface)] to-amber-300/10 p-6 text-center shadow-xl shadow-[var(--electric)]/10">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--electric-light)]">
                    {lang === "es" ? "Siguiente movimiento" : "Next move"}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {lang === "es" ? "Construye el plan de acción de 10 pasos" : "Build the 10-step action plan"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                    {lang === "es"
                      ? "Convierte esta evaluación en una secuencia concreta de decisiones, pruebas y entregables."
                      : "Turn this evaluation into a concrete sequence of decisions, tests, and deliverables."}
                  </p>
                  <button
                    onClick={handleGeneratePlan}
                    disabled={planLoading}
                    className="mt-5 px-7 py-3 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-50 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm glow-pulse"
                  >
                    {planLoading ? "Generating..." : (lang === "es" ? "🧭 Generar 10 pasos" : "🧭 Generate 10 steps")}
                  </button>
                </div>
              ) : null}

              {/* Pro CTA for free users */}
              {!isCurrentPro && (() => {
                const upsell = getProUpsellCopy(result.overall, lang);
                const cards = getProUpsellCards(lang);
                return (
                  <section className="relative overflow-hidden rounded-3xl border border-[var(--electric)]/25 bg-gradient-to-br from-[var(--electric)]/15 via-[var(--surface)] to-amber-300/10 p-6 shadow-xl shadow-[var(--electric)]/10">
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--electric)]/20 blur-3xl" />
                    <div className="relative space-y-5">
                      <div className="max-w-4xl">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--electric-light)]">
                          {lang === "es" ? "Mejorar esta idea con Pro" : "Make this idea stronger with Pro"}
                        </p>
                        <h3 className="mt-2 text-2xl font-black leading-tight text-[var(--text-primary)]">
                          {upsell.headline}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {upsell.body}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {cards.map((card) => (
                          <div key={card.title} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-xl">{card.icon}</span>
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">{card.title}</h4>
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{card.body}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row lg:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {lang === "es" ? "$9 USD/mes · cancela cuando quieras" : "$9/mo · cancel anytime"}
                        </p>
                        <button
                          onClick={startProCheckout}
                          disabled={proCheckoutLoading}
                          className="w-full rounded-2xl bg-[var(--electric)] px-6 py-4 text-base font-black text-white shadow-lg shadow-[var(--electric)]/25 transition-all hover:-translate-y-0.5 hover:bg-[var(--electric-dark)] hover:shadow-[0_0_32px_rgba(108,58,255,0.45)] disabled:opacity-50 cursor-pointer sm:w-auto sm:min-w-56"
                        >
                          {proCheckoutLoading
                            ? (lang === "es" ? "Redirigiendo..." : "Redirecting...")
                            : (lang === "es" ? "Mejorar con Pro" : "Unlock Pro analysis")}
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {!isCurrentPro && (
                <section data-testid="locked-pro-benchmark-preview" className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-[var(--surface)] shadow-xl shadow-black/10">
                  <div className="proBenchmarkPreviewHero pointer-events-none relative min-h-[25rem] select-none overflow-hidden p-5 pb-0">
                    <div className="proBenchmarkPreviewHeader relative z-10 mb-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                        {lang === "es" ? "Benchmark Pro" : "Pro benchmark"}
                      </span>
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
                        🔒 {lang === "es" ? "Bloqueado" : "Locked"}
                      </span>
                      <span className="rounded-full border border-[var(--electric)]/25 bg-[var(--electric)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--electric-light)]">Pro</span>
                    </div>

                    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/20 p-5 shadow-2xl shadow-black/20">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
                            {lang === "es" ? "Comparación visible antes del blur" : "Visible comparison before blur"}
                          </p>
                          <div className="h-4 w-44 rounded-full bg-white/25" />
                        </div>
                        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-center">
                          <p className="text-2xl font-black text-amber-100">Top 18%</p>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">Percentile</p>
                        </div>
                      </div>
                      <div className="flex h-24 items-end gap-1.5">
                        {[22, 38, 54, 82, 68, 46, 34, 24, 14].map((height, index) => (
                          <div key={index} className="flex-1 rounded-t border border-white/5 bg-[var(--surface-light)]" style={{ height: `${height}%`, backgroundColor: index === 4 ? "var(--electric)" : undefined }} />
                        ))}
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="h-20 rounded-xl border border-green-400/15 bg-green-400/5" />
                        <div className="h-20 rounded-xl border border-amber-300/15 bg-amber-300/5" />
                      </div>
                    </div>

                    <div className="blurredProBenchmarkSurface absolute inset-x-0 bottom-0 h-52 bg-gradient-to-b from-transparent via-[var(--surface)]/80 to-[var(--surface)] backdrop-blur-[2px]" />
                    <div className="relative z-10 mx-auto -mt-8 max-w-xl px-1 pb-6 text-center sm:text-left">
                      <h3 className="text-xl font-black text-[var(--text-primary)]">
                        {lang === "es" ? "Comparación avanzada" : "Advanced comparison"}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {lang === "es"
                          ? "Desbloquea una comparación con gráfica de barras, percentil, señales fuertes/débiles y palancas concretas para subir de posición."
                          : "Unlock a bar-chart comparison, percentile, stronger/weaker signals, and concrete levers to improve your position."}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Upsell — Market Study */}
              <div className="bg-gradient-to-r from-[var(--electric)]/20 to-purple-500/20 border border-[var(--electric)]/30 rounded-2xl p-6 text-center">
                <h3 className="font-bold text-lg mb-2">
                  {s.upsellTitle}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {s.upsellDesc}
                </p>
                <button
                  disabled={marketStudyCheckoutLoading}
                  onClick={() => setShowMarketStudyPreview(true)}
                  className="px-8 py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] disabled:opacity-60 text-white font-semibold rounded-xl transition-all cursor-pointer glow-pulse text-lg"
                >
                  {marketStudyCheckoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {lang === "es" ? "Redirigiendo al pago..." : "Redirecting to checkout..."}
                    </span>
                  ) : (
                    marketStudyUpsellButton
                  )}
                </button>
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

              {/* Share + Try Again */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="group relative flex-1">
                  <button
                    onClick={() => setShowShareModal(true)}
                    aria-describedby={canClaimShareCredit ? "share-credit-tooltip" : undefined}
                    className="w-full rounded-xl border border-white/10 bg-[var(--surface)] px-5 py-3 font-medium text-[var(--text-primary)] transition-all hover:border-[var(--electric)]/50 hover:bg-white/5 cursor-pointer"
                  >
                    📤 {s.shareScore}
                  </button>
                  {canClaimShareCredit && (
                    <span
                      id="share-credit-tooltip"
                      role="tooltip"
                      className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-green-400/25 bg-green-400/10 px-3 py-1 text-xs font-semibold text-green-300 opacity-0 shadow-lg shadow-black/20 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      {lang === "es" ? "+1 evaluación gratis" : "+1 free evaluation"}
                    </span>
                  )}
                </div>
                <button
                  onClick={shouldShowFinalFreeCta ? () => startExtraEvaluationCheckout() : handleReset}
                  className={`flex-1 rounded-xl border px-5 py-3 font-medium transition-all cursor-pointer
                    ${shouldShowFinalFreeCta
                      ? "bg-[var(--electric)] border-[var(--electric)] text-white hover:bg-[var(--electric-dark)] hover:shadow-[0_0_24px_rgba(108,58,255,0.35)]"
                      : "bg-[var(--surface)] border-white/10 text-[var(--text-primary)] hover:border-[var(--electric)]/50 hover:bg-white/5"}
                  `}
                  disabled={extraEvalCheckoutLoading}
                >
                  <span className="flex items-center justify-center gap-2">
                    {shouldShowFinalFreeCta ? (
                      extraEvalCheckoutLoading ? (
                        lang === "es" ? "Redirigiendo..." : "Redirecting..."
                      ) : (
                        <>
                          <span>{lang === "es" ? "Comprar otra" : "Buy another"}</span>
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">$1 USD</span>
                        </>
                      )
                    ) : (
                      <>🔄 {s.rateAnother}</>
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Social proof / stats */}
          {!result && (
            <div className="mt-16 space-y-5 text-center">
              <div className="grid grid-cols-3 gap-4">
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
              <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[var(--surface)]/70 px-4 py-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {lang === "es" ? "Privado por defecto." : "Private by default."} <span className="text-[var(--text-secondary)]">{lang === "es" ? "No vendemos, publicamos ni usamos tus ideas para construir negocios competidores." : "We don’t sell, publish, or use your ideas to build competing businesses."}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {lang === "es" ? "Las evaluaciones pueden guardarse solo para mostrar resultados, historial y mejorar el producto." : "Evaluations may be stored only to provide your results, history, and improve the product."}
                </p>
              </div>
            </div>
          )}
          </div>

          {isCurrentPro && (
            <aside id="pro-history" className="scroll-mt-28 mt-8 rounded-3xl border border-white/10 bg-[var(--surface)]/80 p-5 shadow-xl shadow-black/10 lg:sticky lg:top-24 lg:mt-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Pro history</p>
                  <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                    {lang === "es" ? "Historial de ideas" : "Idea history"}
                  </h2>
                </div>
                <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs text-[var(--text-muted)]">
                  {ideaHistory.length}
                </span>
              </div>

              {ideaHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm text-[var(--text-muted)]">
                  {lang === "es" ? "Tus evaluaciones Pro aparecerán aquí después de correrlas." : "Your Pro evaluations will appear here after you run them."}
                </div>
              ) : (
                <div className="grid gap-2">
                  {ideaHistory.map((item) => {
                    const active = selectedHistoryId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectHistoryEvaluation(item)}
                        className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${active
                          ? "border-[var(--electric)]/60 bg-[var(--electric)]/10"
                          : "border-white/10 bg-black/20 hover:border-[var(--electric)]/30"}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {item.idea_name || item.idea_text.slice(0, 56)}
                          </span>
                          <span className="text-sm font-bold text-amber-100">
                            {(item.overall_score || 0).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                          <span>{item.category || "Idea"}</span>
                          <span>{new Date(item.created_at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          onUpgrade={startProCheckout}
          isAuthenticated={Boolean(userSession)}
          mode={authModalMode}
          lang={lang}
        />
      )}

      {/* Market Study Preview Modal */}
      {showMarketStudyPreview && result && (
        <MarketStudyPreview
          lang={lang}
          result={result}
          loading={marketStudyCheckoutLoading}
          pricing={pricing}
          onClose={() => setShowMarketStudyPreview(false)}
          onCheckout={startMarketStudyCheckout}
        />
      )}

      {/* Share Modal */}
      {showShareModal && result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
        >
          <div className="bg-[var(--surface)] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="font-semibold text-lg">{s.shareScore}</h3>
              <button
                onClick={() => setShowShareModal(false)}
                aria-label={lang === "es" ? "Cerrar preview de compartir" : "Close share preview"}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Share card preview — square, fills modal */}
            <div className="px-3 pb-4">
              <div className="rounded-2xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={hideIdea ? "hidden" : "visible"}
                  src={getShareCardUrl()}
                  alt="Share card preview"
                  width={1080}
                  height={1080}
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Hide idea toggle */}
            <div className="px-5 pb-4">
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
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--electric-light)] transition-colors">
                  🔒 {s.hideIdea}
                </span>
              </label>
            </div>

              {/* Share + Save buttons */}
            <div className="px-4 pb-3 space-y-2">
              {canClaimShareCredit && (
                <div className="shareCreditBadgeAboveCta flex justify-center">
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                    {lang === "es" ? "+1 evaluación gratis al compartir" : "+1 free evaluation after sharing"}
                  </span>
                </div>
              )}
              {/* Main share button with social logos */}
              <button
                onClick={() => handleShareWithImage()}
                className="w-full py-4 bg-[var(--electric)] hover:bg-[var(--electric-dark)] text-white font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3 text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {lang === "es" ? "Enviar" : "Send"}
                <span className="flex items-center gap-2 ml-1 opacity-70">
                  {/* X */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  {/* WhatsApp */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  {/* LinkedIn */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </span>
              </button>

              {/* Secondary row: Save + Copy */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-white/10 rounded-xl hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                  <span className="text-sm text-[var(--text-secondary)]">{lang === "es" ? "Guardar" : "Save"}</span>
                </button>
                <button
                  onClick={handleCopyText}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--surface-light)] border border-white/10 rounded-xl hover:border-[var(--electric)]/50 transition-all cursor-pointer"
                >
                  {shared ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  )}
                  <span className="text-sm text-[var(--text-secondary)]">{shared ? "✓" : (lang === "es" ? "Copiar texto" : "Copy text")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-2 sm:items-start">
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
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:justify-start">
              <a href="/privacy" className="hover:text-[var(--electric-light)] transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-[var(--electric-light)] transition-colors">Terms</a>
              <a href="mailto:tars@ai-norte.com" className="hover:text-[var(--electric-light)] transition-colors">Contact</a>
            </nav>
          </div>
          <span>{s.footerTagline}</span>
        </div>
      </footer>
    </div>
  );
}
