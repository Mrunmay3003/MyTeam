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

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, workspaceId, chatType } = body ?? {};
    void workspaceId;
    const normalizedMessages = normalizeMessages(messages);
    const forceSummary =
      normalizedMessages[normalizedMessages.length - 1]?.content === "SUMMARISE_NOW";

    const effectiveMessages = forceSummary
      ? normalizedMessages.slice(0, -1)
      : normalizedMessages;

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

    const model = "claude-haiku-4-5-20251001";
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
    const reply =
      data?.content?.find((item) => item?.type === "text")?.text ??
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
