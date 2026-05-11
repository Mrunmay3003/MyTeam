import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { workspaceId, subscription } = await req.json();
    if (!workspaceId || !subscription) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await supabaseAdmin
      .from("workspaces")
      .update({ push_subscription: subscription })
      .eq("id", workspaceId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("save-push-subscription error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}