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

// Code-side in-progress detection — don't rely on AI for this
const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content?.toLowerCase() ?? "";
const inProgressKeywords = ["start", "starting", "begin", "begun", "working on", "will do", "on it", "i'll do", "got it", "sure", "okay i'll", "alright i'll", "on my way", "i will"];
const doneKeywords = ["done", "finished", "completed", "submitted", "sent it", "all done", "wrapped up"];

const codeDetectedInProgress = inProgressKeywords.some(k => lastUserMsg.includes(k));
const codeDetectedDone = doneKeywords.some(k => lastUserMsg.includes(k));
    if (!chatId || !workspaceId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: tasks } = await supabaseAdmin
      .from("manager_tasks")
      .select("title, description, priority, deadline_ist, status, feedback, is_answered")
      .eq("workspace_id", workspaceId)
      .contains("assignee_ids", [chatId])
      .in("status", ["pending", "in_progress"]);
console.log("task query result:", { chatId, workspaceId, tasks, taskCount: tasks?.length });

    const tasksContext = tasks?.length > 0
      ? tasks.map((t, i) => {
          const deadline = t.deadline_ist
            ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(t.deadline_ist))
            : "No deadline";
          
          let feedbackNote = "";
if (t.is_answered === false) {
  feedbackNote = `\n⚠ PENDING MANAGER RESPONSE: A question was raised about this task ("${t.feedback}"). The manager has NOT answered yet. If asked about this, say the manager has been informed and you are waiting for their response. Do NOT try to answer from the description.`;
} else if (t.is_answered === true) {
  feedbackNote = `\n✅ MANAGER HAS ANSWERED: The manager has clarified this task. The description above has been updated with their answer. When the teammate asks, explicitly confirm the manager responded and state the relevant detail from the description directly in your reply.`;
}

          return `${i + 1}. [${t.status.toUpperCase()}] ${t.title} — Due: ${deadline}\nDetails: ${t.description}${feedbackNote}`;
        }).join("\n\n")
      : "No active tasks assigned yet.";

    const systemPrompt = `You are the AI assistant for ${chatName} on MyTeam — a direct, warm, and helpful coordinator.

Current IST time: ${getISTTime()}

Your assigned tasks:
${tasksContext}

Your behaviour:
1. Communicate tasks, deadlines, and instructions from the manager clearly and conversationally.Your behaviour:
0. ALWAYS refer to the task details injected above for any task-specific information. Never rely on conversation history for task details — the injected details are always more up to date.
1. Communicate tasks, deadlines, and instructions from the manager clearly and conversationally.
2. If the teammate says they are starting or will work on a task, acknowledge it and update your tone accordingly.
3. If a task is marked ⚠ PENDING MANAGER RESPONSE — do NOT try to answer that question yourself. Tell the teammate the manager has been informed and you are waiting on their response.
4. If the teammate explicitly asks you to raise something to the manager (or you clearly cannot answer from the task details), use TASK_FEEDBACK. Do not raise feedback for things you can answer yourself.
5. Keep responses short and direct. No over-explaining.
6. Always be on the teammate's side — you are their assistant, not a monitor.

CRITICAL RULES — append exactly one marker after your reply if any of these apply:

If the teammate uses any words like: start, begin, working on, will do, on it, starting now → append:
TASK_IN_PROGRESS
{"title":"exact task title from list above"}

If the teammate uses any words like: done, finished, completed, submitted, sent it → append:
TASK_DONE
{"title":"exact task title from list above"}

ONLY append TASK_FEEDBACK if the teammate explicitly uses words like "ask him", "tell him", "let me know", "inform the manager", "ask the manager", "I can't finish", "can't make it", "confirm ones". Do NOT raise feedback just because a question is unanswered or unclear. Wait for explicit escalation from the teammate. If teammate just asks a question, answer from task details or say you're not sure — do NOT auto-escalate. Only when they say:
TASK_FEEDBACK
{"title":"exact task title from list above","feedback":"one sentence summary"}

Only ONE marker per reply. Title must be copied exactly from the task list. Do not paraphrase the title.
If none of the above apply, do not append any marker.`;

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

    const doneMarker = "TASK_DONE";
    const feedbackMarker = "TASK_FEEDBACK";
    const inProgressMarker = "TASK_IN_PROGRESS";

    let visibleReply = fullReply;
    let actionJson = null;
    let actionType = null;

    if (fullReply.includes(inProgressMarker)) {
      const idx = fullReply.indexOf(inProgressMarker);
      visibleReply = fullReply.slice(0, idx).trim();
      actionJson = fullReply.slice(idx + inProgressMarker.length).trim();
      actionType = "in_progress";
    } else if (fullReply.includes(doneMarker)) {
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

    if (actionJson && actionType) {
      try {
        const s = actionJson.indexOf("{"); const e = actionJson.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          const parsed = JSON.parse(actionJson.slice(s, e + 1));

          if (actionType === "in_progress") {
            await supabaseAdmin.from("manager_tasks")
              .update({ status: "in_progress", updated_at: new Date().toISOString() })
              .eq("workspace_id", workspaceId)
              .eq("title", parsed.title);
          }

          if (actionType === "done") {
            await supabaseAdmin.from("manager_tasks")
              .update({ status: "done", updated_at: new Date().toISOString() })
              .eq("workspace_id", workspaceId)
              .eq("title", parsed.title);
          }

          if (actionType === "feedback") {
            await supabaseAdmin.from("manager_tasks")
              .update({ 
                feedback: parsed.feedback, 
                is_answered: false,
                updated_at: new Date().toISOString() 
              })
              .eq("workspace_id", workspaceId)
              .eq("title", parsed.title);

            // Directly notify manager — no scheduling needed for feedback
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
                content: `⚠ ${chatName} has a question about "${parsed.title}": ${parsed.feedback}`,
              });

              // Push notification to manager
              const { data: managerWs } = await supabaseAdmin
                .from("workspaces")
                .select("push_subscription")
                .eq("id", workspaceId)
                .maybeSingle();

              if (managerWs?.push_subscription) {
                try {
                  const webpush = (await import("web-push")).default;
                  webpush.setVapidDetails(
                    "mailto:your@email.com",
                    process.env.VAPID_PUBLIC_KEY ?? "",
                    process.env.VAPID_PRIVATE_KEY ?? ""
                  );
                  await webpush.sendNotification(
                    managerWs.push_subscription,
                    JSON.stringify({
                      title: `Question from ${chatName}`,
                      body: parsed.feedback.slice(0, 100),
                    })
                  );
                } catch (pushErr) {
                  console.error("Manager push error:", pushErr);
                }
              }
            }
          }
        }
      } catch (err) { console.error("Action parse error:", err); }
    }

    // Code-side status update — fires even if AI missed the marker
if (codeDetectedDone && tasks?.length > 0) {
  await supabaseAdmin.from("manager_tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("title", tasks[0].title);
} else if (codeDetectedInProgress && tasks?.length > 0) {
  const pendingTask = tasks.find(t => t.status === "pending" && lastUserMsg.includes(t.title.toLowerCase())) 
    ?? (tasks.length === 1 ? tasks[0] : null);
  if (pendingTask) {
    await supabaseAdmin.from("manager_tasks")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("title", pendingTask.title);
  }
}

return NextResponse.json({ reply: visibleReply });
  } catch (err) {
    console.error("teammate-chat error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}