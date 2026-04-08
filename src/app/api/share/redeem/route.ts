import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { token, authToken } = await request.json();
    if (!token || !authToken) return NextResponse.json({ error: "Missing params." }, { status: 400 });

    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // Find token
    const { data: shareToken } = await supabase
      .from("share_tokens")
      .select("*")
      .eq("token", token)
      .is("redeemed_by", null)
      .single();

    if (!shareToken) return NextResponse.json({ error: "Invalid or already used link." }, { status: 400 });
    if (shareToken.sharer_user_id === user.id) return NextResponse.json({ error: "Cannot redeem your own link." }, { status: 400 });

    // Mark redeemed
    await supabase.from("share_tokens").update({
      redeemed_by: user.id,
      redeemed_at: new Date().toISOString(),
    }).eq("token", token);

    // Give sharer +1 credit
    if (shareToken.sharer_user_id) {
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("extra_credits")
        .eq("user_id", shareToken.sharer_user_id)
        .single();

      if (sub) {
        await supabase
          .from("user_subscriptions")
          .update({ extra_credits: (sub.extra_credits || 0) + 1 })
          .eq("user_id", shareToken.sharer_user_id);
      } else {
        await supabase.from("user_subscriptions").insert({
          user_id: shareToken.sharer_user_id,
          extra_credits: 1,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Share redeem error:", err);
    return NextResponse.json({ error: "Could not redeem link." }, { status: 500 });
  }
}
