import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolvePricing } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://ratemyidea.ai";

export async function POST(request: NextRequest) {
  try {
    const { idea, market, lang, email, freeResult } = await request.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return NextResponse.json({ error: "Invalid idea" }, { status: 400 });
    }

    const pricing = resolvePricing(request.headers);

    if (!pricing.marketStudy.priceId) {
      return NextResponse.json({ error: "Market Study price not configured." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: pricing.marketStudy.priceId, quantity: 1 }],
      success_url: `${BASE_URL}/study?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}`,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      metadata: {
        idea: idea.trim().slice(0, 500), // Stripe metadata limit
        market: typeof market === "string" ? market.trim().slice(0, 100) : "",
        lang: lang || "en",
        freeScore: freeResult?.overall?.toString() || "",
        ideaName: freeResult?.ideaName?.slice(0, 100) || "",
        pricingRegion: pricing.pricingRegion,
        detectedCountry: pricing.detectedCountry,
        marketStudyPrice: pricing.marketStudy.display,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Checkout error:", message);
    return NextResponse.json(
      { error: `Checkout failed: ${message}` },
      { status: 500 }
    );
  }
}
