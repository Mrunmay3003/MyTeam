import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { workspaceId, chatId } = await req.json();
    if (!workspaceId || !chatId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const [chatRes, wsRes, chatsRes, bizRes, msgsRes] = await Promise.all([
      supabaseAdmin.from("chats").select("name").eq("id", chatId).single(),
      supabaseAdmin.from("workspaces").select("name").eq("id", workspaceId).single(),
      supabaseAdmin.from("chats").select("id, type, name, pos_x, pos_y").eq("workspace_id", workspaceId).in("type", ["manager", "teammate"]),
      supabaseAdmin.from("business_memory").select("content").eq("workspace_id", workspaceId).maybeSingle(),
      supabaseAdmin.from("messages").select("id, role, content, created_at").eq("chat_id", chatId).order("created_at", { ascending: true }),
    ]);

    return NextResponse.json({
      chatName: chatRes.data?.name ?? "",
      orgName: wsRes.data?.name ?? "",
      chats: chatsRes.data ?? [],
      businessMemory: bizRes.data?.content ?? null,
      messages: msgsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}