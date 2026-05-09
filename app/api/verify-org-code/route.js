import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { orgCode, userEmail } = await req.json();
    if (!orgCode || !userEmail) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, org_code")
      .eq("org_code", orgCode.trim().toUpperCase())
      .maybeSingle();

    if (!ws) return NextResponse.json({ match: false, reason: "invalid_code" });

    const { data: chat } = await supabaseAdmin
      .from("chats")
      .select("id, name")
      .eq("workspace_id", ws.id)
      .eq("assigned_email", userEmail)
      .eq("type", "teammate")
      .maybeSingle();

    return NextResponse.json({
      match: true,
      invited: !!chat,
      workspaceId: ws.id,
      orgName: ws.name,
      chatId: chat?.id ?? null,
      chatName: chat?.name ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}