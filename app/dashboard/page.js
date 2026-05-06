"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const OPENING_MESSAGE =
  "Hey! Welcome to MyTeam. I am here to help set up your workspace. To get started, tell me a bit about your business — what do you do and who is on your team?";
const AUTO_SUMMARY_EXCHANGES = 5;
const BUSINESS_PROFILE_SAVED_MESSAGE =
  "✅ Business Profile saved! We will update it from time to time as we discuss here in this Business Context panel.";

// Default manager node size
const MGR_W = 480;
const MGR_CHAT_H = 440;

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

// ── Icons ────────────────────────────────────────────────────────────────────

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
function ChevronDownIcon({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
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

// ── New Chat Modal ────────────────────────────────────────────────────────────

function NewChatModal({ title, onClose, onCreate, existingNames = [] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists. Please choose a different name.`);
      return;
    }
    onCreate(trimmed);
    onClose();
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onMouseDown={handleBackdrop}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/60">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500" htmlFor="chat-name">Name</label>
            <input
              ref={inputRef}
              id="chat-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Member or role name…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────

function ContextMenu({ x, y, onNewChat, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (!ref.current?.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("contextmenu", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("contextmenu", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/50"
      style={{ left: x, top: y, minWidth: 180 }}
    >
      <button
        type="button"
        onClick={() => { onNewChat(); onClose(); }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700/80"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-zinc-500 text-zinc-400">
          <PlusIcon className="h-3 w-3" />
        </span>
        New Teammate Chat
      </button>
      <div className="my-1 mx-2 border-t border-zinc-700" />
      <button
        type="button"
        onClick={() => { onDelete(); onClose(); }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-zinc-700/80"
      >
        Delete Chat
      </button>
    </div>
  );
}

// ── useDrag hook ──────────────────────────────────────────────────────────────
// Returns { pos, onHeaderMouseDown } — drag only starts from the header

function useDrag(initialPos) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onHeaderMouseDown = useCallback((e) => {
    // Only primary button, ignore clicks on buttons inside header
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    function onMove(e) {
      if (!dragging.current) return;
      setPos({
        x: start.current.px + (e.clientX - start.current.mx),
        y: start.current.py + (e.clientY - start.current.my),
      });
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos]);

  return { pos, setPos, onHeaderMouseDown };
}

// ── Manager Chat Node ─────────────────────────────────────────────────────────

function ManagerChatNode({ node, onToggleChat, onHeaderMouseDown }) {
  const headerH = 48;

  return (
    <div
      style={{
        position: "absolute",
        left: node.pos.x,
        top: node.pos.y,
        width: MGR_W,
        zIndex: 10,
      }}
    >
      <div className="rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl shadow-black/60">
        {/* Drag header */}
        <div
          className="flex items-center justify-between gap-2 px-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none"
          style={{ height: headerH, background: "rgba(39,39,42,0.95)" }}
          onMouseDown={onHeaderMouseDown}
        >
          <span className="truncate text-base font-bold text-zinc-100">{node.name}</span>
          <button
            type="button"
            onClick={onToggleChat}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${node.chatOpen ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
            aria-label="Toggle chat"
          >
            <ChevronDownIcon
              className={`transition-transform duration-200 ${node.chatOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Inline chat panel */}
        {node.chatOpen && (
          <div className="border-t border-zinc-800 rounded-b-2xl overflow-hidden">
            <div className="overflow-y-auto p-4 space-y-2" style={{ height: MGR_CHAT_H }}>
              <p className="text-xs text-zinc-600 text-center pt-10">
                Chat with <span className="text-zinc-400 font-medium">{node.name}</span> will appear here.
              </p>
            </div>
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Message ${node.name}…`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30"
                />
                <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 opacity-50">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Teammate Header Node ──────────────────────────────────────────────────────

function TeammateNode({ node, onHeaderMouseDown, onDoubleClick }) {
  return (
    <div
      style={{
        position: "absolute",
        left: node.pos.x,
        top: node.pos.y,
        zIndex: 5,
      }}
    >
      <div
        className="flex items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800 px-5 cursor-grab active:cursor-grabbing select-none shadow-lg shadow-black/40"
        style={{ height: 44, minWidth: 140, maxWidth: 220 }}
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={onDoubleClick}
        title="Double-click to open chat"
      >
        <span className="truncate text-sm font-semibold text-zinc-200">{node.name}</span>
      </div>
    </div>
  );
}

// ── Connection Lines SVG overlay ──────────────────────────────────────────────
// Renders curved lines in canvas-world space (no transform needed — we position
// absolutely inside the same world div, so coordinates are in world-space px)

function ConnectionLines({ managerNode, teammateNodes }) {
  if (!managerNode) return null;

  const mgrHeaderH = 48;
  const mgrSendBarH = 57; // border + padding + input row

  const mgrTotalH = managerNode.chatOpen
    ? mgrHeaderH + MGR_CHAT_H + mgrSendBarH
    : mgrHeaderH;

  const mgrBottom = {
    x: managerNode.pos.x + MGR_W / 2,
    y: managerNode.pos.y + mgrTotalH,
  };

  return (
    <>
      {teammateNodes.map((tm) => {
        const tmTop = {
          x: tm.pos.x + TM_NODE_W / 2,
          y: tm.pos.y,
        };

        const dy = tmTop.y - mgrBottom.y;
        const absDy = Math.abs(dy);
        const cp1y = mgrBottom.y + absDy * 0.45;
        const cp2y = tmTop.y - absDy * 0.25;

        const d = `M ${mgrBottom.x} ${mgrBottom.y} C ${mgrBottom.x} ${cp1y}, ${tmTop.x} ${cp2y}, ${tmTop.x} ${tmTop.y}`;

        return (
          <svg
            key={tm.id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <path
              d={d}
              fill="none"
              stroke="rgba(161,161,170,0.30)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      })}
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

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
  const [contextWidth, setContextWidth] = useState(600);
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal: null | 'teammate' | 'manager'
  const [modalType, setModalType] = useState(null);

  // Centre view
  const [centreView, setCentreView] = useState("canvas");
  const [activeChat, setActiveChat] = useState(null);

  // Teammate list (sidebar)
  const [teammates, setTeammates] = useState([]);

  // Manager node — only ONE ever. null = not yet created.
  const [managerNode, setManagerNode] = useState(null);
  // { id, name, chatOpen, pos: { x, y } }

  // Teammate canvas nodes
  const [teammateNodes, setTeammateNodes] = useState([]);
  // { id, name, pos: { x, y } }

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y }

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

  // ── Canvas init ──
  useEffect(() => {
    if (centreView !== "canvas" || !canvasContainerRef.current || canvasInitializedRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    setCanvasOffset({ x: rect.width / 2, y: rect.height / 2 });
    canvasInitializedRef.current = true;
  }, [centreView]);

  // ── Middle-mouse pan ──
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

  // ── Scroll zoom ──
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

  // ── Right panel resize ──
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

  // ── Auth ──
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

  // All existing names (for duplicate check)
  const allNames = useMemo(() => {
    const names = [...teammates];
    if (managerNode) names.push(managerNode.name);
    return names;
  }, [teammates, managerNode]);

  // Spawn position for new teammate node
  function getNextTeammatePos(index) {
    const cols = 4;
    const colW = TM_NODE_W + 24;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const baseX = managerNode
      ? managerNode.pos.x + MGR_W / 2 - (Math.min(cols, teammates.length + 1) * colW) / 2 + col * colW
      : 80 + col * colW;
    const baseY = managerNode ? managerNode.pos.y + 48 + 120 + row * 80 : 220 + row * 80;
    return { x: baseX, y: baseY };
  }

  // Create teammate — from left panel + or from manager right-click
  function handleCreateTeammate(name) {
    const idx = teammates.length;
    const pos = getNextTeammatePos(idx);
    setTeammates((prev) => [...prev, name]);
    setTeammateNodes((prev) => [...prev, { id: Date.now(), name, pos }]);
  }

  // Create manager node
  function handleCreateManager(name) {
    setManagerNode({ id: Date.now(), name, chatOpen: false, pos: { x: -MGR_W / 2, y: -60 } });
  }

  // Toggle manager chat
  function toggleManagerChat() {
    setManagerNode((prev) => prev ? { ...prev, chatOpen: !prev.chatOpen } : prev);
  }

  // Delete manager
  function handleDeleteManager() {
    setManagerNode(null);
  }

  // Update manager pos (from drag)
  function setManagerPos(pos) {
    setManagerNode((prev) => prev ? { ...prev, pos } : prev);
  }

  // Update teammate pos
  function setTeammatePos(id, pos) {
    setTeammateNodes((prev) => prev.map((n) => n.id === id ? { ...n, pos } : n));
  }

  if (!authReady) return null;

  return (
    <>
      {/* Global thin scrollbar */}
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
        *::-webkit-scrollbar { width: 3px; height: 3px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 999px; }
        *::-webkit-scrollbar-thumb:hover { background-color: #52525b; }
        *::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        *::-webkit-scrollbar-corner { background: transparent; }
      `}</style>

      {/* Modals */}
      {modalType === "teammate" && (
        <NewChatModal
          title="New Teammate Chat"
          onClose={() => setModalType(null)}
          onCreate={handleCreateTeammate}
          existingNames={allNames}
        />
      )}
      {modalType === "manager" && (
        <NewChatModal
          title="New Manager Chat"
          onClose={() => setModalType(null)}
          onCreate={handleCreateManager}
          existingNames={allNames}
        />
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onNewChat={() => setModalType("teammate")}
          onDelete={handleDeleteManager}
          onClose={() => setCtxMenu(null)}
        />
      )}

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

          {/* ── Left Sidebar ── */}
          <aside
            style={{ width: sidebarOpen ? "260px" : "52px" }}
            className="relative flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out overflow-hidden"
          >
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
              {sidebarOpen ? (
                <>
                  <p className="truncate px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Utility</p>
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

            <nav className="flex-1 overflow-y-auto p-2" aria-label="Navigation">
              <ul className="space-y-1">
                {/* Canvas */}
                <li>
                  {sidebarOpen ? (
                    <button type="button" onClick={goToCanvas} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${centreView === "canvas" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"}`}>
                      <CanvasIcon className="shrink-0" />
                      Canvas
                    </button>
                  ) : (
                    <button type="button" onClick={goToCanvas} title="Canvas" className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full transition-colors ${centreView === "canvas" ? "bg-zinc-700 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}>
                      <CanvasIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>

                {/* Teammate Chats sub-label */}
                {sidebarOpen ? (
                  <li aria-hidden>
                    <p className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Teammate Chats</p>
                  </li>
                ) : (
                  <li aria-hidden><div className="my-1 mx-1 border-t border-zinc-800" /></li>
                )}

                {/* Teammate list */}
                {teammates.map((name) => (
                  <li key={name}>
                    {sidebarOpen ? (
                      <button type="button" onClick={() => openTeammateChat(name)} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeChat === name && centreView === "chat" ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/60"}`}>
                        {name}
                      </button>
                    ) : (
                      <button type="button" onClick={() => openTeammateChat(name)} title={name} className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold transition-colors ${activeChat === name && centreView === "chat" ? "bg-zinc-600 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}>
                        {getInitials(name)}
                      </button>
                    )}
                  </li>
                ))}

                {/* + New chat */}
                <li>
                  {sidebarOpen ? (
                    <button type="button" onClick={() => setModalType("teammate")} className="mt-0.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300">
                      <PlusIcon className="h-4 w-4 shrink-0 opacity-80" />
                      New chat
                    </button>
                  ) : (
                    <button type="button" onClick={() => setModalType("teammate")} title="New chat" className="mt-0.5 flex h-8 w-8 mx-auto items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-300">
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              </ul>
            </nav>

            {/* Settings */}
            <div className="border-t border-zinc-800 p-2">
              {sidebarOpen ? (
                <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300">
                  <SettingsIcon className="shrink-0" />
                  Settings
                </button>
              ) : (
                <button type="button" title="Settings" className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300">
                  <SettingsIcon />
                </button>
              )}
            </div>
          </aside>

          {/* ── Centre Panel ── */}
          <main className="flex min-w-0 flex-1 flex-col bg-zinc-900 overflow-hidden">

            {centreView === "canvas" ? (
              <div
                ref={canvasContainerRef}
                className="relative flex-1 overflow-hidden select-none"
                onMouseDown={handleCanvasMouseDown}
                onWheel={handleCanvasWheel}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Dot grid */}
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
                    width: "100%",
                    height: "100%",
                    transformOrigin: "0 0",
                    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
                  }}
                >
                  {/* Connection lines */}
                  <ConnectionLines managerNode={managerNode} teammateNodes={teammateNodes} />

                  {/* Manager node */}
                  {managerNode && (
                    <DraggableManagerNode
                      node={managerNode}
                      onToggleChat={toggleManagerChat}
                      onPosChange={setManagerPos}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCtxMenu({ x: e.clientX, y: e.clientY });
                      }}
                    />
                  )}

                  {/* Teammate nodes */}
                  {teammateNodes.map((tm) => (
                    <DraggableTeammateNode
                      key={tm.id}
                      node={tm}
                      onPosChange={(pos) => setTeammatePos(tm.id, pos)}
                      onDoubleClick={() => openTeammateChat(tm.name)}
                    />
                  ))}

                  {/* Create manager button — only shown if no manager yet */}
                  {!managerNode && (
                    <div style={{ position: "absolute", left: -120, top: -44 }}>
                      <button
                        type="button"
                        onClick={() => setModalType("manager")}
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
                  )}
                </div>

                <div className="absolute bottom-4 right-4 pointer-events-none text-[11px] text-zinc-600 select-none">
                  Scroll to zoom · Middle-click drag to pan · Right-click manager to edit
                </div>
              </div>

            ) : (
              /* TEAMMATE CHAT */
              <div className="flex flex-1 flex-col min-h-0">
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
                  <h2 className="text-sm font-semibold text-zinc-200">{activeChat}</h2>
                  <button type="button" onClick={closeTeammateChat} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors" aria-label="Close chat">
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
                    <input type="text" placeholder={`Message ${activeChat}…`} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30" />
                    <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 opacity-50">Send</button>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* ── Right Panel — Business Context ── */}
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
                  <button type="button" onClick={() => setContextOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Collapse">
                    <ChevronRightIcon />
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setContextOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Expand">
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
    </>
  );
}

// ── Draggable wrappers (defined after main to avoid forward-ref complexity) ───

function DraggableManagerNode({ node, onToggleChat, onPosChange, onContextMenu }) {
  const posRef = useRef(node.pos);
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  function onHeaderMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    posRef.current = node.pos;
    start.current = { mx: e.clientX, my: e.clientY, px: node.pos.x, py: node.pos.y };

    function onMove(e) {
      if (!dragging.current) return;
      const newPos = {
        x: start.current.px + (e.clientX - start.current.mx),
        y: start.current.py + (e.clientY - start.current.my),
      };
      posRef.current = newPos;
      onPosChange(newPos);
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const headerH = 48;

  return (
    <div
      style={{ position: "absolute", left: node.pos.x, top: node.pos.y, width: MGR_W, zIndex: 10 }}
      onContextMenu={onContextMenu}
    >
      <div className="rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl shadow-black/60">
        {/* Drag header */}
        <div
          className="flex items-center justify-between gap-2 px-5 rounded-t-2xl cursor-grab active:cursor-grabbing select-none"
          style={{ height: headerH, background: "rgba(39,39,42,0.97)" }}
          onMouseDown={onHeaderMouseDown}
        >
          <span className="truncate text-base font-bold text-zinc-100">{node.name}</span>
          <button
            type="button"
            onClick={onToggleChat}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${node.chatOpen ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
          >
            <ChevronDownIcon className={`transition-transform duration-200 ${node.chatOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {node.chatOpen && (
          <div className="border-t border-zinc-800 rounded-b-2xl overflow-hidden">
            <div className="overflow-y-auto p-4 space-y-2" style={{ height: MGR_CHAT_H }}>
              <p className="text-xs text-zinc-600 text-center pt-12">
                Chat with <span className="text-zinc-400 font-medium">{node.name}</span> will appear here.
              </p>
            </div>
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Message ${node.name}…`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                />
                <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 opacity-50">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TM_NODE_W = 160;
const TM_NODE_H = 44;

function DraggableTeammateNode({ node, onPosChange, onDoubleClick }) {
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    didDrag.current = false;
    start.current = { mx: e.clientX, my: e.clientY, px: node.pos.x, py: node.pos.y };

    function onMove(e) {
      if (!dragging.current) return;
      didDrag.current = true;
      onPosChange({
        x: start.current.px + (e.clientX - start.current.mx),
        y: start.current.py + (e.clientY - start.current.my),
      });
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      style={{ position: "absolute", left: node.pos.x, top: node.pos.y, zIndex: 5 }}
    >
      <div
        className="flex items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800/90 px-5 cursor-grab active:cursor-grabbing select-none shadow-lg shadow-black/40 hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
        style={{ height: TM_NODE_H, width: TM_NODE_W }}
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
        title="Double-click to open chat"
      >
        <span className="truncate text-sm font-semibold text-zinc-200">{node.name}</span>
      </div>
    </div>
  );
}
