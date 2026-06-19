export type PricingRegion = "US_CA" | "LATAM" | "GLOBAL";

export type ProductPricing = {
  display: string;
  priceId?: string;
  currency: "USD" | "MXN" | string;
  regionLabel: string;
};

export type ResolvedPricing = {
  detectedCountry: string;
  pricingRegion: PricingRegion;
  marketStudy: ProductPricing;
};

const LATAM_COUNTRIES = new Set([
  "AR", "BO", "BR", "BZ", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GT",
  "HN", "MX", "NI", "PA", "PY", "PE", "PR", "UY", "VE",
]);

const US_CA_COUNTRIES = new Set(["US", "CA"]);

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function detectCountry(headers: Headers): string {
  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    "";

  const normalized = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "UN";
}

function regionForCountry(country: string): PricingRegion {
  if (US_CA_COUNTRIES.has(country)) return "US_CA";
  if (LATAM_COUNTRIES.has(country)) return "LATAM";
  return "GLOBAL";
}

function defaultMarketStudy(): ProductPricing {
  return {
    display: env("MARKET_STUDY_PRICE_DEFAULT_DISPLAY") || env("MARKET_STUDY_PRICE_DISPLAY") || "$29 USD",
    priceId: env("MARKET_STUDY_PRICE_DEFAULT_ID") || env("MARKET_STUDY_PRICE_ID"),
    currency: env("MARKET_STUDY_PRICE_DEFAULT_CURRENCY") || env("MARKET_STUDY_PRICE_CURRENCY") || "USD",
    regionLabel: "Global",
  };
}

function resolveMarketStudy(region: PricingRegion): ProductPricing {
  const fallback = defaultMarketStudy();

  if (region === "LATAM") {
    const regionalPriceId = env("MARKET_STUDY_PRICE_LATAM_ID");
    if (!regionalPriceId) return fallback;

    return {
      display: env("MARKET_STUDY_PRICE_LATAM_DISPLAY") || "$399 MXN",
      priceId: regionalPriceId,
      currency: env("MARKET_STUDY_PRICE_LATAM_CURRENCY") || "MXN",
      regionLabel: "Mexico/LATAM",
    };
  }

  if (region === "US_CA") {
    const regionalPriceId = env("MARKET_STUDY_PRICE_US_ID");
    if (!regionalPriceId) return fallback;

    return {
      display: env("MARKET_STUDY_PRICE_US_DISPLAY") || "$29 USD",
      priceId: regionalPriceId,
      currency: env("MARKET_STUDY_PRICE_US_CURRENCY") || "USD",
      regionLabel: "US/Canada",
    };
  }

  return fallback;
}

export function resolvePricing(headers: Headers): ResolvedPricing {
  const detectedCountry = detectCountry(headers);
  const pricingRegion = regionForCountry(detectedCountry);

  return {
    detectedCountry,
    pricingRegion,
    marketStudy: resolveMarketStudy(pricingRegion),
  };
}
