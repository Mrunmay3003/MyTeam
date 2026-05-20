const ONBOARDING_SYSTEM_PROMPT = `You are the Business Chat for MyTeam [a direct, intelligent async team coordination assistant. The user is a Founder or Manager, & manages a team on a visual canvas where each teammate appears as a draggable node. Each teammate has their own AI chat assistant. The manager can view teammate-AI chat logs to stay updated without interrupting flow] - a direct, warm business partner and consultant. In the initial user exchanges, ask short question (only one question; or those related to similar points only) at a time to learn: company name, industry, team size and roles, ongoing projects, flagship product(s), 1-2 year goals, and coordination challenges. After 4-5 exchanges or when you get enough info, stop asking questions entirely (do not extend the discussion) — (1) confirm you have stored their basic organisation info and timeline, (2) say something like "I've got a solid picture of [company]. I'll keep all of this in mind as we discuss business decisions and long-term plans here — reach out anytime." (3) recommend they now create a Manager Chat using the + icon on the canvas and add their teammates so they can start coordinating [saying this after initial 4-5 Chats is Must, do not miss out this recommendation]. (4) Also mention they can view their Business Profile using the Dropdown besides the 'Business Contest Chat Header', incase the Buesiness Profile has not been created, click on the 'Summarise Now' Button below. After this, shift permanently into advisor/consultant mode.
In advisor mode: give direct suggestions, short reactions, and concrete advice. Only ask a question if absolutely necessary and related to the topic. Adapt to the user's communication preferences. Keep responses short for simple comments. Go longer only when asked for strategy or detailed plans. Never over-explain. Boost the user's productivity — tell them what to do, not only what to think about. Draw on your existing knowledge to help with research and decision making — be upfront when something needs verification from current sources. CRITICAL CONVERSATION TONE RULE: Constantly read the user's energy. If the user gives a short reply or their message suggests they're done sharing for now — do NOT ask another question. Give a brief acknowledgement and stop. Avoid adding sign-off phrases like "catch you later", "talk soon", "see you", or any farewell constantly — the user will come back when ready, you don't need to say goodbye always. Only continue asking questions when the user is clearly engaged and sharing information. Never drag the conversation. The user has other things to do over this platform. You may suggest AI tools for specific tasks (research, drafting, strategy docs, pitching decks, data/situation analysis) when it genuinely adds value — but only naturally, never as a deflection. You have persistent memory of this business — it is injected into every session, so you always know the context.`;

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m.content === "string")
    .map((m) => ({
      role: (m.role === "assistant" || m.role === "memory_update") ? "assistant" : "user",
      content: m.content,
    }));
}
 
function getISTTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date());
}

