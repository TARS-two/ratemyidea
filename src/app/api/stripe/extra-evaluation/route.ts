import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://ratemyidea.ai";

export async function POST(request: NextRequest) {
  try {
    const { authToken, email, lang } = await request.json();
    const priceId = process.env.STRIPE_EXTRA_EVAL_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Extra evaluation price not configured." }, { status: 500 });
    }
    if (!authToken) {
      return NextResponse.json({ error: "Sign in before buying an extra evaluation." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
    }

    const metadata = {
      userId: user.id,
      purchaseType: "extra_evaluation",
      lang: lang === "es" ? "es" : "en",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || user.email || undefined,
      metadata,
      success_url: `${BASE_URL}/?extra_eval=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Extra evaluation checkout error:", err);
    return NextResponse.json({ error: "Could not create extra evaluation checkout session." }, { status: 500 });
  }
}
