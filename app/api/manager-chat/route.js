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
      .from("manager_tasks").select("title, description, task_type, assignee_ids, deadline_ist, priority, status, feedback")
      .eq("workspace_id", workspaceId).in("status", ["pending", "in_progress"]).order("priority", { ascending: true });

    const tasksContext = activeTasks?.length > 0
      ? activeTasks.map((t, i) => {
          const assigneeName = t.assignee_ids?.length
            ? (teammates.find(tm => tm.id === t.assignee_ids[0])?.name ?? "Unknown")
            : "All teammates";
          const deadline = t.deadline_ist
            ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(t.deadline_ist))
            : "No deadline";
          const fb = t.feedback ? ` ⚠ Teammate feedback: "${t.feedback}"` : "";
          return `${i + 1}. [${t.status.toUpperCase()}] ${t.title} — ${assigneeName} — Due: ${deadline} — Priority: ${t.priority}${fb}`;
        }).join("\n")
      : "No active tasks.";

    const teammateList = teammates.length > 0
      ? teammates.map(t => `- ${t.name}${t.assignedEmail ? ` (${t.assignedEmail})` : ""}`).join("\n")
      : "No teammates added yet.";

    const hasFeedback = activeTasks?.some(t => t.feedback);

    const systemPrompt = `You are the Manager Chat AI for MyTeam — a direct, intelligent async team coordination assistant.

Current IST time: ${getISTTime()}

Business Context (from Business Chat memory):
${businessContext}

Active Tasks:
${tasksContext}

Teammate Chats available:
${teammateList}

${hasFeedback ? `⚠ IMPORTANT: The following tasks have unread feedback from teammates — mention these AT THE START of your very first response, before anything else:
${activeTasks?.filter(t => t.feedback).map(t => `- "${t.title}": ${t.feedback}`).join("\n")}` : ""}

Your behaviour:
1. Help assign tasks, set deadlines, coordinate the team — this is your primary job.
2. Reference active tasks naturally during conversation when relevant.
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
- Never question who the manager assigns a task to. If they say "Satyen", assign to Satyen. Period.
- Never draft the message out loud to the manager. Just confirm the task is saved and who it's going to.
- Keep confirmations to 1-2 lines max.

MANAGER_TASKS_UPDATE
[{"title":"short label","description":"full details","task_type":"teammate_task","assignee_name":"exact name from list or null","deadline_ist":"ISO8601 with +05:30 or null","priority":1,"scheduled_message":"opening line for teammate"}]

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
    const markerIdx = fullReply.indexOf(marker);
    const visibleReply = markerIdx !== -1 ? fullReply.slice(0, markerIdx).trim() : fullReply;

    // Clear surfaced feedback after manager sees it
    if (hasFeedback) {
      await supabaseAdmin.from("manager_tasks")
        .update({ feedback: null, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "in_progress"])
        .not("feedback", "is", null);
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
            // Fuzzy assignee match
            let assigneeIds = null;
            if (task.assignee_name && task.task_type === "teammate_task") {
              const match = teammates.find(t =>
                t.name.toLowerCase().includes(task.assignee_name.toLowerCase()) ||
                task.assignee_name.toLowerCase().includes(t.name.toLowerCase())
              );
              if (match) assigneeIds = [match.id];
            }

            console.log("assignee match attempt:", { assignee_name: task.assignee_name, teammates: teammates.map(t => t.name), matched: assigneeIds });

            // Check if task with same title already exists — UPDATE instead of INSERT
            const { data: existing } = await supabaseAdmin
              .from("manager_tasks")
              .select("id")
              .eq("workspace_id", workspaceId)
              .ilike("title", task.title)
              .maybeSingle();

            if (existing) {
              // UPDATE existing task
              const updateData = {
                description: task.description,
                deadline_ist: task.deadline_ist ?? null,
                priority: task.priority ?? 3,
                status: "pending",
                updated_at: new Date().toISOString(),
              };
              if (assigneeIds) updateData.assignee_ids = assigneeIds;
              await supabaseAdmin.from("manager_tasks").update(updateData).eq("id", existing.id);
              tasksCreated++;
            } else {
              // INSERT new task
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

              if (task.deadline_ist && task.scheduled_message && inserted) {
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
                    send_at_ist: task.deadline_ist,
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