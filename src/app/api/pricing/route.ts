import { NextRequest, NextResponse } from "next/server";
import { resolvePricing } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const pricing = resolvePricing(request.headers);

  return NextResponse.json({
    detectedCountry: pricing.detectedCountry,
    pricingRegion: pricing.pricingRegion,
    marketStudy: {
      display: pricing.marketStudy.display,
      currency: pricing.marketStudy.currency,
      regionLabel: pricing.marketStudy.regionLabel,
    },
  });
}
