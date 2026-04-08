import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://ratemyidea.ai";

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();
    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Pro plan not configured." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: { userId: userId || "" },
      success_url: `${BASE_URL}/account?subscribed=true`,
      cancel_url: `${BASE_URL}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe subscribe error:", err);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
