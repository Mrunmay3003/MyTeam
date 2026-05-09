import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getISTTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date());
}

export async function POST(req) {
  try {
    const { messages, chatId, workspaceId, chatName } = await req.json();
    if (!chatId || !workspaceId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Fetch assigned tasks for this chat
    const { data: tasks } = await supabaseAdmin
      .from("manager_tasks")
      .select("title, description, priority, deadline_ist, status, feedback")
      .eq("workspace_id", workspaceId)
      .contains("assignee_ids", [chatId])
      .in("status", ["pending", "in_progress"]);

    const tasksContext = tasks?.length > 0
      ? tasks.map((t, i) => {
          const deadline = t.deadline_ist
            ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(t.deadline_ist))
            : "No deadline";
          return `${i + 1}. [${t.status.toUpperCase()}] ${t.title} — Due: ${deadline} — Priority: ${t.priority}\nDetails: ${t.description}`;
        }).join("\n\n")
      : "No active tasks assigned yet.";

    const systemPrompt = `You are the AI assistant for ${chatName} on MyTeam — a direct, warm, and helpful coordinator.

Current IST time: ${getISTTime()}

Your assigned tasks:
${tasksContext}

Your behaviour:
1. You communicate tasks, deadlines, and instructions from the manager to this teammate clearly and conversationally.
2. If the teammate says they completed a task, acknowledge it warmly and update your tone accordingly.
3. If the teammate raises a concern, question, or says they cannot complete something on time — acknowledge it and let them know the manager will be informed.
4. Keep responses short and direct. No over-explaining.
5. If no tasks are assigned yet, let the teammate know their manager will reach out with tasks soon.
6. Always be on the teammate's side — you are their assistant, not a monitor.

DONE DETECTION — If the teammate clearly indicates a task is complete, append this exactly after your reply:
TASK_DONE
{"title":"exact task title"}

FEEDBACK DETECTION — If the teammate raises a concern or cannot complete something, append:
TASK_FEEDBACK
{"title":"exact task title","feedback":"brief summary of what they said"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.slice(-6),
      }),
    });

    const data = await response.json();
    const fullReply = data.content?.[0]?.text ?? "";

    // Split reply from action markers
    const doneMarker = "TASK_DONE";
    const feedbackMarker = "TASK_FEEDBACK";

    let visibleReply = fullReply;
    let actionJson = null;
    let actionType = null;

    if (fullReply.includes(doneMarker)) {
      const idx = fullReply.indexOf(doneMarker);
      visibleReply = fullReply.slice(0, idx).trim();
      actionJson = fullReply.slice(idx + doneMarker.length).trim();
      actionType = "done";
    } else if (fullReply.includes(feedbackMarker)) {
      const idx = fullReply.indexOf(feedbackMarker);
      visibleReply = fullReply.slice(0, idx).trim();
      actionJson = fullReply.slice(idx + feedbackMarker.length).trim();
      actionType = "feedback";
    }

    // Process task update
    if (actionJson && actionType) {
      try {
        const s = actionJson.indexOf("{"); const e = actionJson.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          const parsed = JSON.parse(actionJson.slice(s, e + 1));

          if (actionType === "done") {
            await supabaseAdmin.from("manager_tasks")
              .update({ status: "done", updated_at: new Date().toISOString() })
              .eq("workspace_id", workspaceId)
              .eq("title", parsed.title);
          }

          if (actionType === "feedback") {
            await supabaseAdmin.from("manager_tasks")
              .update({ feedback: parsed.feedback, updated_at: new Date().toISOString() })
              .eq("workspace_id", workspaceId)
              .eq("title", parsed.title);
          }
        }
      } catch (err) { console.error("Action parse error:", err); }
    }

    return NextResponse.json({ reply: visibleReply });
  } catch (err) {
    console.error("teammate-chat error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}