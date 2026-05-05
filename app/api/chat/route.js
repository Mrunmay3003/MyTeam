const ONBOARDING_SYSTEM_PROMPT =
  "You are a warm, friendly onboarding assistant for MyTeam. Learn about the user's business by asking ONE question at a time. Cover: company name, industry, team size and roles, ongoing projects, flagship product, 1-2 year goals, and main coordination challenges. Be conversational, not like a form. When you have enough information, respond with exactly ONBOARDING_COMPLETE followed by a JSON object with keys: companyName, industry, teamSize, roles, ongoingProjects, flagshipProduct, goals, challenges. After the JSON object, on a new line write SUGGESTIONS: followed by a comma-separated list of recommended teammate chat names based on the roles you learned about.";

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m.content === "string")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
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
    const { messages, workspaceId, chatType, forceSummary: forceSummaryFlag } = body ?? {};
    void workspaceId;
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
          ? `${ONBOARDING_SYSTEM_PROMPT}\n\nThe user asked for a summary now. Respond immediately with the required ONBOARDING_COMPLETE, JSON object, and SUGGESTIONS line format.`
          : ONBOARDING_SYSTEM_PROMPT
        : "You are a helpful assistant.";

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

    const model = "claude-haiku-4-5-20251001";
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
