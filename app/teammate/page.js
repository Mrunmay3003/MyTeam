"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ThemeSelector({ onClose }) {
  function getCurrent() {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem("myteam-theme") ?? "system";
  }

  function select(pref) {
    localStorage.setItem("myteam-theme", pref);
    const resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : pref;
    if (resolved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    onClose();
  }

  const current = getCurrent();

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-zinc-700 bg-zinc-800">
      <button type="button" onClick={() => select("system")} title="System"
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${current === "system" ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </button>
      <button type="button" onClick={() => select("light")} title="Light"
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${current === "light" ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      </button>
      <button type="button" onClick={() => select("dark")} title="Dark"
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${current === "dark" ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-300"}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  );
}

const VAPID_PUBLIC_KEY = "BDdWsTie0axPtas7O08_qDr1t_Oemzb6-2t3Pe1gqKM-H6hkcUNZWVSas_zTRQBtb-IS5hFs0k5idlwtwJUHXAo";

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
function SettingsIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}

function getInitials(name) { return name.slice(0, 2).toUpperCase(); }

// ── Read-only Canvas ──────────────────────────────────────────────────────────
function ReadOnlyCanvas({ managerNode, teammates, myChat }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const initRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const MGR_W = 440;
  const MGR_HEADER_H = 42;
  const TM_W = 160;
  const TM_H = 42;

  useEffect(() => {
    if (initRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    let newOffset;
    if (managerNode) {
      const mgCx = managerNode.pos.x + MGR_W / 2;
      const mgCy = managerNode.pos.y + MGR_HEADER_H / 2;
      newOffset = { x: cx - mgCx, y: cy - mgCy };
    } else {
      newOffset = { x: cx, y: cy };
    }
    setOffset(newOffset);
    offsetRef.current = newOffset;
    initRef.current = true;
    setInitialized(true);
  }, [managerNode]);

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

  function resetView() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    if (managerNode) {
      const mgCx = managerNode.pos.x + MGR_W / 2;
      const mgCy = managerNode.pos.y + MGR_HEADER_H / 2;
      setOffset({ x: cx - mgCx, y: cy - mgCy });
    } else {
      setOffset({ x: cx, y: cy });
    }
    setScale(1);
  }

  return (
    <div ref={containerRef} className={`relative flex-1 overflow-hidden select-none transition-opacity duration-150 ${initialized ? "opacity-100" : "opacity-0"}`} onMouseDown={onMouseDown} onContextMenu={e => e.preventDefault()}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)", backgroundSize: `${28 * scale}px ${28 * scale}px`, backgroundPosition: `${offset.x}px ${offset.y}px`, opacity: 0.5 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transformOrigin: "0 0", transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>

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

        {managerNode && (
          <div style={{ position: "absolute", left: managerNode.pos.x, top: managerNode.pos.y, width: MGR_W, zIndex: 10 }}>
            <div className="rounded-2xl border border-zinc-600 bg-zinc-900 shadow-xl shadow-black/50">
              <div className="flex items-center justify-between gap-2 px-4 rounded-2xl select-none bg-zinc-800" style={{ height: MGR_HEADER_H }}>
                <span className="truncate text-sm font-bold text-zinc-100">{managerNode.name}</span>
                <span className="text-[10px] text-zinc-600 shrink-0">Manager</span>
              </div>
            </div>
          </div>
        )}

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

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
        <button type="button" onClick={resetView} title="Re-centre" className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/90 text-zinc-400 shadow-md transition-colors hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
        </button>
        <p className="text-[11px] text-zinc-600 select-none">Read-only · Scroll to zoom · Middle-click to pan</p>
      </div>
    </div>
  );
}

// ── Business Profile Panel ────────────────────────────────────────────────────
function renderValue(value) {
  if (value === null || value === undefined) return <p className="text-xs text-zinc-500 italic">Not specified</p>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-xs text-zinc-500 italic">None</p>;
    return (
      <ul className="space-y-1.5 mt-1">
        {value.map((v, i) => (
          <li key={i} className="flex gap-2 text-xs text-zinc-300 leading-relaxed">
            <span className="text-zinc-600 shrink-0 mt-0.5">→</span>
            <span>{typeof v === "object" && v !== null
              ? Object.entries(v).map(([k, val]) => `${k.replace(/_/g, " ")}: ${val}`).join(" · ")
              : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <ul className="space-y-1.5 mt-1">
        {Object.entries(value).map(([k, v]) => (
          <li key={k} className="flex gap-2 text-xs text-zinc-300 leading-relaxed">
            <span className="text-zinc-600 shrink-0 mt-0.5">→</span>
            <span><span className="text-zinc-400">{k.replace(/_/g, " ")}:</span> {String(v)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-xs text-zinc-300 leading-relaxed mt-1">{String(value)}</p>;
}

function BusinessProfile({ memory }) {
  if (!memory) return <p className="p-4 text-xs text-zinc-600">No business profile available yet.</p>;

  const entries = typeof memory === "object" ? Object.entries(memory) : null;

  return (
    <div className="overflow-y-auto p-4 space-y-5 flex-1">
      {entries ? entries.map(([key, value]) => (
        <div key={key} className="border-b border-zinc-800 pb-4 last:border-0 last:pb-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">{key.replace(/_/g, " ")}</p>
          {renderValue(value)}
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

  const [showChatScrollBtn, setShowChatScrollBtn] = useState(false);

  // Sidebar + canvas + right panel
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [teammateMenuOpen, setTeammateMenuOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const teammateMenuRef = useRef(null);
  const [centreView, setCentreView] = useState("chat");
  const [rightOpen, setRightOpen] = useState(false);
  const [allTeammates, setAllTeammates] = useState([]);
  const [managerNode, setManagerNode] = useState(null);
  const [businessMemory, setBusinessMemory] = useState(null);

  // Apply saved theme on mount
  useEffect(() => {
    const pref = localStorage.getItem("myteam-theme") ?? "system";
    const resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : pref;
    if (resolved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

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

      const myWsId = ws?.id ?? null;
      setMyWorkspaceId(myWsId);

      if (ws?.linked_workspace_id && ws?.linked_chat_id) {
        setWorkspaceId(ws.linked_workspace_id);
        setChatId(ws.linked_chat_id);
        await loadAndEnterChat(ws.linked_workspace_id, ws.linked_chat_id, myWsId, true);
      } else {
        setStep("enter_code");
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (step !== "chat") return;
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 150);
  }, [step]);

  useEffect(() => {
    if (centreView === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [centreView]);

  useEffect(() => {
    if (step !== "chat") return;
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 150);
  }, [step]);

  useEffect(() => {
    function handler(e) { if (!teammateMenuRef.current?.contains(e.target)) setTeammateMenuOpen(false); }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  useEffect(() => {
    if (!settingsPanelOpen) return;
    function handler(e) {
      if (e.target.closest("[data-settings-tm]")) return;
      setSettingsPanelOpen(false);
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [settingsPanelOpen]);

  async function loadAndEnterChat(wsId, chId, ownWsId, skipNotifStep = false) {
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

    if (Notification.permission === "granted") {
      await registerPushNotifications(ownWsId ?? wsId);
      setStep("chat");
    } else if (Notification.permission === "denied") {
      setStep("chat");
    } else {
      if (skipNotifStep) {
        setStep("enable_notifications");
      } else {
        setStep("chat");
      }
    }

    // Check for due scheduled prompts
    await fetch("/api/check-scheduled", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: wsId }),
    });

    // Supabase Realtime — live message updates
    const channel = supabase
      .channel(`messages:${chId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        if (payload.new.chat_id !== chId) return;
        setMessages((prev) => {
          const already = prev.some(m => m.id === payload.new.id);
          if (already) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });
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

      setStep("enable_notifications");
      console.log("calling loadAndEnterChat", workspaceId, chatId);
      await loadAndEnterChat(workspaceId, chatId, wsId ?? myWorkspaceId, false);
      console.log("done");
    } catch (err) {
      console.error("handleAccept error:", err);
    }
  }

  async function registerPushNotifications(wsId) {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      const vapidKey = VAPID_PUBLIC_KEY;
      const existing = await reg.pushManager.getSubscription();
      const subscription = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subRes = await fetch("/api/save-push-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: wsId, subscription }),
      });
      const subJson = await subRes.json();
      console.log("push subscription save result:", subRes.status, subJson);
    } catch (err) {
      console.error("Push registration error:", err);
    }
  }

  async function handleSend() {
    if (!input.trim() || busy) return;
    console.log("handleSend", { chatId, workspaceId, chatName });
    const trimmed = input.trim();
    setBusy(true);
    setInput("");

    const insRes = await fetch("/api/save-canvas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save_message", workspaceId, userId, payload: { chatId, role: "user", content: trimmed } }),
    });
    const insJson = await insRes.json();
    if (!insRes.ok || !insJson.data) { setBusy(false); return; }

    const nextMessages = [...messages, insJson.data];
    setMessages(nextMessages);

    const res = await fetch("/api/teammate-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: nextMessages.map(m => ({ role: m.role, content: m.content })), chatId, workspaceId, chatName }),
    });
    const payload = await res.json();
    const replyText = payload.reply || "Something went wrong.";

    await fetch("/api/save-canvas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save_message", workspaceId, userId, payload: { chatId, role: "assistant", content: replyText } }),
    });
    // Message will appear via Realtime subscription — don't add manually
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

  if (step === "enable_notifications") return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 font-sans">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/60 text-center">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-2">Stay Connected</h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-2">
          Enable notifications to get instant updates when your manager assigns tasks, sends announcements, or responds to your questions — so nothing slips through.
        </p>
        <p className="text-xs text-zinc-600 mb-8">
          Click <span className="text-zinc-400 font-medium">Allow</span> on the browser popup to enable.
        </p>
        <button
          type="button"
          onClick={async () => {
            await registerPushNotifications(myWorkspaceId);
            setStep("chat");
          }}
          className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white"
        >
          Enable Notifications
        </button>
        <button
          type="button"
          onClick={() => setStep("chat")}
          className="mt-3 w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Skip for now
        </button>
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">{orgName}</span>
          <div className="relative" ref={teammateMenuRef}>
            <button
              type="button"
              onClick={() => setTeammateMenuOpen(o => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200 ring-1 ring-zinc-600 transition-colors hover:bg-zinc-600"
            >
              {getInitials(chatName)}
            </button>
            {teammateMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/40">
                <button type="button" onClick={async () => { setTeammateMenuOpen(false); await supabase.auth.signOut(); router.replace("/auth"); }} className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80">Log Out</button>
              </div>
            )}
          </div>
        </div>
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

          <div className="border-t border-zinc-800 p-2">
            {sidebarOpen ? (
              <div className="relative" data-settings-tm>
                {settingsPanelOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-52 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/50 z-50">
                    <div className="flex w-full items-center justify-between px-3 py-2">
                      <span className="text-sm text-zinc-200">Theme</span>
                      <ThemeSelector onClose={() => setSettingsPanelOpen(false)} />
                    </div>
                  </div>
                )}
                <button type="button" onClick={() => setSettingsPanelOpen(o => !o)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300">
                  <SettingsIcon className="shrink-0" />Settings
                </button>
              </div>
            ) : (
              <button type="button" title="Settings" className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"><SettingsIcon /></button>
            )}
          </div>
        </aside>

        {/* Centre */}
        <main className="flex min-w-0 flex-1 flex-col bg-zinc-900 overflow-hidden">
          {centreView === "canvas" ? (
            <ReadOnlyCanvas managerNode={managerNode} teammates={allTeammates} myChat={chatId} />
          ) : (
            <div className="flex flex-1 flex-col min-h-0">
              <div 
                ref={chatScrollRef} 
                className="flex-1 overflow-y-auto p-4 space-y-3"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                  setShowChatScrollBtn(!atBottom);
                }}
              >
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
              <div className="shrink-0 border-t border-zinc-800 p-3 relative">
                {showChatScrollBtn && (
                  <button
                    type="button"
                    onClick={() => { if (chatScrollRef.current) { chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" }); setShowChatScrollBtn(false); } }}
                    className="absolute -top-8 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-400 shadow-md hover:bg-zinc-700 hover:text-zinc-200 transition-colors z-10"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                )}
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