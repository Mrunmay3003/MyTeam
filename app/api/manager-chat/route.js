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
    const { messages, workspaceId, teammates = [] } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    // Fetch business memory
    const { data: bizMem } = await supabaseAdmin
      .from("business_memory").select("content").eq("workspace_id", workspaceId).maybeSingle();
    const businessContext = bizMem?.content
      ? JSON.stringify(bizMem.content, null, 2)
      : "No business context saved yet. Encourage the manager to fill in the Business Context chat first.";

    // Fetch active tasks
    const { data: activeTasks } = await supabaseAdmin
      .from("manager_tasks").select("title, description, task_type, assignee_ids, deadline_ist, priority, status, feedback, is_answered")
      .eq("workspace_id", workspaceId).in("status", ["pending", "in_progress", "done"]).order("priority", { ascending: true });

    const tasksContext = activeTasks?.length > 0
      ? activeTasks.map((t, i) => {
          const assigneeName = t.assignee_ids?.length
            ? (teammates.find(tm => tm.id === t.assignee_ids[0])?.name ?? "Unknown")
            : "All teammates";
          const deadline = t.deadline_ist
            ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(t.deadline_ist))
            : "No deadline";
          const fb = (t.feedback && t.is_answered === false) ? ` ⚠ Unanswered teammate question: "${t.feedback}"` : "";
          const doneNote = t.status === "done" ? " ✓ Completed" : "";
          return `${i + 1}. [${t.status.toUpperCase()}]${doneNote} ${t.title} — ${assigneeName} — Due: ${deadline} — Priority: ${t.priority}${fb}`;
        }).join("\n")
      : "No active tasks.";

    const teammateList = teammates.length > 0
      ? teammates.map(t => `- ${t.name}${t.assignedEmail ? ` (${t.assignedEmail})` : ""}`).join("\n")
      : "No teammates added yet.";

    const hasFeedback = activeTasks?.some(t => t.feedback && t.is_answered === false);

    const systemPrompt = `You are the Manager Chat AI for MyTeam — a direct, intelligent async team coordination assistant.

Current IST time: ${getISTTime()}

Business Context (from Business Chat memory):
${businessContext}

Active Tasks:
${tasksContext}

Teammate Chats available:
${teammateList}

${hasFeedback ? `⚠ IMPORTANT: The following tasks have unanswered questions from teammates — address these AT THE START of your first response. Once you answer, the question is considered resolved:
${activeTasks?.filter(t => t.feedback && t.is_answered === false).map(t => `- "${t.title}": ${t.feedback}`).join("\n")}` : ""}

Your behaviour:
1. Help assign tasks, set deadlines, coordinate the team — this is your primary job.
2. Reference active tasks naturally during conversation when relevant. When the manager asks for updates on a teammate or task, ALWAYS check the Active Tasks list above — the status field shows exactly where each task stands: PENDING (not started), IN_PROGRESS (teammate is working on it), DONE (completed). Report this status directly. Never say you don't have visibility into what a teammate is doing.
3. If the manager discusses strategy, long-term plans, new projects, or timeline decisions → briefly engage then say: "That's a planning-level call — bring it up in Business Context so it gets saved. I'll reference it from there once it's stored."
4. If a teammate name is mentioned that does not closely match anyone in the list → flag it clearly.
5. Understand IST time in both 12hr and 24hr format. "Tomorrow noon" = tomorrow 12:00 IST. "Friday EOD" = Friday 23:59 IST. "This weekend" = upcoming Saturday/Sunday IST.
6. When the manager assigns tasks, carefully identify each distinct task, who it is for, the deadline, the priority, and what the opening message to the teammate should say.
7. Keep responses concise and direct. Do not over-explain.

TASK OUTPUT RULES:
- Only output MANAGER_TASKS_UPDATE when you have ALL of: task description, assignee, and deadline.
- If any of these are missing, ask ONE short question to get the missing info. Do NOT save yet.
- Once you have everything confirmed in the conversation, output the block ONCE.
- When manager clarifies something mid-conversation, UPDATE the existing task silently — do not ask again.
- Never question who the manager assigns a task to. If they say a name, assign to that person. During discussions, you may recommend the manager about assigning different tasks to respective members who usually work on those tasks based on previous chats.
- Never draft the message out loud to the manager. Just confirm the task is saved and who it's going to.
- Keep confirmations to 1-2 lines max.
- ALWAYS write a short conversational confirmation BEFORE the MANAGER_TASKS_UPDATE block. Do not output the marker as your only response.
- deadline_ist = when the task must be completed by
- send_at_ist = when to notify the teammate. Follow these rules strictly:
  * If deadline is today or tomorrow → set send_at_ist to current IST time (notify immediately)
  * If deadline is 2+ days away → ask ONE short question: "When should I notify [name] about this?" Then use their answer as send_at_ist
  * If manager explicitly says when to notify ("tell her at 6", "notify tomorrow morning") → use that as send_at_ist regardless of deadline
  * Never assume send_at_ist equals deadline_ist
- When updating an existing task, always use the EXACT same title as previously confirmed. Never shorten or rephrase it.

STATUS RULES — include "status" field in MANAGER_TASKS_UPDATE only in these cases:
- Manager says task is done, finished, completed, wrapped up → status: "done"
- Manager says teammate started, is working on it, has begun → status: "in_progress"
- Manager updates description, answers a feedback question, or changes any task detail → status: "pending"
- For brand new tasks being created → omit status field entirely (defaults to pending)

MANAGER_TASKS_UPDATE
[{"title":"short label","description":"full details","task_type":"teammate_task","assignee_name":"exact name from list or null","deadline_ist":"ISO8601 with +05:30 or null","send_at_ist":"ISO8601 with +05:30 or null — when to notify the teammate, separate from deadline","priority":1,"scheduled_message":"opening line for teammate","status":"only include if explicitly changing status — done, in_progress, or pending"}]

FEEDBACK_ANSWERED — When you surface a teammate question to the manager AND the manager replies with an answer or decision about it, append this ONCE after your reply:
FEEDBACK_ANSWERED
{"title":"exact task title the feedback was about","updated_description":"original task description with ONLY the manager's answer appended as a short note at the end. Do NOT rewrite or summarise the full description. Example: if original is 'Design a logo' and manager says 'make it blue', output: 'Design a logo. Manager note: make it blue.'"}

Do not append FEEDBACK_ANSWERED when you are asking the question. Only append it after the manager has given a response. You do NOT need to also output MANAGER_TASKS_UPDATE when answering feedback — FEEDBACK_ANSWERED handles the description update.

task_type values:
- teammate_task: one specific person
- broadcast_task: all teammates (assignee_name: null)
- ai_reminder: remind the manager at a specific IST time (assignee_name: null)
- levitated: manager handles personally — AI tracks but does not act`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.slice(-6),
      }),
    });

    const data = await response.json();
    const fullReply = data.content?.[0]?.text ?? "";

    const marker = "MANAGER_TASKS_UPDATE";
    const feedbackMarker = "FEEDBACK_ANSWERED";
    const markerIdx = fullReply.indexOf(marker);
    const feedbackAnsweredIdx = fullReply.indexOf(feedbackMarker);
    const allMarkerIdxs = [markerIdx, feedbackAnsweredIdx].filter(idx => idx !== -1);
    const firstMarkerIdx = allMarkerIdxs.length > 0 ? Math.min(...allMarkerIdxs) : -1;
    const visibleReply = firstMarkerIdx !== -1 ? fullReply.slice(0, firstMarkerIdx).trim() : fullReply;

    // Handle FEEDBACK_ANSWERED
    const feedbackMarkerIdx = fullReply.indexOf(feedbackMarker);
    if (feedbackMarkerIdx !== -1) {
      try {
        const raw = fullReply.slice(feedbackMarkerIdx + feedbackMarker.length).trim();
        const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
        if (s !== -1 && e !== -1) {
          const parsed = JSON.parse(raw.slice(s, e + 1));

          // Fetch task BEFORE update to check if feedback was pending
          const { data: taskBeforeUpdate } = await supabaseAdmin
            .from("manager_tasks")
            .select("assignee_ids, description, title, is_answered, feedback")
            .eq("workspace_id", workspaceId)
            .eq("title", parsed.title)
            .maybeSingle();

          const hadPendingFeedback = taskBeforeUpdate?.is_answered === false && taskBeforeUpdate?.feedback;

          // Update task — keep feedback until teammate AI clears it
          const updatePayload = { is_answered: true, updated_at: new Date().toISOString() };
          if (parsed.updated_description) updatePayload.description = parsed.updated_description;
          await supabaseAdmin.from("manager_tasks")
            .update(updatePayload)
            .eq("workspace_id", workspaceId)
            .eq("title", parsed.title);

          // Notify teammate
          if (taskBeforeUpdate?.assignee_ids?.length > 0) {
            const teammateId = taskBeforeUpdate.assignee_ids[0];
            const notifyMsg = hadPendingFeedback
              ? `Your manager has answered your question about "${taskBeforeUpdate.title}". Here's the update: ${parsed.updated_description ?? taskBeforeUpdate.description}`
              : `Your manager has updated the task "${taskBeforeUpdate.title}". Here's what changed: ${parsed.updated_description ?? taskBeforeUpdate.description}`;

            await supabaseAdmin.from("messages").insert({
              chat_id: teammateId,
              role: "assistant",
              content: notifyMsg,
            });

            const { data: teammateWs } = await supabaseAdmin
              .from("workspaces")
              .select("push_subscription")
              .eq("linked_chat_id", teammateId)
              .maybeSingle();

            if (teammateWs?.push_subscription) {
              try {
                const webpushMod = (await import("web-push")).default;
                webpushMod.setVapidDetails(
                  "mailto:your@email.com",
                  process.env.VAPID_PUBLIC_KEY ?? "",
                  process.env.VAPID_PRIVATE_KEY ?? ""
                );
                await webpushMod.sendNotification(
                  teammateWs.push_subscription,
                  JSON.stringify({
                    title: hadPendingFeedback ? "Manager answered your question" : "Task updated by manager",
                    body: notifyMsg.slice(0, 100),
                  })
                );
              } catch (pushErr) {
                console.error("Teammate push error:", pushErr);
              }
            }
          }
        }
      } catch (err) { console.error("Feedback answer parse error:", err); }
    }

    // Parse and save tasks
    let tasksCreated = 0;
    if (markerIdx !== -1) {
      try {
        const raw = fullReply.slice(markerIdx + marker.length).trim();
        const s = raw.indexOf("["); const e = raw.lastIndexOf("]");
        if (s !== -1 && e !== -1) {
          const taskArray = JSON.parse(raw.slice(s, e + 1));

          for (const task of taskArray) {
            let assigneeIds = null;
            if (task.assignee_name && task.task_type === "teammate_task") {
              const match = teammates.find(t =>
                t.name.toLowerCase() === task.assignee_name.toLowerCase()
              );
              if (match) assigneeIds = [match.id];
            }

            console.log("assignee match attempt:", { assignee_name: task.assignee_name, teammates: teammates.map(t => t.name), matched: assigneeIds });

            const { data: existing } = await supabaseAdmin
              .from("manager_tasks")
              .select("id")
              .eq("workspace_id", workspaceId)
              .ilike("title", task.title)
              .maybeSingle();

            if (existing) {
              const updateData = {
                description: task.description,
                deadline_ist: task.deadline_ist ?? null,
                priority: task.priority ?? 3,
                updated_at: new Date().toISOString(),
              };
              if (task.status === "done") updateData.status = "done";
              else if (task.status === "in_progress") updateData.status = "in_progress";
              else if (task.status === "pending") updateData.status = "pending";
              if (assigneeIds) updateData.assignee_ids = assigneeIds;
              await supabaseAdmin.from("manager_tasks").update(updateData).eq("id", existing.id);
              tasksCreated++;

              // Notify teammate of description update via MANAGER_TASKS_UPDATE
              if (assigneeIds?.length > 0 && task.description) {
                const notifyMsg = `Your manager has updated the task "${task.title}". Here's what changed: ${task.description}`;
                await supabaseAdmin.from("messages").insert({
                  chat_id: assigneeIds[0],
                  role: "assistant",
                  content: notifyMsg,
                });

                const { data: teammateWs } = await supabaseAdmin
                  .from("workspaces")
                  .select("push_subscription")
                  .eq("linked_chat_id", assigneeIds[0])
                  .maybeSingle();

                if (teammateWs?.push_subscription) {
                  try {
                    const webpushMod = (await import("web-push")).default;
                    webpushMod.setVapidDetails(
                      "mailto:your@email.com",
                      process.env.VAPID_PUBLIC_KEY ?? "",
                      process.env.VAPID_PRIVATE_KEY ?? ""
                    );
                    await webpushMod.sendNotification(
                      teammateWs.push_subscription,
                      JSON.stringify({
                        title: "Task updated by manager",
                        body: notifyMsg.slice(0, 100),
                      })
                    );
                  } catch (pushErr) {
                    console.error("Task update push error:", pushErr);
                  }
                }
              }
            } else {
              const { data: inserted, error: insertErr } = await supabaseAdmin
                .from("manager_tasks")
                .insert({
                  workspace_id: workspaceId,
                  title: task.title,
                  description: task.description,
                  task_type: task.task_type,
                  assignee_ids: assigneeIds,
                  deadline_ist: task.deadline_ist ?? null,
                  priority: task.priority ?? 3,
                  status: "pending",
                  source_context: businessContext.slice(0, 500),
                })
                .select("id").single();

              if (insertErr) { console.error("Task insert error:", insertErr); continue; }
              tasksCreated++;

              if (task.send_at_ist && task.scheduled_message && inserted) {
                const targets =
                  task.task_type === "broadcast_task" ? teammates.map(t => ({ target_type: "teammate", target_id: t.id })) :
                  task.task_type === "ai_reminder" ? [{ target_type: "manager", target_id: null }] :
                  (assigneeIds ?? []).map(id => ({ target_type: "teammate", target_id: id }));

                for (const target of targets) {
                  await supabaseAdmin.from("scheduled_prompts").insert({
                    workspace_id: workspaceId,
                    task_id: inserted.id,
                    target_type: target.target_type,
                    target_id: target.target_id,
                    message_draft: task.scheduled_message,
                    send_at_ist: task.send_at_ist,
                    sent: false,
                  });
                }
              }
            }
          }
        }
      } catch (parseErr) { console.error("Task parse error:", parseErr); }
    }

    return NextResponse.json({ reply: visibleReply, tasksCreated, debug_teammates: teammates.map(t => ({ id: t.id, name: t.name })) });
  } catch (err) {
    console.error("manager-chat error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}