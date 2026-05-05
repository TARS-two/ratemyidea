import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export async function POST(request: NextRequest) {
  try {
    const { sessionId, authToken } = await request.json();

    if (!sessionId || !authToken) {
      return NextResponse.json({ error: "Missing checkout session or auth token." }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (checkoutSession.mode !== "subscription") {
      return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
    }

    const metadataUserId = typeof checkoutSession.metadata?.userId === "string" && checkoutSession.metadata.userId
      ? checkoutSession.metadata.userId
      : null;
    const checkoutEmail = checkoutSession.customer_details?.email || checkoutSession.customer_email || null;
    const emailMatches = checkoutEmail && user.email && checkoutEmail.toLowerCase() === user.email.toLowerCase();

    if (metadataUserId && metadataUserId !== user.id && !emailMatches) {
      return NextResponse.json({ error: "Checkout session does not belong to this account." }, { status: 403 });
    }

    const subscription = typeof checkoutSession.subscription === "string"
      ? await stripe.subscriptions.retrieve(checkoutSession.subscription)
      : checkoutSession.subscription;

    if (!subscription || typeof subscription === "string") {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    const customerId = typeof checkoutSession.customer === "string"
      ? checkoutSession.customer
      : typeof subscription.customer === "string"
        ? subscription.customer
        : null;

    const isPro = subscription.status === "active" || subscription.status === "trialing";

    await supabase.from("user_subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: isPro ? "pro" : "free",
      status: subscription.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({
      isPro,
      status: subscription.status,
      plan: isPro ? "pro" : "free",
    });
  } catch (err) {
    console.error("Stripe confirm error:", err);
    return NextResponse.json({ error: "Could not confirm Pro subscription." }, { status: 500 });
  }
}