/** Merge consecutive same-role turns (newline); drop leading turns until the first is `user`. */
function dedupeAlternateRoles(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const merged = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n${m.content}`;
    } else {
      merged.push({ role: m.role, content: m.content });
    }
  }
  while (merged.length > 0 && merged[0].role !== "user") {
    merged.shift();
  }
  return merged;
}
 
export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[/api/chat] incoming request body:", body);
    const { messages, workspaceId, chatType, forceSummary: forceSummaryFlag, detectOnly, userMessage, aiReply } = body ?? {};

    // Detection-only mode — cheap Haiku YES/NO check
    if (detectOnly && userMessage) {
      const detRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          system: "You are a memory detection assistant. Reply with YES or NO only. No other text.",
          messages: [{
            role: "user",
            content: `Did this conversation exchange contain new important business information worth remembering?\n\nAnswer YES if any of these apply:\n- New projects, products, timelines, deadlines, or milestones mentioned\n- Team changes, roles, or responsibilities\n- Goals, strategy decisions, or plans\n- User explicitly says "remember", "update", "note this", "add this", "store this", or similar\n- User corrects or clarifies previously shared information\n- Any specific dates, names, or numbers related to the business\n\nAnswer NO only if the message is purely conversational with zero new business info.\n\nAI said: "${(aiReply ?? "").slice(0, 500)}"\nUser replied: "${userMessage}"\n\nYES or NO:`
          }]
        }),
      });
      const detData = await detRes.json();
      const answer = detData.content?.[0]?.text?.trim().toUpperCase();
      return Response.json({ detected: answer === "YES" });
    }
 
    // Fetch business memory from Supabase to inject into system prompt
    let businessMemoryContext = "";
    if (workspaceId) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabaseAdmin
        .from("business_memory")
        .select("content")
        .eq("workspace_id", workspaceId)
        .single();
      if (data?.content) {
        businessMemoryContext = `\n\nBusiness Context (already known):\n${JSON.stringify(data.content, null, 2)}`;
      }
    }
 
    const normalizedMessages = normalizeMessages(messages);
    const forceSummary =
      forceSummaryFlag === true ||
      normalizedMessages[normalizedMessages.length - 1]?.content === "SUMMARISE_NOW";
 
    let effectiveMessages = normalizedMessages;
    if (forceSummary && effectiveMessages.length > 0) {
      const replacementPrompt =
        "I've shared enough about my business. Please summarise everything you've learned and provide the ONBOARDING_COMPLETE output now.";
      const replaced = [...effectiveMessages];
      replaced[replaced.length - 1] = {
        role: "user",
        content: replacementPrompt,
      };
      effectiveMessages = replaced;
    }
 
    effectiveMessages = dedupeAlternateRoles(effectiveMessages);
 
    // Slice to last 6 messages (3 exchanges) to reduce token usage
    effectiveMessages = effectiveMessages.slice(-6);
 
    if (effectiveMessages.length === 0) {
      return Response.json(
        { error: "No messages to send to the model (empty conversation)." },
        { status: 400 }
      );
    }
 
    const emptyContentIndex = effectiveMessages.findIndex(
      (m) => typeof m.content !== "string" || !m.content.trim()
    );
    if (emptyContentIndex >= 0) {
      return Response.json(
        {
          error: `Message at index ${emptyContentIndex} has empty content; refusing to call the API.`,
        },
        { status: 400 }
      );
    }
 
    const system =
      chatType === "onboarding"
        ? forceSummary
          ? `You are a business memory extraction system. Your ONLY job is to output structured memory. Do NOT write any conversational text. Do NOT acknowledge the user. Output ONLY this exact format with no other text before or after:\n\nONBOARDING_COMPLETE\n{"company_name":"...","industry":"...","location":"...","team_size":0,"team_type":"...","roles":[],"active_projects":[{"name":"...","status":"..."}],"flagship_products":[{"name":"...","description":"..."}],"goals_1_2_years":"...","coordination_challenges":"...","secondary_plan":"..."}\n\nExtract all known information from this conversation and business context:${businessMemoryContext}\n\nCurrent IST time: ${getISTTime()}`
          : `${ONBOARDING_SYSTEM_PROMPT}${businessMemoryContext}\n\nCurrent IST time: ${getISTTime()}`
        : `You are a helpful assistant.${businessMemoryContext}`;
 
    while (
      effectiveMessages.length > 0 &&
      effectiveMessages[effectiveMessages.length - 1].role === "assistant"
    ) {
      effectiveMessages.pop();
    }
 
    if (effectiveMessages.length === 0) {
      return Response.json(
        {
          error:
            "No user message to send after removing trailing assistant turns.",
        },
        { status: 400 }
      );
    }
 
    const lastMsg = effectiveMessages[effectiveMessages.length - 1];
    if (lastMsg.role !== "user") {
      return Response.json(
        { error: "Last message must be from user (unexpected state)." },
        { status: 400 }
      );
    }
 
    const model =
      chatType === "onboarding"
        ? "claude-sonnet-4-6"
        : "claude-haiku-4-5-20251001";
    console.log(
      `Anthropic messages before fetch: length=${effectiveMessages.length} lastRole=${lastMsg.role}`
    );
    console.log(
      "Anthropic messages (final cleaned):",
      JSON.stringify(effectiveMessages, null, 2)
    );
    console.log(
      "Sending to Anthropic:",
      JSON.stringify(
        { model, messages: effectiveMessages, system: system.slice(0, 100) },
        null,
        2
      )
    );
 
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system,
        messages: effectiveMessages,
      }),
    });
 
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", response.status, errorText);
      return Response.json(
        { error: `Anthropic API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }
 
    const data = await response.json();
    const content = data?.content;
    if (content == null || !Array.isArray(content) || content.length === 0) {
      return Response.json(
        {
          error:
            "Anthropic returned empty content. Raw response: " + JSON.stringify(data),
        },
        { status: 502 }
      );
    }
 
    const reply =
      data.content.find((item) => item?.type === "text")?.text ??
      "I could not generate a response.";
 
    return Response.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}