"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

interface Competitor {
  name: string;
  description: string;
  strengths: string;
  weaknesses: string;
  pricing: string;
  marketShare: string;
}

interface Risk {
  risk: string;
  likelihood: string;
  impact: string;
  mitigation: string;
}

interface LaunchPhase {
  phase: string;
  timeline: string;
  actions: string[];
}

interface Channel {
  channel: string;
  priority: string;
  rationale: string;
}

interface StudyData {
  ideaName: string;
  executiveSummary: string;
  marketAnalysis: {
    overview: string;
    tam: string;
    sam: string;
    som: string;
    trends: string[];
    drivers: string[];
  };
  competitorAnalysis: {
    overview: string;
    competitors: Competitor[];
    gaps: string[];
  };
  targetAudience: {
    primaryPersona: {
      name: string;
      demographics: string;
      painPoints: string[];
      goals: string[];
      channels: string[];
    };
    secondaryPersona: {
      name: string;
      demographics: string;
      painPoints: string[];
      goals: string[];
      channels: string[];
    };
  };
  goToMarket: {
    positioning: string;
    pricingStrategy: string;
    channels: Channel[];
    launchPlan: LaunchPhase[];
  };
  financialProjections: {
    assumptions: string[];
    year1: { revenue: string; costs: string; margin: string };
    year2: { revenue: string; costs: string; margin: string };
    breakeven: string;
    fundingNeeds: string;
  };
  riskAssessment: Risk[];
  verdict: {
    score: number;
    recommendation: string;
    summary: string;
    keyInsight: string;
  };
  sources: { title: string; url: string; domain: string }[];
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-white/10 rounded-2xl p-6 md:p-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
    go: "bg-green-500/20 text-green-400 border-green-500/30",
    caution: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    pivot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    pass: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[color] || colors.medium}`}>
      {text}
    </span>
  );
}

function StudyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [study, setStudy] = useState<StudyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load study");
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStudy(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const loadingMessages = [
    "Scanning market databases...",
    "Interviewing 3,002 imaginary experts...",
    "Analyzing competitor weak spots...",
    "Crunching numbers that would make Excel cry...",
    "Cross-referencing industry reports...",
    "Teaching AI about your niche...",
    "Finishing the 47th cup of digital coffee...",
    "Building financial projections...",
    "Finding the market gaps nobody talks about...",
    "Almost there — polishing the final details...",
  ];

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => Math.min(prev + 1, loadingMessages.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [loading, loadingMessages.length]);

  if (loading) {
    return (
      <main className="min-h-screen grid-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 border-4 border-[var(--electric)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">Preparing your market study</p>
          <p className="text-[var(--text-secondary)] mb-2 h-6 transition-opacity duration-500">
            {loadingMessages[loadingMsgIndex]}
          </p>
          <div className="mt-6 w-full bg-[var(--surface-light)] rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-[var(--electric)] rounded-full animate-pulse" style={{ width: `${Math.min(95, (loadingMsgIndex + 1) * 10)}%`, transition: "width 2s ease" }} />
          </div>
        </div>
      </main>
    );
  }

  if (error || !study) {
    return (
      <main className="min-h-screen grid-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-5xl mb-4">⚠️</p>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-[var(--text-secondary)] mb-6">{error || "Could not load your study"}</p>
          <a href="/" className="px-6 py-3 bg-[var(--electric)] text-white rounded-xl font-semibold">
            Back to Rate My Idea
          </a>
        </div>
      </main>
    );
  }

  const recColor = study.verdict.recommendation;

  return (
    <main className="min-h-screen grid-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--midnight)]/80 backdrop-blur-xl border-b border-white/5 print:hidden">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-lg tracking-tight">Rate My Idea</span>
          </div>
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--electric-light)] transition-colors">
            ← Rate another idea
          </a>
        </div>
      </nav>

      <div className="pt-24 pb-20 px-4 md:px-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm text-[var(--electric-light)] uppercase tracking-wider mb-2">Complete Market Study</p>
          <h1 className="text-3xl md:text-4xl font-bold">{study.ideaName}</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-4xl font-bold" style={{
              color: study.verdict.score >= 7.5 ? "var(--accent-green)" : study.verdict.score >= 5 ? "var(--accent-yellow)" : "var(--accent-red)"
            }}>
              {study.verdict.score.toFixed(1)}/10
            </span>
            <Badge text={study.verdict.recommendation.toUpperCase()} color={recColor} />
          </div>
        </div>

        {/* Executive Summary */}
        <Section title="Executive Summary" icon="📋">
          <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">{study.executiveSummary}</p>
        </Section>

        {/* Market Analysis */}
        <Section title="Market Analysis" icon="📊">
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">{study.marketAnalysis.overview}</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "TAM", value: study.marketAnalysis.tam },
              { label: "SAM", value: study.marketAnalysis.sam },
              { label: "SOM", value: study.marketAnalysis.som },
            ].map((m) => (
              <div key={m.label} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <p className="text-xs text-[var(--electric-light)] font-semibold mb-1">{m.label}</p>
                <p className="text-sm text-[var(--text-secondary)]">{m.value}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">📈 Trends</h3>
              <ul className="space-y-1">{study.marketAnalysis.trends.map((t, i) => (
                <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2"><span className="text-[var(--electric)] shrink-0">→</span>{t}</li>
              ))}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🚀 Growth Drivers</h3>
              <ul className="space-y-1">{study.marketAnalysis.drivers.map((d, i) => (
                <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2"><span className="text-green-400 shrink-0">▲</span>{d}</li>
              ))}</ul>
            </div>
          </div>
        </Section>

        {/* Competitor Analysis */}
        <Section title="Competitor Analysis" icon="⚔️">
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">{study.competitorAnalysis.overview}</p>
          <div className="space-y-4 mb-6">
            {study.competitorAnalysis.competitors.map((c, i) => (
              <div key={i} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[var(--text-primary)]">{c.name}</h4>
                  {c.pricing && <span className="text-xs text-[var(--text-muted)]">{c.pricing}</span>}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{c.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-green-400">+</span> <span className="text-[var(--text-muted)]">{c.strengths}</span></div>
                  <div><span className="text-red-400">−</span> <span className="text-[var(--text-muted)]">{c.weaknesses}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">🎯 Market Gaps</h3>
            <ul className="space-y-1">{study.competitorAnalysis.gaps.map((g, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2"><span className="text-[var(--electric)] shrink-0">◆</span>{g}</li>
            ))}</ul>
          </div>
        </Section>

        {/* Target Audience */}
        <Section title="Target Audience" icon="👥">
          <div className="grid sm:grid-cols-2 gap-4">
            {[study.targetAudience.primaryPersona, study.targetAudience.secondaryPersona].map((p, i) => (
              <div key={i} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <h4 className="font-semibold text-[var(--electric-light)] mb-1">{i === 0 ? "Primary" : "Secondary"}: {p.name}</h4>
                <p className="text-xs text-[var(--text-muted)] mb-3">{p.demographics}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-red-400 text-xs font-semibold">Pain Points</span>
                    <ul>{p.painPoints.map((pp, j) => <li key={j} className="text-[var(--text-secondary)]">• {pp}</li>)}</ul>
                  </div>
                  <div>
                    <span className="text-green-400 text-xs font-semibold">Goals</span>
                    <ul>{p.goals.map((g, j) => <li key={j} className="text-[var(--text-secondary)]">• {g}</li>)}</ul>
                  </div>
                  <div>
                    <span className="text-[var(--electric-light)] text-xs font-semibold">Channels</span>
                    <div className="flex flex-wrap gap-1 mt-1">{p.channels.map((ch, j) => (
                      <span key={j} className="px-2 py-0.5 bg-[var(--surface)] rounded-full text-xs text-[var(--text-muted)]">{ch}</span>
                    ))}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Go-to-Market */}
        <Section title="Go-to-Market Strategy" icon="🎯">
          <div className="mb-4 p-4 bg-[var(--surface-light)] border border-[var(--electric)]/20 rounded-xl">
            <p className="text-sm font-semibold text-[var(--electric-light)] mb-1">Positioning</p>
            <p className="text-[var(--text-secondary)] italic">&ldquo;{study.goToMarket.positioning}&rdquo;</p>
          </div>
          <div className="mb-6">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">💰 Pricing Strategy</p>
            <p className="text-sm text-[var(--text-secondary)]">{study.goToMarket.pricingStrategy}</p>
          </div>
          <div className="mb-6">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">📢 Channels</p>
            <div className="space-y-2">{study.goToMarket.channels.map((ch, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <Badge text={ch.priority} color={ch.priority} />
                <div><span className="font-medium text-[var(--text-primary)]">{ch.channel}</span> — <span className="text-[var(--text-muted)]">{ch.rationale}</span></div>
              </div>
            ))}</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">🗓️ Launch Plan</p>
            <div className="space-y-3">{study.goToMarket.launchPlan.map((phase, i) => (
              <div key={i} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[var(--electric)] bg-[var(--electric)]/10 px-2 py-0.5 rounded">{phase.timeline}</span>
                  <span className="font-medium text-sm text-[var(--text-primary)]">{phase.phase}</span>
                </div>
                <ul className="space-y-1">{phase.actions.map((a, j) => (
                  <li key={j} className="text-xs text-[var(--text-muted)] flex gap-2"><span>→</span>{a}</li>
                ))}</ul>
              </div>
            ))}</div>
          </div>
        </Section>

        {/* Financial Projections */}
        <Section title="Financial Projections" icon="💰">
          <div className="mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Assumptions:</p>
            <ul className="space-y-1">{study.financialProjections.assumptions.map((a, i) => (
              <li key={i} className="text-xs text-[var(--text-muted)]">• {a}</li>
            ))}</ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {[
              { label: "Year 1", data: study.financialProjections.year1 },
              { label: "Year 2", data: study.financialProjections.year2 },
            ].map((y) => (
              <div key={y.label} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <h4 className="font-semibold text-[var(--electric-light)] mb-2">{y.label}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Revenue</span><span className="text-green-400">{y.data.revenue}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Costs</span><span className="text-red-400">{y.data.costs}</span></div>
                  <div className="flex justify-between border-t border-white/5 pt-1"><span className="text-[var(--text-muted)]">Margin</span><span className="text-[var(--text-primary)] font-medium">{y.data.margin}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-[var(--text-muted)]">Breakeven:</span> <span className="text-[var(--text-primary)]">{study.financialProjections.breakeven}</span></div>
            <div><span className="text-[var(--text-muted)]">Funding:</span> <span className="text-[var(--text-primary)]">{study.financialProjections.fundingNeeds}</span></div>
          </div>
        </Section>

        {/* Risk Assessment */}
        <Section title="Risk Assessment" icon="⚠️">
          <div className="space-y-3">
            {study.riskAssessment.map((r, i) => (
              <div key={i} className="bg-[var(--surface-light)] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{r.risk}</p>
                  <div className="flex gap-1 shrink-0">
                    <Badge text={`L: ${r.likelihood}`} color={r.likelihood} />
                    <Badge text={`I: ${r.impact}`} color={r.impact} />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">💡 {r.mitigation}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Verdict */}
        <div className="bg-gradient-to-r from-[var(--electric)]/20 to-purple-500/20 border border-[var(--electric)]/30 rounded-2xl p-6 md:p-8 text-center">
          <p className="text-sm text-[var(--electric-light)] uppercase tracking-wider mb-2">Final Verdict</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl font-bold" style={{
              color: study.verdict.score >= 7.5 ? "var(--accent-green)" : study.verdict.score >= 5 ? "var(--accent-yellow)" : "var(--accent-red)"
            }}>
              {study.verdict.score.toFixed(1)}
            </span>
            <Badge text={study.verdict.recommendation.toUpperCase()} color={recColor} />
          </div>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-4">{study.verdict.summary}</p>
          <div className="bg-[var(--surface)]/50 rounded-xl p-4 max-w-xl mx-auto">
            <p className="text-xs text-[var(--text-muted)] mb-1">💎 Key Insight</p>
            <p className="text-sm text-[var(--text-primary)] font-medium">{study.verdict.keyInsight}</p>
          </div>
        </div>

        {/* Sources */}
        {study.sources && study.sources.length > 0 && (
          <Section title="Sources & References" icon="📚">
            <div className="flex flex-wrap gap-2">
              {study.sources.map((source, i) => (
                <a key={i} href={source.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-light)] border border-white/5 rounded-full text-xs text-[var(--text-secondary)] hover:border-[var(--electric)]/40 hover:text-[var(--electric-light)] transition-all">
                  <img src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`} alt="" className="w-3.5 h-3.5 rounded-sm" />
                  <span className="font-medium">{source.domain}</span>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-[var(--electric)] hover:bg-[var(--electric-dark)] text-white font-semibold rounded-xl transition-all cursor-pointer"
          >
            📄 Download as PDF
          </button>
          <a href="/" className="inline-block px-8 py-3 bg-[var(--surface)] border border-white/10 text-[var(--text-primary)] font-semibold rounded-xl hover:border-[var(--electric)]/50 transition-all text-center">
            🧠 Rate Another Idea
          </a>
        </div>
      </div>
    </main>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen grid-bg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--electric)] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <StudyContent />
    </Suspense>
  );
}
