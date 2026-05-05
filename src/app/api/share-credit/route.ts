import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const authToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!authToken) {
      return NextResponse.json({ error: "No authentication token provided." }, { status: 401 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("plan, status, extra_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.error("Share credit subscription lookup error:", subscriptionError);
      return NextResponse.json({ error: "Could not fetch subscription." }, { status: 500 });
    }

    if (subscription?.plan === "pro" && subscription?.status === "active") {
      return NextResponse.json({
        message: "Pro user, no extra free credit needed.",
        granted: false,
        freeEvaluationsLeft: subscription.extra_credits ?? 0,
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: existingCredit, error: existingCreditError } = await supabase
      .from("share_tokens")
      .select("id, created_at")
      .eq("sharer_user_id", user.id)
      .is("evaluation_id", null)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCreditError) {
      console.error("Share credit daily check error:", existingCreditError);
      return NextResponse.json({ error: "Could not verify share credit." }, { status: 500 });
    }

    if (existingCredit) {
      return NextResponse.json({
        message: "Extra evaluation already granted for today.",
        granted: false,
        freeEvaluationsLeft: subscription?.extra_credits ?? 0,
        lastShareDate: existingCredit.created_at,
      });
    }

    const nextExtraCredits = (subscription?.extra_credits ?? 0) + 1;

    if (subscription) {
      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({ extra_credits: nextExtraCredits, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Share credit update error:", updateError);
        return NextResponse.json({ error: "Could not grant extra evaluation." }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        extra_credits: nextExtraCredits,
      });

      if (insertError) {
        console.error("Share credit insert error:", insertError);
        return NextResponse.json({ error: "Could not grant extra evaluation." }, { status: 500 });
      }
    }

    const now = new Date().toISOString();
    const { error: tokenError } = await supabase.from("share_tokens").insert({
      token: `credit_${randomBytes(12).toString("hex")}`,
      sharer_user_id: user.id,
      evaluation_id: null,
      redeemed_by: user.id,
      redeemed_at: now,
    });

    if (tokenError) {
      console.error("Share credit marker insert error:", tokenError);
      return NextResponse.json({ error: "Could not record share credit." }, { status: 500 });
    }

    return NextResponse.json({
      message: "Extra evaluation granted!",
      granted: true,
      freeEvaluationsLeft: nextExtraCredits,
      lastShareDate: now,
    });
  } catch (err) {
    console.error("Share credit error:", err);
    return NextResponse.json({ error: "Could not grant extra evaluation." }, { status: 500 });
  }
}
