import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://ratemyidea.ai";

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, authToken } = await request.json();
    const supabase = createServiceClient();
    if (!supabase) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    let userId: string | null = null;
    if (authToken) {
      const { data: { user } } = await supabase.auth.getUser(authToken);
      if (user) userId = user.id;
    }

    const token = randomBytes(12).toString("hex");

    await supabase.from("share_tokens").insert({
      token,
      sharer_user_id: userId,
      evaluation_id: evaluationId || null,
    });

    return NextResponse.json({ token, shareUrl: `${BASE_URL}/?ref=${token}` });
  } catch (err) {
    console.error("Share generate error:", err);
    return NextResponse.json({ error: "Could not generate share link." }, { status: 500 });
  }
}
