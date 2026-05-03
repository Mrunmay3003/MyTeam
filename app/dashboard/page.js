"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PLACEHOLDER_CHATS = ["Creatives", "Dev", "Outreach"];
const OPENING_MESSAGE =
  "Hey! Welcome to MyTeam. I am here to help set up your workspace. To get started, tell me a bit about your business — what do you do and who is on your team?";
const AUTO_SUMMARY_EXCHANGES = 5;
const ONBOARDING_COMPLETE = "ONBOARDING_COMPLETE";

/** Remove markdown ``` / ```json code fences so JSON.parse sees raw `{ ... }`. */
function stripMarkdownJsonFence(text) {
  return text
    .trim()
    .replace(/^`{3}(?:json)?\s*/i, "")
    .replace(/\s*`{3}\s*$/, "")
    .trim();
}

function ChevronLeftIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [onboardingChatId, setOnboardingChatId] = useState(null);
  const [onboardingMessages, setOnboardingMessages] = useState([]);
  const [onboardingInput, setOnboardingInput] = useState("");
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState(null);
  const [onboardingSuccess, setOnboardingSuccess] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const autoSummaryTriggeredRef = useRef(false);
  const contextScrollRef = useRef(null);
  const collapseTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace("/auth");
        return;
      }
      setUserId(session.user.id);
      setAuthReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!menuRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) {
        window.clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return;
    let cancelled = false;

    async function bootstrapOnboarding() {
      setOnboardingError(null);
      const workspace = await ensureWorkspace(userId);
      if (!workspace) {
        throw new Error("Unable to load workspace.");
      }
      if (cancelled) return;
      setWorkspaceId(workspace.id);

      const chat = await ensureOnboardingChat(workspace.id);
      if (!chat) {
        throw new Error("Unable to load onboarding chat.");
      }
      if (cancelled) return;
      setOnboardingChatId(chat.id);

      const { data: existingMessages, error: messagesError } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (messagesError) throw messagesError;
      if (cancelled) return;
      setOnboardingMessages(existingMessages ?? []);

      if ((existingMessages ?? []).some((m) => m.content?.includes(ONBOARDING_COMPLETE))) {
        setOnboardingComplete(true);
      }
    }

    bootstrapOnboarding().catch((error) => {
      if (cancelled) return;
      setOnboardingError(error.message ?? "Failed to load onboarding context.");
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  useEffect(() => {
    if (!contextScrollRef.current) return;
    contextScrollRef.current.scrollTop = contextScrollRef.current.scrollHeight;
  }, [onboardingMessages, contextOpen]);

  const onboardingUserMessageCount = useMemo(
    () =>
      onboardingMessages.filter(
        (m) => m.role === "user" && m.content && m.content !== "SUMMARISE_NOW"
      ).length,
    [onboardingMessages]
  );

  const remainingExchanges = Math.max(
    0,
    AUTO_SUMMARY_EXCHANGES - onboardingUserMessageCount
  );

  const contextMessages = onboardingMessages.length
    ? onboardingMessages
    : [{ id: "opening", role: "assistant", content: OPENING_MESSAGE }];

  useEffect(() => {
    if (
      !workspaceId ||
      !onboardingChatId ||
      onboardingBusy ||
      onboardingComplete ||
      autoSummaryTriggeredRef.current ||
      onboardingUserMessageCount < AUTO_SUMMARY_EXCHANGES
    ) {
      return;
    }
    autoSummaryTriggeredRef.current = true;
    submitOnboardingMessage("SUMMARISE_NOW", { showControlMessage: false }).catch(() => {
      autoSummaryTriggeredRef.current = false;
    });
  }, [
    onboardingBusy,
    onboardingChatId,
    onboardingComplete,
    onboardingUserMessageCount,
    workspaceId,
  ]);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  async function ensureWorkspace(currentUserId) {
    const directLookup = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", currentUserId)
      .limit(1)
      .maybeSingle();

    if (directLookup.data) return directLookup.data;

    const fallbackLookup = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", currentUserId)
      .limit(1)
      .maybeSingle();

    if (fallbackLookup.data) return fallbackLookup.data;

    const createWithUserId = await supabase
      .from("workspaces")
      .insert({ user_id: currentUserId, name: "MyTeam Workspace" })
      .select("id")
      .single();

    if (!createWithUserId.error) return createWithUserId.data;

    const createWithOwnerId = await supabase
      .from("workspaces")
      .insert({ owner_user_id: currentUserId, name: "MyTeam Workspace" })
      .select("id")
      .single();

    if (!createWithOwnerId.error) return createWithOwnerId.data;

    throw createWithOwnerId.error;
  }

  async function ensureOnboardingChat(currentWorkspaceId) {
    const existing = await supabase
      .from("chats")
      .select("id")
      .eq("workspace_id", currentWorkspaceId)
      .eq("type", "onboarding")
      .limit(1)
      .maybeSingle();

    if (existing.data) return existing.data;

    const created = await supabase
      .from("chats")
      .insert({
        workspace_id: currentWorkspaceId,
        type: "onboarding",
        name: "Business Context Onboarding",
      })
      .select("id")
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  function parseOnboardingPayload(replyText) {
    const markerIndex = replyText.indexOf(ONBOARDING_COMPLETE);
    if (markerIndex < 0) return null;
    const afterMarker = stripMarkdownJsonFence(
      replyText.slice(markerIndex + ONBOARDING_COMPLETE.length)
    );
    const firstBrace = afterMarker.indexOf("{");
    if (firstBrace < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let endIndex = -1;

    for (let i = firstBrace; i < afterMarker.length; i += 1) {
      const char = afterMarker[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex < 0) return null;
    const jsonText = afterMarker.slice(firstBrace, endIndex + 1);
    return JSON.parse(jsonText);
  }

  async function saveBusinessMemory(currentWorkspaceId, payload) {
    const profileRow = {
      workspace_id: currentWorkspaceId,
      profile: payload,
    };
    console.log("[business_memory] upsert (profile column)", profileRow);
    const upsertProfile = await supabase.from("business_memory").upsert(profileRow, {
      onConflict: "workspace_id",
    });

    if (upsertProfile.error) {
      console.log("[business_memory] upsert error (profile column)", upsertProfile.error);
    } else {
      return;
    }

    const expandedRow = {
      workspace_id: currentWorkspaceId,
      ...payload,
    };
    console.log("[business_memory] upsert (expanded columns)", expandedRow);
    const upsertExpanded = await supabase.from("business_memory").upsert(expandedRow, {
      onConflict: "workspace_id",
    });

    if (upsertExpanded.error) {
      console.log("[business_memory] upsert error (expanded columns)", upsertExpanded.error);
      throw upsertExpanded.error;
    }
  }

  const submitOnboardingMessage = useCallback(async (content, options = {}) => {
    const { showControlMessage = true } = options;
    if (!workspaceId || !onboardingChatId || onboardingBusy) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    setOnboardingError(null);
    setOnboardingSuccess(null);
    setOnboardingBusy(true);

    let nextMessages = onboardingMessages;
    const shouldPersistUserMessage = trimmed !== "SUMMARISE_NOW";

    try {
      if (shouldPersistUserMessage) {
        const insertedUserMessage = await supabase
          .from("messages")
          .insert({
            chat_id: onboardingChatId,
            role: "user",
            content: trimmed,
          })
          .select("id, role, content, created_at")
          .single();

        if (insertedUserMessage.error) throw insertedUserMessage.error;

        nextMessages = [...onboardingMessages, insertedUserMessage.data];
        setOnboardingMessages(nextMessages);
      } else if (showControlMessage) {
        nextMessages = [...onboardingMessages, { role: "user", content: trimmed }];
      }

      const apiMessages = nextMessages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

      const controlMessages =
        trimmed === "SUMMARISE_NOW" ? [...apiMessages, { role: "user", content: "SUMMARISE_NOW" }] : apiMessages;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: controlMessages,
          workspaceId,
          chatType: "onboarding",
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error ?? "Failed to get assistant response.");
      }

      const insertedAssistantMessage = await supabase
        .from("messages")
        .insert({
          chat_id: onboardingChatId,
          role: "assistant",
          content: payload.reply,
        })
        .select("id, role, content, created_at")
        .single();

      if (insertedAssistantMessage.error) throw insertedAssistantMessage.error;

      setOnboardingMessages((prev) => [...prev, insertedAssistantMessage.data]);

      if (payload.reply.includes(ONBOARDING_COMPLETE)) {
        autoSummaryTriggeredRef.current = true;
        setOnboardingComplete(true);

        const parsed = parseOnboardingPayload(payload.reply);
        if (!parsed) {
          throw new Error("Could not parse onboarding summary payload.");
        }
        await saveBusinessMemory(workspaceId, parsed);
        setOnboardingSuccess("Business profile saved!");
        return;
      }
    } catch (error) {
      setOnboardingError(error.message ?? "Something went wrong.");
    } finally {
      setOnboardingBusy(false);
      setOnboardingInput("");
    }
  }, [onboardingBusy, onboardingChatId, onboardingMessages, workspaceId]);

  useEffect(() => {
    if (onboardingSuccess !== "Business profile saved!") return;
    setContextOpen(true);
    if (collapseTimeoutRef.current) {
      window.clearTimeout(collapseTimeoutRef.current);
    }
    collapseTimeoutRef.current = window.setTimeout(() => {
      setContextOpen(false);
    }, 2000);
  }, [onboardingSuccess]);

  async function handleOnboardingSubmit(event) {
    event.preventDefault();
    await submitOnboardingMessage(onboardingInput);
  }

  if (!authReady) {
    return null;
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-zinc-900 font-sans text-zinc-100">
      <header className="flex h-12 shrink-0 items-center justify-end border-b border-zinc-800 bg-zinc-900 px-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200 ring-1 ring-zinc-600 transition-colors hover:bg-zinc-600"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            Me
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/40"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80"
                onClick={handleSignOut}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — chats */}
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Teammate chats
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2" aria-label="Chats">
            <ul className="space-y-0.5">
              {PLACEHOLDER_CHATS.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => setSelectedChat(name)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedChat === name
                        ? "bg-zinc-800 text-zinc-50"
                        : "text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-zinc-800 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
              aria-label="Add new chat"
            >
              <PlusIcon className="shrink-0 opacity-80" />
              New chat
            </button>
          </div>
        </aside>

        {/* Centre — chat */}
        <main className="flex min-w-0 flex-1 flex-col bg-zinc-900">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                  <p className="max-w-sm text-center text-sm text-zinc-500">
                    Select or create a manager chat
                  </p>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
              <div className="mx-auto flex max-w-3xl gap-2">
                <input
                  type="text"
                  placeholder="Message…"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30"
                  aria-label="Message input"
                />
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right — business context */}
        <aside
          className={`flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out ${
            contextOpen ? "w-[300px]" : "w-11"
          }`}
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
            {contextOpen ? (
              <>
                <h2 className="truncate px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Business Context
                </h2>
                <button
                  type="button"
                  onClick={() => setContextOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Collapse business context panel"
                >
                  <ChevronRightIcon />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setContextOpen(true)}
                className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                aria-label="Expand business context panel"
              >
                <ChevronLeftIcon />
              </button>
            )}
          </div>
          {contextOpen && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={contextScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {contextMessages.map((message, index) => {
                  const key = message.id ?? `${message.role}-${index}`;
                  const assistant = message.role === "assistant";
                  return (
                    <div
                      key={key}
                      className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        assistant
                          ? "mr-auto bg-zinc-800 text-zinc-200"
                          : "ml-auto bg-zinc-700 text-zinc-100"
                      }`}
                    >
                      {message.content}
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 border-t border-zinc-800 p-3">
                {onboardingError && (
                  <p className="mb-2 rounded-md border border-red-900/50 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-300">
                    {onboardingError}
                  </p>
                )}
                {onboardingSuccess && (
                  <p className="mb-2 rounded-md border border-emerald-900/50 bg-emerald-950/40 px-2.5 py-1.5 text-xs text-emerald-200">
                    {onboardingSuccess}
                  </p>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] text-zinc-500">
                    {remainingExchanges} exchanges before auto-summary
                  </p>
                  {onboardingUserMessageCount >= 2 && !onboardingComplete && (
                    <button
                      type="button"
                      onClick={() => submitOnboardingMessage("SUMMARISE_NOW", { showControlMessage: false })}
                      disabled={onboardingBusy}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Summarise Now
                    </button>
                  )}
                </div>

                <form onSubmit={handleOnboardingSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={onboardingInput}
                    onChange={(event) => setOnboardingInput(event.target.value)}
                    placeholder="Reply..."
                    disabled={onboardingBusy}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30 disabled:opacity-50"
                    aria-label="Business context onboarding input"
                  />
                  <button
                    type="submit"
                    disabled={onboardingBusy || !onboardingInput.trim()}
                    className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
