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
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const purchaseType = checkoutSession.metadata?.purchaseType;
    const metadataUserId = checkoutSession.metadata?.userId;

    if (checkoutSession.mode !== "payment" || checkoutSession.payment_status !== "paid" || purchaseType !== "extra_evaluation") {
      return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
    }
    if (metadataUserId && metadataUserId !== user.id) {
      return NextResponse.json({ error: "Checkout session does not belong to this user." }, { status: 403 });
    }

    const { data: extraCredits, error: creditError } = await supabase.rpc("increment_extra_credit", {
      target_user_id: user.id,
      credit_token: `paid_extra_${checkoutSession.id}`,
    });

    if (creditError) {
      console.error("Extra evaluation credit RPC error:", creditError);
      return NextResponse.json({ error: "Could not grant extra evaluation." }, { status: 500 });
    }

    return NextResponse.json({ granted: true, extraCredits: extraCredits ?? 1 });
  } catch (err) {
    console.error("Extra evaluation confirm error:", err);
    return NextResponse.json({ error: "Could not confirm extra evaluation checkout." }, { status: 500 });
  }
}
