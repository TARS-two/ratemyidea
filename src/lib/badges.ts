export interface Badge {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}

export function getBadge(score: number): Badge {
  if (score >= 8.5) return { label: "Genius",      emoji: "🧠", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (score >= 7)   return { label: "Sharp",        emoji: "🦅", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" };
  if (score >= 5.5) return { label: "Visionary",    emoji: "💡", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  if (score >= 4)   return { label: "Seedling",     emoji: "🌱", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
  return              { label: "The Dreamer",  emoji: "🌵", color: "#ef4444", bg: "rgba(239,68,68,0.10)" };
}

export function detectCategory(idea: string): string {
  const lower = idea.toLowerCase();
  if (lower.includes("saas") || lower.includes("software") || lower.includes("app") || lower.includes("platform")) return "SaaS";
  if (lower.includes("marketplace") || lower.includes("connect") || lower.includes("match")) return "Marketplace";
  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) return "eCommerce";
  if (lower.includes("fintech") || lower.includes("finance") || lower.includes("payment") || lower.includes("crypto")) return "Fintech";
  if (lower.includes("health") || lower.includes("medical") || lower.includes("wellness") || lower.includes("fitness")) return "HealthTech";
  if (lower.includes("education") || lower.includes("learn") || lower.includes("course") || lower.includes("teach")) return "EdTech";
  if (lower.includes("food") || lower.includes("restaurant") || lower.includes("delivery") || lower.includes("meal")) return "FoodTech";
  if (lower.includes("ai") || lower.includes("machine learning") || lower.includes("automation")) return "AI/ML";
  if (lower.includes("content") || lower.includes("media") || lower.includes("creator") || lower.includes("newsletter")) return "Media";
  return "Consumer";
}
