"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Icons ─────────────────────────────────────────────────────────────────────
function ChevronLeftIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}
function ChevronRightIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>;
}
function CanvasIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
function XIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>;
}

function getInitials(name) { return name.slice(0, 2).toUpperCase(); }

// ── Read-only Canvas ──────────────────────────────────────────────────────────
function ReadOnlyCanvas({ managerNode, teammates, myChat }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const initRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setOffset({ x: rect.width / 2, y: rect.height / 2 });
    offsetRef.current = { x: rect.width / 2, y: rect.height / 2 };
    initRef.current = true;
  }, []);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(3, Math.max(0.15, scaleRef.current * factor));
      const ratio = newScale / scaleRef.current;
      const newOffset = { x: mouseX - (mouseX - offsetRef.current.x) * ratio, y: mouseY - (mouseY - offsetRef.current.y) * ratio };
      setScale(newScale);
      setOffset(newOffset);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onMouseDown(e) {
    if (e.button !== 1) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    function onMove(e) {
      if (!isPanningRef.current) return;
      setOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    }
    function onUp() { isPanningRef.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const MGR_W = 440;
  const MGR_HEADER_H = 42;
  const TM_W = 160;
  const TM_H = 42;

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden select-none" onMouseDown={onMouseDown} onContextMenu={e => e.preventDefault()}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)", backgroundSize: `${28 * scale}px ${28 * scale}px`, backgroundPosition: `${offset.x}px ${offset.y}px`, opacity: 0.5 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transformOrigin: "0 0", transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>

        {/* Connection lines */}
        {managerNode && teammates.length > 0 && (
          <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}>
            {teammates.map((tm) => {
              const mgrBX = managerNode.pos.x + MGR_W / 2;
              const mgrBY = managerNode.pos.y + MGR_HEADER_H;
              const tmX = tm.pos.x + TM_W / 2;
              const tmY = tm.pos.y;
              const dy = tmY - mgrBY;
              const absDy = Math.abs(dy);
              const d = `M ${mgrBX} ${mgrBY} C ${mgrBX} ${mgrBY + absDy * 0.45}, ${tmX} ${tmY - absDy * 0.25}, ${tmX} ${tmY}`;
              return <path key={tm.id} d={d} fill="none" stroke="rgba(161,161,170,0.35)" strokeWidth="2.5" strokeLinecap="round" />;
            })}
          </svg>
        )}

        {/* Manager node — locked, header only */}
        {managerNode && (
          <div style={{ position: "absolute", left: managerNode.pos.x, top: managerNode.pos.y, width: MGR_W, zIndex: 10 }}>
            <div className="rounded-2xl border border-zinc-600 bg-zinc-900 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2 px-4 rounded-2xl select-none" style={{ height: MGR_HEADER_H, background: "rgba(39,39,42,0.97)" }}>
                <span className="truncate text-sm font-bold text-zinc-100">{managerNode.name}</span>
                <span className="text-[10px] text-zinc-600 shrink-0">Manager</span>
              </div>
            </div>
          </div>
        )}

        {/* Teammate nodes */}
        {teammates.map((tm) => {
          const isMe = tm.id === myChat;
          return (
            <div key={tm.id} style={{ position: "absolute", left: tm.pos.x, top: tm.pos.y, zIndex: 5 }}>
              <div className={`flex items-center justify-center rounded-xl border px-4 select-none shadow-lg shadow-black/40 ${isMe ? "border-zinc-400 bg-zinc-700" : "border-zinc-600 bg-zinc-800/90"}`} style={{ height: TM_H, width: TM_W }}>
                <span className={`truncate text-xs font-semibold ${isMe ? "text-zinc-100" : "text-zinc-400"}`}>{tm.name}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="absolute bottom-4 right-4 text-[11px] text-zinc-600 select-none pointer-events-none">Read-only · Scroll to zoom · Middle-click to pan</p>
    </div>
  );
}

// ── Business Profile Panel ────────────────────────────────────────────────────
function BusinessProfile({ memory }) {
  if (!memory) return <p className="p-4 text-xs text-zinc-600">No business profile available yet.</p>;

  const entries = typeof memory === "object" ? Object.entries(memory) : null;

  return (
    <div className="overflow-y-auto p-4 space-y-4 flex-1">
      {entries ? entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">{key.replace(/_/g, " ")}</p>
          {Array.isArray(value) ? (
            <ul className="space-y-0.5">
              {value.map((v, i) => <li key={i} className="text-xs text-zinc-300">• {String(v)}</li>)}
            </ul>
          ) : (
            <p className="text-xs text-zinc-300 leading-relaxed">{String(value)}</p>
          )}
        </div>
      )) : (
        <p className="text-xs text-zinc-400 whitespace-pre-wrap">{String(memory)}</p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeammatePage() {
  const router = useRouter();

  const [step, setStep] = useState("loading");
  const [userId, setUserId] = useState(null);
  const [myWorkspaceId, setMyWorkspaceId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // Code entry
  const [orgCode, setOrgCode] = useState("");
  const [orgCodeError, setOrgCodeError] = useState("");
  const [orgCodeBusy, setOrgCodeBusy] = useState(false);

  // Workspace data
  const [workspaceId, setWorkspaceId] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [chatId, setChatId] = useState(null);
  const [chatName, setChatName] = useState("");

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatScrollRef = useRef(null);

  // Sidebar + canvas + right panel
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [centreView, setCentreView] = useState("chat");
  const [rightOpen, setRightOpen] = useState(false);
  const [allTeammates, setAllTeammates] = useState([]);
  const [managerNode, setManagerNode] = useState(null);
  const [businessMemory, setBusinessMemory] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }
      setUserId(session.user.id);
      setUserEmail(session.user.email);
      const { data: ws, error: wsErr } = await supabase
        .from("workspaces")
        .select("id, linked_workspace_id, linked_chat_id")
        .eq("owner_user_id", session.user.id)
        .maybeSingle();
      console.log("startup workspace check:", ws, wsErr);

      setMyWorkspaceId(ws?.id ?? null);

      if (ws?.linked_workspace_id && ws?.linked_chat_id) {
        setWorkspaceId(ws.linked_workspace_id);
        setChatId(ws.linked_chat_id);
        await loadAndEnterChat(ws.linked_workspace_id, ws.linked_chat_id);
      } else {
        setStep("enter_code");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  async function loadAndEnterChat(wsId, chId) {
    const res = await fetch("/api/get-workspace-data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: wsId, chatId: chId }),
    });
    const data = await res.json();
    setChatName(data.chatName);
    setOrgName(data.orgName);
    setMessages(data.messages ?? []);
    setBusinessMemory(data.businessMemory);

    const mgr = data.chats.find(c => c.type === "manager");
    if (mgr) setManagerNode({ id: mgr.id, name: mgr.name, pos: { x: mgr.pos_x ?? -220, y: mgr.pos_y ?? -21 } });
    const tms = data.chats.filter(c => c.type === "teammate").map(c => ({ id: c.id, name: c.name, pos: { x: c.pos_x ?? 80, y: c.pos_y ?? 200 } }));
    setAllTeammates(tms);
    setStep("chat");
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    const trimmed = orgCode.trim().toUpperCase();
    if (!trimmed) return;
    setOrgCodeBusy(true);
    setOrgCodeError("");

    const res = await fetch("/api/verify-org-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orgCode: trimmed, userEmail }),
    });
    const data = await res.json();

    if (!data.match) {
      setOrgCodeError("Invalid organisation code. Please check and try again.");
      setOrgCodeBusy(false);
      return;
    }

    setWorkspaceId(data.workspaceId);
    setOrgName(data.orgName);
    setOrgCodeBusy(false);

    if (data.invited) {
      setChatId(data.chatId);
      setChatName(data.chatName);
      setStep("invited");
    } else {
      setStep("not_invited");
    }
  }

  async function handleAccept() {
    console.log("handleAccept called", { userId, chatId, workspaceId, myWorkspaceId });
    try {
      await supabase.from("chats").update({ assigned_user_id: userId }).eq("id", chatId);
      console.log("chat linked");

      let wsId = myWorkspaceId;
      if (!wsId) {
        const { data: existing } = await supabase.from("workspaces")
          .select("id").eq("owner_user_id", userId).maybeSingle();
        console.log("existing workspace", existing);
        if (existing) {
          wsId = existing.id;
        } else {
          const { data: created } = await supabase.from("workspaces")
            .insert({ owner_user_id: userId, name: "Teammate Workspace", user_role: "teammate", seen_onboarding: true })
            .select("id").single();
          console.log("created workspace", created);
          wsId = created?.id ?? null;
        }
        setMyWorkspaceId(wsId);
      }

      if (wsId) {
      await fetch("/api/save-canvas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save_teammate_link",
          workspaceId: wsId,
          userId,
          payload: { linkedWorkspaceId: workspaceId, linkedChatId: chatId },
        }),
      });
    }

      console.log("calling loadAndEnterChat", workspaceId, chatId);
      await loadAndEnterChat(workspaceId, chatId);
      console.log("done");
    } catch (err) {
      console.error("handleAccept error:", err);
    }
  }

  async function handleSend() {
    if (!input.trim() || busy) return;
    const trimmed = input.trim();
    setBusy(true);
    setInput("");

    const ins = await supabase.from("messages").insert({ chat_id: chatId, role: "user", content: trimmed }).select("id, role, content, created_at").single();
    if (ins.error) { setBusy(false); return; }

    const nextMessages = [...messages, ins.data];
    setMessages(nextMessages);

    const res = await fetch("/api/teammate-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: nextMessages.map(m => ({ role: m.role, content: m.content })), chatId, workspaceId, chatName }),
    });
    const payload = await res.json();
    const replyText = payload.reply || "Something went wrong.";

    const asstIns = await supabase.from("messages").insert({ chat_id: chatId, role: "assistant", content: replyText }).select("id, role, content, created_at").single();
    if (!asstIns.error) setMessages(prev => [...prev, asstIns.data]);
    setBusy(false);
  }

  // ── Pre-chat screens ──────────────────────────────────────────────────────

  if (step === "loading") return (
    <div className="flex h-screen items-center justify-center bg-zinc-900">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );

  if (step === "enter_code") return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/60">
        <h1 className="mb-1 text-center text-lg font-bold text-zinc-100">Join your workspace</h1>
        <p className="mb-8 text-center text-sm text-zinc-500">Enter the organisation code your manager shared with you.</p>
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
          <input type="text" value={orgCode} onChange={e => { setOrgCode(e.target.value.toUpperCase()); setOrgCodeError(""); }} placeholder="e.g. MYCODE" maxLength={12} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-center text-sm font-mono font-semibold text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25" />
          {orgCodeError && <p className="text-center text-xs text-red-400">{orgCodeError}</p>}
          <button type="submit" disabled={!orgCode.trim() || orgCodeBusy} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            {orgCodeBusy ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );

  if (step === "not_invited") return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/60 text-center">
        <p className="text-sm font-semibold text-zinc-100">You haven't been invited</p>
        <p className="mt-2 text-xs text-zinc-500">Your email <span className="text-zinc-300">{userEmail}</span> is not associated with any chat in this organisation.</p>
        <button type="button" onClick={() => { setStep("enter_code"); setOrgCode(""); }} className="mt-6 text-xs text-zinc-500 underline hover:text-zinc-300">Try a different code</button>
      </div>
    </div>
  );

  if (step === "invited") return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/60 text-center">
        <p className="mb-1 text-xs text-zinc-500 uppercase tracking-wide">You've been invited to</p>
        <p className="text-lg font-bold text-zinc-100">{orgName}</p>
        <p className="mt-1 text-sm text-zinc-400">as <span className="font-medium text-zinc-200">{chatName}</span></p>
        <div className="mt-8 flex flex-col gap-3">
          <button type="button" onClick={handleAccept} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white">Accept Invitation</button>
          <button type="button" onClick={() => router.replace("/auth")} className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800">Dismiss</button>
        </div>
      </div>
    </div>
  );

  // ── Main Chat UI ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-zinc-900 font-sans text-zinc-100">
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
        *::-webkit-scrollbar { width: 3px; height: 3px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 999px; }
        *::-webkit-scrollbar-button { display: none; }
        *::-webkit-scrollbar-corner { background: transparent; }
      `}</style>

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-4 justify-between">
        <p className="text-sm font-semibold text-zinc-200">{chatName}</p>
        <span className="text-xs text-zinc-600">{orgName}</span>
      </header>

      <div className="flex min-h-0 flex-1">

        {/* Left Sidebar */}
        <aside style={{ width: sidebarOpen ? "220px" : "48px" }} className="flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
            {sidebarOpen ? (
              <>
                <p className="truncate px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Workspace</p>
                <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"><ChevronLeftIcon /></button>
              </>
            ) : (
              <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"><ChevronRightIcon /></button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {/* Canvas button */}
              <li>
                {sidebarOpen ? (
                  <button type="button" onClick={() => setCentreView("canvas")} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${centreView === "canvas" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"}`}>
                    <CanvasIcon className="shrink-0" />Canvas
                  </button>
                ) : (
                  <button type="button" onClick={() => setCentreView("canvas")} title="Canvas" className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full transition-colors ${centreView === "canvas" ? "bg-zinc-700 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}>
                    <CanvasIcon className="h-4 w-4" />
                  </button>
                )}
              </li>

              {sidebarOpen ? (
                <li aria-hidden><p className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Team</p></li>
              ) : (
                <li aria-hidden><div className="my-1 mx-1 border-t border-zinc-800" /></li>
              )}

              {/* My chat — highlighted */}
              <li>
                {sidebarOpen ? (
                  <button type="button" onClick={() => setCentreView("chat")} className={`w-full rounded-lg px-3 py-2.5 text-left truncate block transition-colors ${centreView === "chat" ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/60"}`}>
                    <span className="text-base font-bold">{chatName}</span> <span className="text-[10px] text-zinc-600 ml-1">you</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => setCentreView("chat")} title={chatName} className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold transition-colors ${centreView === "chat" ? "bg-zinc-600 text-zinc-50" : "bg-zinc-700 text-zinc-300"}`}>
                    {getInitials(chatName)}
                  </button>
                )}
              </li>

              {/* Other teammates — visual only */}
              {allTeammates.filter(t => t.id !== chatId).map(tm => (
                <li key={tm.id}>
                  {sidebarOpen ? (
                    <button type="button" className="w-full rounded-lg px-3 py-2.5 text-left text-sm truncate text-zinc-600 hover:bg-zinc-800/30 transition-colors cursor-default">{tm.name}</button>
                  ) : (
                    <div title={tm.name} className="flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold bg-zinc-800/50 text-zinc-700 cursor-default">{getInitials(tm.name)}</div>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Centre */}
        <main className="flex min-w-0 flex-1 flex-col bg-zinc-900 overflow-hidden">
          {centreView === "canvas" ? (
            <ReadOnlyCanvas managerNode={managerNode} teammates={allTeammates} myChat={chatId} />
          ) : (
            <div className="flex flex-1 flex-col min-h-0">
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-zinc-600 pt-12">Your AI assistant will reach out with tasks and updates here.</p>
                )}
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id ?? i} className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? "ml-auto bg-zinc-700 text-zinc-100" : "mr-auto bg-zinc-800 text-zinc-200"}`}>
                      {m.content}
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 border-t border-zinc-800 p-3">
                <div className="flex gap-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !busy && input.trim()) handleSend(); }} placeholder="Reply…" disabled={busy} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 disabled:opacity-50" />
                  <button type="button" onClick={handleSend} disabled={busy || !input.trim()} className="shrink-0 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Send</button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel — Business Profile */}
        <aside style={{ width: rightOpen ? "280px" : "44px" }} className="relative flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
            {rightOpen ? (
              <>
                <h2 className="truncate px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Business Profile</h2>
                <button type="button" onClick={() => setRightOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"><ChevronRightIcon /></button>
              </>
            ) : (
              <button type="button" onClick={() => setRightOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"><ChevronLeftIcon /></button>
            )}
          </div>
          {rightOpen && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <BusinessProfile memory={businessMemory} />
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}