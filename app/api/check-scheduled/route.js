import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    webpush.setVapidDetails(
      "mailto:youremail@example.com",
      process.env.VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? ""
    );

    const { workspaceId } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    // Fetch due prompts
    const now = new Date().toISOString();
    const { data: duePrompts } = await supabaseAdmin
      .from("scheduled_prompts")
      .select("id, task_id, target_type, target_id, message_draft")
      .eq("workspace_id", workspaceId)
      .eq("sent", false)
      .lte("send_at_ist", now);

    if (!duePrompts || duePrompts.length === 0) {
      return NextResponse.json({ triggered: 0 });
    }

    let triggered = 0;

    // Mark all due prompts as sent IMMEDIATELY to prevent double-firing
const dueIds = duePrompts.map(p => p.id);
await supabaseAdmin
  .from("scheduled_prompts")
  .update({ sent: true, sent_at: new Date().toISOString() })
  .in("id", dueIds);

for (const prompt of duePrompts) {
  try {
        if (prompt.target_type === "teammate" && prompt.target_id) {
          // Find the chat this belongs to
          const { data: chat } = await supabaseAdmin
            .from("chats")
            .select("id, name, workspace_id")
            .eq("id", prompt.target_id)
            .maybeSingle();

          if (!chat) continue;

          // Call teammate-chat API with the scheduled message as the opening
          const aiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/teammate-chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: prompt.message_draft }],
              chatId: prompt.target_id,
              workspaceId,
              chatName: chat.name,
            }),
          });

          const aiData = await aiRes.json();
          const replyText = aiData.reply || "";

          if (replyText) {
            // Save AI message to messages table
            await supabaseAdmin.from("messages").insert({
              chat_id: prompt.target_id,
              role: "assistant",
              content: replyText,
            });

            // Find teammate's workspace to get push subscription
            const { data: teammateWs } = await supabaseAdmin
              .from("workspaces")
              .select("push_subscription")
              .eq("linked_chat_id", prompt.target_id)
              .maybeSingle();

            if (teammateWs?.push_subscription) {
              try {
                await webpush.sendNotification(
                  teammateWs.push_subscription,
                  JSON.stringify({
                    title: "New task from your manager",
                    body: replyText.slice(0, 100),
                  })
                );
              } catch (pushErr) {
                console.error("Push notification error:", pushErr);
              }
            }
          }
        }

        if (prompt.target_type === "manager") {
          const { data: managerChat } = await supabaseAdmin
            .from("chats")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("type", "manager")
            .maybeSingle();

          if (managerChat) {
            await supabaseAdmin.from("messages").insert({
              chat_id: managerChat.id,
              role: "assistant",
              content: prompt.message_draft,
            });

            // Send push notification to manager
            const { data: managerWs } = await supabaseAdmin
              .from("workspaces")
              .select("push_subscription")
              .eq("id", workspaceId)
              .maybeSingle();

            if (managerWs?.push_subscription) {
              try {
                await webpush.sendNotification(
                  managerWs.push_subscription,
                  JSON.stringify({
                    title: "Team update",
                    body: prompt.message_draft.slice(0, 100),
                  })
                );
              } catch (pushErr) {
                console.error("Manager push notification error:", pushErr);
              }
            }
          }
        }

        triggered++;
      } catch (promptErr) {
        console.error("Prompt processing error:", promptErr);
      }
    }

    return NextResponse.json({ triggered });
  } catch (err) {
    console.error("check-scheduled error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}