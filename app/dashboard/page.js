"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INITIAL_TEAMMATES = ["Creatives", "Dev", "Outreach"];
const OPENING_MESSAGE =
  "Hey! Welcome to MyTeam. I am here to help set up your workspace. To get started, tell me a bit about your business — what do you do and who is on your team?";
const AUTO_SUMMARY_EXCHANGES = 5;
const BUSINESS_PROFILE_SAVED_MESSAGE =
  "✅ Business Profile saved! We will update it from time to time as we discuss here in this Business Context panel.";

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

function ChevronLeftIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CanvasIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
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
  const [summariseConfirmLoading, setSummariseConfirmLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextOpen, setContextOpen] = useState(true);
  const [contextWidth, setContextWidth] = useState(300);
  const [menuOpen, setMenuOpen] = useState(false);

  // Centre view: 'canvas' | 'chat'
  const [centreView, setCentreView] = useState("canvas");
  const [activeChat, setActiveChat] = useState(null);

  // Teammate list (dynamic)
  const [teammates, setTeammates] = useState(INITIAL_TEAMMATES);

  // Canvas pan / zoom
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const canvasContainerRef = useRef(null);
  const canvasInitializedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const menuRef = useRef(null);
  const autoSummaryTriggeredRef = useRef(false);
  const businessProfileSaveCompleteRef = useRef(false);
  const contextScrollRef = useRef(null);
  const isResizingRef = useRef(false);

  // Centre canvas init — snap + button to middle of container
  useEffect(() => {
    if (centreView !== "canvas" || !canvasContainerRef.current || canvasInitializedRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    setCanvasOffset({ x: rect.width / 2, y: rect.height / 2 });
    canvasInitializedRef.current = true;
  }, [centreView]);

  // Middle-mouse pan
  function handleCanvasMouseDown(e) {
    if (e.button !== 1) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };

    function onMouseMove(e) {
      if (!isPanningRef.current) return;
      setCanvasOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    }
    function onMouseUp() {
      isPanningRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // Scroll-wheel zoom toward cursor
  function handleCanvasWheel(e) {
    e.preventDefault();
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(3, Math.max(0.2, canvasScale * factor));
    const ratio = newScale / canvasScale;
    setCanvasScale(newScale);
    setCanvasOffset({
      x: mouseX - (mouseX - canvasOffset.x) * ratio,
      y: mouseY - (mouseY - canvasOffset.y) * ratio,
    });
  }

  // Right panel drag resize
  function startContextResize(e) {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = contextWidth;
    function onMouseMove(e) {
      if (!isResizingRef.current) return;
      const delta = startX - e.clientX;
      const maxWidth = window.innerWidth * 0.5;
      setContextWidth(Math.min(maxWidth, Math.max(220, startWidth + delta)));
    }
    function onMouseUp() {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // Auth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { router.replace("/auth"); return; }
      setUserId(session.user.id);
      setAuthReady(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return;
    let cancelled = false;
    async function bootstrapOnboarding() {
      setOnboardingError(null);
      const workspace = await ensureWorkspace(userId);
      if (!workspace) throw new Error("Unable to load workspace.");
      if (cancelled) return;
      setWorkspaceId(workspace.id);
      const chat = await ensureOnboardingChat(workspace.id);
      if (!chat) throw new Error("Unable to load onboarding chat.");
      if (cancelled) return;
      setOnboardingChatId(chat.id);
      const { data: existingMessages, error: messagesError } = await supabase
        .from("messages").select("id, role, content, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (messagesError) throw messagesError;
      if (cancelled) return;
      setOnboardingMessages(existingMessages ?? []);
    }
    bootstrapOnboarding().catch((err) => {
      if (cancelled) return;
      setOnboardingError(err.message ?? "Failed to load onboarding context.");
    });
    return () => { cancelled = true; };
  }, [authReady, userId]);

  useEffect(() => {
    if (!contextScrollRef.current) return;
    contextScrollRef.current.scrollTop = contextScrollRef.current.scrollHeight;
  }, [onboardingMessages, contextOpen]);

  const onboardingUserMessageCount = useMemo(
    () => onboardingMessages.filter(
      (m) => m.role === "user" && typeof m.content === "string" && m.content.trim() && m.content !== "SUMMARISE_NOW"
    ).length,
    [onboardingMessages]
  );

  const remainingExchanges = Math.max(0, AUTO_SUMMARY_EXCHANGES - onboardingUserMessageCount);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  async function ensureWorkspace(currentUserId) {
    const d = await supabase.from("workspaces").select("id").eq("user_id", currentUserId).limit(1).maybeSingle();
    if (d.data) return d.data;
    const f = await supabase.from("workspaces").select("id").eq("owner_user_id", currentUserId).limit(1).maybeSingle();
    if (f.data) return f.data;
    const c1 = await supabase.from("workspaces").insert({ user_id: currentUserId, name: "MyTeam Workspace" }).select("id").single();
    if (!c1.error) return c1.data;
    const c2 = await supabase.from("workspaces").insert({ owner_user_id: currentUserId, name: "MyTeam Workspace" }).select("id").single();
    if (!c2.error) return c2.data;
    throw c2.error;
  }

  async function ensureOnboardingChat(currentWorkspaceId) {
    const existing = await supabase.from("chats").select("id").eq("workspace_id", currentWorkspaceId).eq("type", "onboarding").limit(1).maybeSingle();
    if (existing.data) return existing.data;
    const created = await supabase.from("chats").insert({ workspace_id: currentWorkspaceId, type: "onboarding", name: "Business Context Onboarding" }).select("id").single();
    if (created.error) throw created.error;
    const { error: openingError } = await supabase.from("messages").insert({ chat_id: created.data.id, role: "assistant", content: OPENING_MESSAGE });
    if (openingError) throw openingError;
    return created.data;
  }

  const saveBusinessMemoryFromReply = useCallback(async (replyText, options = {}) => {
    const { appendConfirmation = false } = options;
    const oc = replyText.indexOf("ONBOARDING_COMPLETE");
    if (oc === -1) return false;
    const raw = replyText.slice(oc + "ONBOARDING_COMPLETE".length);
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return false;
    const parsedJson = JSON.parse(cleaned.slice(start, end + 1));
    const res = await fetch("/api/save-business-memory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, content: parsedJson }),
    });
    const resJson = await res.json().catch(() => ({}));
    if (!res.ok) { console.error("Save failed:", resJson?.error ?? res.status); return false; }
    if (appendConfirmation && !businessProfileSaveCompleteRef.current) {
      const ins = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "assistant", content: BUSINESS_PROFILE_SAVED_MESSAGE }).select("id, role, content, created_at").single();
      if (ins.error) throw ins.error;
      businessProfileSaveCompleteRef.current = true;
      setOnboardingMessages((prev) => [...prev, ins.data]);
    }
    return true;
  }, [onboardingChatId, workspaceId]);

  const runSilentBackgroundSummary = useCallback(async (messagesForSummary) => {
    if (!workspaceId || !onboardingChatId || autoSummaryTriggeredRef.current || businessProfileSaveCompleteRef.current) return;
    autoSummaryTriggeredRef.current = true;
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: messagesForSummary, workspaceId, chatType: "onboarding", forceSummary: true }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.reply) { autoSummaryTriggeredRef.current = false; return; }
      await saveBusinessMemoryFromReply(payload.reply, { appendConfirmation: true });
    } catch (err) {
      console.error("Silent summary error:", err);
      autoSummaryTriggeredRef.current = false;
    }
  }, [onboardingChatId, saveBusinessMemoryFromReply, workspaceId]);

  const submitOnboardingMessage = useCallback(async (content) => {
    if (!workspaceId || !onboardingChatId || onboardingBusy) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    setOnboardingError(null);
    setOnboardingBusy(true);
    let nextMessages = onboardingMessages;
    const shouldPersist = trimmed !== "SUMMARISE_NOW";
    try {
      if (shouldPersist) {
        const ins = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "user", content: trimmed }).select("id, role, content, created_at").single();
        if (ins.error) throw ins.error;
        nextMessages = [...onboardingMessages, ins.data];
        setOnboardingMessages(nextMessages);
      }
      const apiMessages = nextMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      const controlMessages = trimmed === "SUMMARISE_NOW" ? [...apiMessages, { role: "user", content: "SUMMARISE_NOW" }] : apiMessages;
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: controlMessages, workspaceId, chatType: "onboarding", forceSummary: trimmed === "SUMMARISE_NOW" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.reply) {
        const errMsg = (typeof payload.error === "string" && payload.error.trim()) || `Chat request failed (${response.status}).`;
        const errIns = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "assistant", content: errMsg }).select("id, role, content, created_at").single();
        if (errIns.error) setOnboardingError(errMsg);
        else setOnboardingMessages((prev) => [...prev, errIns.data]);
        return;
      }
      const asstIns = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "assistant", content: payload.reply }).select("id, role, content, created_at").single();
      if (asstIns.error) throw asstIns.error;
      setOnboardingMessages((prev) => [...prev, asstIns.data]);
      const countAfter = nextMessages.filter(
        (m) => m.role === "user" && typeof m.content === "string" && m.content.trim() && m.content !== "SUMMARISE_NOW"
      ).length;
      if (shouldPersist && countAfter >= AUTO_SUMMARY_EXCHANGES && !businessProfileSaveCompleteRef.current) {
        void runSilentBackgroundSummary([
          ...nextMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
          { role: "assistant", content: payload.reply },
        ]);
      }
    } catch (err) {
      setOnboardingError(err.message ?? "Something went wrong.");
    } finally {
      setOnboardingBusy(false);
      setOnboardingInput("");
    }
  }, [onboardingBusy, onboardingChatId, onboardingMessages, runSilentBackgroundSummary, workspaceId]);

  async function handleSummariseNowClick() {
    if (!onboardingChatId || onboardingBusy || summariseConfirmLoading) return;
    setSummariseConfirmLoading(true);
    setOnboardingError(null);
    try {
      await runSilentBackgroundSummary(onboardingMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })));
    } catch (err) {
      setOnboardingError(err.message ?? "Failed to generate and save summary.");
    } finally {
      setSummariseConfirmLoading(false);
    }
  }

  async function handleOnboardingSubmit(e) {
    e.preventDefault();
    await submitOnboardingMessage(onboardingInput);
  }

  function openTeammateChat(name) {
    setActiveChat(name);
    setCentreView("chat");
  }

  function closeTeammateChat() {
    setActiveChat(null);
    setCentreView("canvas");
  }

  function goToCanvas() {
    setActiveChat(null);
    setCentreView("canvas");
  }

  function handleAddTeammate() {
    const name = `Team ${teammates.length + 1}`;
    setTeammates((prev) => [...prev, name]);
  }

  if (!authReady) return null;

  return (
    <div className="flex h-screen min-h-0 flex-col bg-zinc-900 font-sans text-zinc-100">

      {/* Header */}
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
            <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/40">
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80" onClick={() => setMenuOpen(false)}>Profile</button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80" onClick={handleSignOut}>Log Out</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">

        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside
          style={{ width: sidebarOpen ? "260px" : "52px" }}
          className="relative flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out overflow-hidden"
        >
          {/* Sidebar header */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
            {sidebarOpen ? (
              <>
                <p className="truncate px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Teammate Chats
                </p>
                <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Collapse sidebar">
                  <ChevronLeftIcon />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Expand sidebar">
                <ChevronRightIcon />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-2" aria-label="Chats">
            <ul className="space-y-1">

              {/* Canvas home button */}
              <li>
                {sidebarOpen ? (
                  <button
                    type="button"
                    onClick={goToCanvas}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${centreView === "canvas" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"}`}
                  >
                    <CanvasIcon className="shrink-0" />
                    Canvas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToCanvas}
                    title="Canvas"
                    className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full transition-colors ${centreView === "canvas" ? "bg-zinc-700 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}
                  >
                    <CanvasIcon className="h-4 w-4" />
                  </button>
                )}
              </li>

              {/* Divider */}
              <li aria-hidden><div className="my-1 mx-1 border-t border-zinc-800" /></li>

              {/* Teammate buttons */}
              {teammates.map((name) => (
                <li key={name}>
                  {sidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => openTeammateChat(name)}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeChat === name && centreView === "chat" ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/60"}`}
                    >
                      {name}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openTeammateChat(name)}
                      title={name}
                      className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold transition-colors ${activeChat === name && centreView === "chat" ? "bg-zinc-600 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}
                    >
                      {getInitials(name)}
                    </button>
                  )}
                </li>
              ))}

              {/* + New chat — immediately after list */}
              <li>
                {sidebarOpen ? (
                  <button
                    type="button"
                    onClick={handleAddTeammate}
                    className="mt-0.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
                    aria-label="Add new teammate chat"
                  >
                    <PlusIcon className="h-4 w-4 shrink-0 opacity-80" />
                    New chat
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddTeammate}
                    title="New chat"
                    className="mt-0.5 flex h-8 w-8 mx-auto items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-300"
                    aria-label="Add new teammate chat"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </li>

            </ul>
          </nav>

          {/* Settings */}
          <div className="border-t border-zinc-800 p-2">
            {sidebarOpen ? (
              <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Settings">
                <SettingsIcon className="shrink-0" />
                Settings
              </button>
            ) : (
              <button type="button" title="Settings" className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Settings">
                <SettingsIcon />
              </button>
            )}
          </div>
        </aside>

        {/* ── Centre Panel ──────────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col bg-zinc-900 overflow-hidden">

          {centreView === "canvas" ? (
            /* CANVAS */
            <div
              ref={canvasContainerRef}
              className="relative flex-1 overflow-hidden select-none"
              onMouseDown={handleCanvasMouseDown}
              onWheel={handleCanvasWheel}
            >
              {/* Dot grid background */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)",
                  backgroundSize: `${28 * canvasScale}px ${28 * canvasScale}px`,
                  backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
                  opacity: 0.5,
                }}
              />

              {/* Canvas world */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transformOrigin: "0 0",
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
                }}
              >
                {/* Big + button centered at world origin */}
                <div style={{ position: "absolute", left: -120, top: -44 }}>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-900/80 text-zinc-400 transition-all hover:border-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 active:scale-95"
                    style={{ width: 240, height: 88 }}
                    aria-label="Create manager chat"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800">
                      <PlusIcon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium">Create Manager Chat</span>
                  </button>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 pointer-events-none text-[11px] text-zinc-600 select-none">
                Scroll to zoom · Middle-click drag to pan
              </div>
            </div>

          ) : (
            /* TEAMMATE CHAT */
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
                <h2 className="text-sm font-semibold text-zinc-200">{activeChat}</h2>
                <button
                  type="button"
                  onClick={closeTeammateChat}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  aria-label="Close chat, return to canvas"
                >
                  <XIcon />
                </button>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center px-6">
                <p className="text-sm text-zinc-500">
                  Chat log for <span className="text-zinc-300 font-medium">{activeChat}</span> will appear here.
                </p>
              </div>

              <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
                <div className="mx-auto flex max-w-3xl gap-2">
                  <input
                    type="text"
                    placeholder={`Message ${activeChat}…`}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30"
                    aria-label="Message input"
                  />
                  <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 opacity-50">Send</button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ── Right Panel — Business Context ────────────────────────────────── */}
        <aside
          style={{ width: contextOpen ? `${contextWidth}px` : "44px" }}
          className="relative flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out"
        >
          {contextOpen && (
            <div onMouseDown={startContextResize} className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 hover:bg-zinc-600/60 transition-colors" />
          )}

          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
            {contextOpen ? (
              <>
                <h2 className="truncate px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Business Context</h2>
                <button type="button" onClick={() => setContextOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Collapse business context panel">
                  <ChevronRightIcon />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setContextOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Expand business context panel">
                <ChevronLeftIcon />
              </button>
            )}
          </div>

          {contextOpen && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={contextScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {onboardingMessages.map((message, index) => {
                  const key = message.id ?? `${message.role}-${index}`;
                  const assistant = message.role === "assistant";
                  return (
                    <div key={key} className={`max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${assistant ? "mr-auto bg-zinc-800 text-zinc-200" : "ml-auto bg-zinc-700 text-zinc-100"}`}>
                      {message.content}
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 border-t border-zinc-800 p-3">
                {onboardingError && (
                  <p className="mb-2 rounded-md border border-red-900/50 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-300">{onboardingError}</p>
                )}
                {onboardingUserMessageCount < AUTO_SUMMARY_EXCHANGES && !businessProfileSaveCompleteRef.current && (
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] text-zinc-500">{remainingExchanges} exchanges before auto-summary</p>
                    {onboardingUserMessageCount >= 2 && (
                      <button type="button" onClick={() => void handleSummariseNowClick()} disabled={onboardingBusy || summariseConfirmLoading} className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
                        Summarise Now
                      </button>
                    )}
                  </div>
                )}
                <form onSubmit={handleOnboardingSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={onboardingInput}
                    onChange={(e) => setOnboardingInput(e.target.value)}
                    placeholder="Reply..."
                    disabled={onboardingBusy}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30 disabled:opacity-50"
                    aria-label="Business context onboarding input"
                  />
                  <button type="submit" disabled={onboardingBusy || !onboardingInput.trim()} className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
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