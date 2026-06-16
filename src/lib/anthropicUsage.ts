import type { SupabaseClient } from "@supabase/supabase-js";

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

type AnthropicResponseWithUsage = {
  usage?: AnthropicUsage;
};

type LogAnthropicUsageParams = {
  supabase: SupabaseClient | null;
  endpoint: string;
  model: string;
  responseData?: AnthropicResponseWithUsage | null;
  evaluationId?: string | null;
  userId?: string | null;
  success: boolean;
  statusCode?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
};

type AnthropicModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const DEFAULT_SONNET_PRICING: AnthropicModelPricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
};

const MODEL_PRICING: Array<{ pattern: RegExp; pricing: AnthropicModelPricing }> = [
  { pattern: /haiku/i, pricing: { inputPerMillion: 1, outputPerMillion: 5 } },
  { pattern: /sonnet/i, pricing: DEFAULT_SONNET_PRICING },
  { pattern: /opus/i, pricing: { inputPerMillion: 15, outputPerMillion: 75 } },
];

function getPricingForModel(model: string): AnthropicModelPricing {
  return MODEL_PRICING.find((entry) => entry.pattern.test(model))?.pricing ?? DEFAULT_SONNET_PRICING;
}

function normalizeTokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function estimateAnthropicCostUsd(model: string, usage?: AnthropicUsage | null): number | null {
  const inputTokens = normalizeTokenCount(usage?.input_tokens);
  const outputTokens = normalizeTokenCount(usage?.output_tokens);

  if (inputTokens === null && outputTokens === null) return null;

  const pricing = getPricingForModel(model);
  const inputCost = ((inputTokens ?? 0) / 1_000_000) * pricing.inputPerMillion;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.outputPerMillion;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export async function logAnthropicUsage({
  supabase,
  endpoint,
  model,
  responseData,
  evaluationId = null,
  userId = null,
  success,
  statusCode = null,
  latencyMs = null,
  errorMessage = null,
}: LogAnthropicUsageParams): Promise<void> {
  if (!supabase) return;

  const usage = responseData?.usage;
  const inputTokens = normalizeTokenCount(usage?.input_tokens);
  const outputTokens = normalizeTokenCount(usage?.output_tokens);
  const estimatedCostUsd = estimateAnthropicCostUsd(model, usage);

  const { error } = await supabase.from("ai_usage_logs").insert({
    endpoint,
    model,
    evaluation_id: evaluationId,
    user_id: userId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimatedCostUsd,
    success,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage,
  });

  if (error) {
    console.error("AI usage log error:", error.message);
  }
}
