"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const MGR_W =600;
const MGR_MIN_W = 440;
const MGR_MIN_H = 340;
const MGR_HEADER_H = 42;
const MGR_SEND_H = 54;
const TM_NODE_W = 160;
const TM_NODE_H = 42;

const OPENING_MESSAGE = "Hey! Welcome to MyTeam. I am here to help set up your workspace. To get started, tell me a bit about your business — what do you do and who is on your team?";
const AUTO_SUMMARY_EXCHANGES = 5;
const BUSINESS_PROFILE_SAVED_MESSAGE = "✅ Business Profile saved! We will update it from time to time as we discuss here in this Business Context panel.";

function getInitials(name) { return name.slice(0, 2).toUpperCase(); }

function ChevronLeftIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>;
}
function ChevronRightIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>;
}
function ChevronDownIcon({ className }) {
  return <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>;
}
function PlusIcon({ className }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>;
}
function SettingsIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function CanvasIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
function XIcon({ className }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function FocusIcon({ className }) {
  return <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>;
}

// ── New Chat Modal ─────────────────────────────────────────────────────────────
function NewChatModal({ title, placeholder = "Member or role name…", onClose, onCreate, existingNames = [] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) { setError(`"${trimmed}" already exists.`); return; }
    onCreate(trimmed);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/70">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500" htmlFor="chat-name">Name</label>
            <input ref={inputRef} id="chat-name" type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={placeholder} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25" />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <button type="submit" disabled={!name.trim()} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Create</button>
        </form>
      </div>
    </div>
  );
}

// ── Rename Modal ───────────────────────────────────────────────────────────────
function RenameModal({ currentName, onClose, onRename, existingNames = [] }) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === currentName.toLowerCase()) { onClose(); return; }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) { setError(`"${trimmed}" already exists.`); return; }
    onRename(trimmed);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/70">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Rename</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500" htmlFor="rename-input">New name</label>
            <input ref={inputRef} id="rename-input" type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25" />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <button type="submit" disabled={!name.trim()} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Rename</button>
        </form>
      </div>
    </div>
  );
}

// ── Assign Modal ───────────────────────────────────────────────────────────────
function AssignModal({ teammate, onClose, onAssign, onUnassign }) {
  const [currentEmail, setCurrentEmail] = useState(teammate.assignedEmail || null);
  const [inputEmail, setInputEmail] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (!currentEmail) inputRef.current?.focus(); }, [currentEmail]);
  function handleUnassign() { onUnassign(); setCurrentEmail(null); setTimeout(() => inputRef.current?.focus(), 50); }
  function handleAssign(e) {
    e.preventDefault();
    const trimmed = inputEmail.trim();
    if (!trimmed || currentEmail) return;
    onAssign(trimmed);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/70">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Assign — {teammate.name}</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"><XIcon /></button>
        </div>
        {currentEmail && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5">
            <span className="truncate text-sm text-zinc-300">{currentEmail}</span>
            <button type="button" onClick={handleUnassign} className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300" aria-label="Unassign"><XIcon className="h-3 w-3" /></button>
          </div>
        )}
        <form onSubmit={handleAssign} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Email</label>
            <input ref={inputRef} type="email" value={inputEmail} onChange={(e) => setInputEmail(e.target.value)} placeholder="teammate@company.com" disabled={!!currentEmail} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25 disabled:opacity-40 disabled:cursor-not-allowed" />
          </div>
          <button type="submit" disabled={!!currentEmail || !inputEmail.trim()} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">Assign</button>
        </form>
      </div>
    </div>
  );
}

// ── Manager Context Menu ───────────────────────────────────────────────────────
function ManagerContextMenu({ x, y, onNewTeammate, onRename, onDelete, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("contextmenu", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("contextmenu", handler); };
  }, [onClose]);
  return (
    <div ref={ref} className="fixed z-50 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/50" style={{ left: x, top: y, minWidth: 180 }}>
      <button type="button" onClick={() => { onNewTeammate(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700/80">
        <span className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-zinc-500 text-zinc-400"><PlusIcon className="h-3 w-3" /></span>
        New Teammate Chat
      </button>
      <div className="my-1 mx-2 border-t border-zinc-700" />
      <button type="button" onClick={() => { onRename(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700/80">Rename</button>
      <div className="my-1 mx-2 border-t border-zinc-700" />
      <button type="button" onClick={() => { onDelete(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-zinc-700/80">Delete Chat</button>
    </div>
  );
}

// ── Teammate Context Menu ──────────────────────────────────────────────────────
function TeammateContextMenu({ x, y, onAssign, onRename, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("contextmenu", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("contextmenu", handler); };
  }, [onClose]);
  return (
    <div ref={ref} className="fixed z-50 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/50" style={{ left: x, top: y, minWidth: 160 }}>
      <button type="button" onClick={() => { onAssign(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700/80">Assign</button>
      <div className="my-1 mx-2 border-t border-zinc-700" />
      <button type="button" onClick={() => { onRename(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700/80">Rename</button>
    </div>
  );
}

// ── Connection Lines ───────────────────────────────────────────────────────────
function ConnectionLines({ managerNode, teammates }) {
  if (!managerNode || teammates.length === 0) return null;
  const nodeW = managerNode.nodeW ?? MGR_W;
  const nodeH = managerNode.nodeH ?? MGR_MIN_H;
  const totalH = managerNode.chatOpen ? MGR_HEADER_H + nodeH + MGR_SEND_H : MGR_HEADER_H;
  const mgrBottomX = managerNode.pos.x + nodeW / 2;
  const mgrBottomY = managerNode.pos.y + totalH;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}>
      {teammates.map((tm) => {
        const tmTopX = tm.pos.x + TM_NODE_W / 2;
        const tmTopY = tm.pos.y;
        const dy = tmTopY - mgrBottomY;
        const absDy = Math.abs(dy);
        const cp1y = mgrBottomY + absDy * 0.45;
        const cp2y = tmTopY - absDy * 0.25;
        const d = `M ${mgrBottomX} ${mgrBottomY} C ${mgrBottomX} ${cp1y}, ${tmTopX} ${cp2y}, ${tmTopX} ${tmTopY}`;
        return <path key={tm.id} d={d} fill="none" stroke="rgba(161,161,170,0.35)" strokeWidth="2.5" strokeLinecap="round" />;
      })}
    </svg>
  );
}

// ── Draggable + Resizable Manager Node ────────────────────────────────────────
function DraggableManagerNode({ node, canvasScale, onToggleChat, onPosChange, onSizeChange, onContextMenu }) {
  const dragging = useRef(false);
  const resizing = useRef(null);
  const start = useRef({});
  const nodeW = node.nodeW ?? MGR_W;
  const nodeH = node.nodeH ?? MGR_MIN_H;

  function onHeaderMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = { mx: e.clientX, my: e.clientY, px: node.pos.x, py: node.pos.y };
    function onMove(e) {
      if (!dragging.current) return;
      onPosChange({ x: start.current.px + (e.clientX - start.current.mx) / canvasScale, y: start.current.py + (e.clientY - start.current.my) / canvasScale });
    }
    function onUp() { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function onResizeMouseDown(e, direction) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizing.current = direction;
    start.current = { mx: e.clientX, my: e.clientY, w: nodeW, h: nodeH, px: node.pos.x, py: node.pos.y };
    function onMove(e) {
      if (!resizing.current) return;
      const dx = (e.clientX - start.current.mx) / canvasScale;
      const dy = (e.clientY - start.current.my) / canvasScale;
      let newW = start.current.w;
      let newH = start.current.h;
      let newX = start.current.px;
      let newY = start.current.py;
      const dir = resizing.current;
      if (dir.includes("e")) newW = Math.max(MGR_MIN_W, start.current.w + dx);
      if (dir.includes("s")) newH = Math.max(MGR_MIN_H, start.current.h + dy);
      if (dir.includes("w")) { newW = Math.max(MGR_MIN_W, start.current.w - dx); newX = start.current.px + (start.current.w - newW); }
      if (dir.includes("n")) { newH = Math.max(MGR_MIN_H, start.current.h - dy); newY = start.current.py + (start.current.h - newH); }
      onSizeChange({ w: newW, h: newH, x: newX, y: newY });
    }
    function onUp() { resizing.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const handleStyle = (cursor, style) => ({
    position: "absolute", ...style, cursor, zIndex: 20,
  });

  return (
    <div style={{ position: "absolute", left: node.pos.x, top: node.pos.y, width: nodeW, zIndex: 10 }} onContextMenu={onContextMenu}>
      <div className="rounded-2xl border border-zinc-600 bg-zinc-900 shadow-2xl shadow-black/60" style={{ position: "relative" }}>
        {/* Resize handles — only show when chat is open */}
        {node.chatOpen && (<>
          <div onMouseDown={(e) => onResizeMouseDown(e, "e")} style={handleStyle("ew-resize", { right: -4, top: 8, bottom: 8, width: 8 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "w")} style={handleStyle("ew-resize", { left: -4, top: 8, bottom: 8, width: 8 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "s")} style={handleStyle("ns-resize", { bottom: -4, left: 8, right: 8, height: 8 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "se")} style={handleStyle("nwse-resize", { bottom: -4, right: -4, width: 12, height: 12 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "sw")} style={handleStyle("nesw-resize", { bottom: -4, left: -4, width: 12, height: 12 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "ne")} style={handleStyle("nesw-resize", { top: -4, right: -4, width: 12, height: 12 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "nw")} style={handleStyle("nwse-resize", { top: -4, left: -4, width: 12, height: 12 })} />
          <div onMouseDown={(e) => onResizeMouseDown(e, "n")} style={handleStyle("ns-resize", { top: -4, left: 8, right: 8, height: 8 })} />
        </>)}

        <div
          className={`flex items-center justify-between gap-2 px-4 cursor-grab active:cursor-grabbing select-none ${node.chatOpen ? "rounded-t-2xl" : "rounded-2xl"}`}
          style={{ height: MGR_HEADER_H, background: "rgba(39,39,42,0.97)" }}
          onMouseDown={onHeaderMouseDown}
          onDoubleClick={onToggleChat}
        >
          <span className="truncate text-sm font-bold text-zinc-100">{node.name}</span>
          <button type="button" onClick={onToggleChat} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${node.chatOpen ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}>
            <ChevronDownIcon className={`transition-transform duration-200 ${node.chatOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {node.chatOpen && (
          <div className="border-t border-zinc-800 rounded-b-2xl overflow-hidden">
            <div className="overflow-y-auto p-3 space-y-2" style={{ height: nodeH }}>
              <p className="text-xs text-zinc-600 text-center pt-10">Chat with <span className="text-zinc-400 font-medium">{node.name}</span> will appear here.</p>
            </div>
            <div className="border-t border-zinc-800 p-3" style={{ height: MGR_SEND_H, boxSizing: "border-box" }}>
              <div className="flex gap-2">
                <input type="text" placeholder={`Message ${node.name}…`} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600" />
                <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 opacity-50">Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draggable Teammate Node ────────────────────────────────────────────────────
function DraggableTeammateNode({ node, canvasScale, onPosChange, onDoubleClick, onContextMenu }) {
  const dragging = useRef(false);
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    start.current = { mx: e.clientX, my: e.clientY, px: node.pos.x, py: node.pos.y };
    function onMove(e) {
      if (!dragging.current) return;
      onPosChange({ x: start.current.px + (e.clientX - start.current.mx) / canvasScale, y: start.current.py + (e.clientY - start.current.my) / canvasScale });
    }
    function onUp() { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  return (
    <div style={{ position: "absolute", left: node.pos.x, top: node.pos.y, zIndex: 5 }}>
      <div
        className="flex items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800/90 px-4 cursor-grab active:cursor-grabbing select-none shadow-lg shadow-black/40 hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
        style={{ height: TM_NODE_H, width: TM_NODE_W }}
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
        onContextMenu={onContextMenu}
        title="Double-click to open chat"
      >
        <span className="truncate text-xs font-semibold text-zinc-200">{node.name}</span>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
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

  const [modalType, setModalType] = useState(null);
  const [assignTargetId, setAssignTargetId] = useState(null);
  const [renameTargetId, setRenameTargetId] = useState(null);

  const [centreView, setCentreView] = useState("canvas");
  const [activeChatId, setActiveChatId] = useState(null);

  const [managerNode, setManagerNode] = useState(null);
  const [teammates, setTeammates] = useState([]);

  const [mgrCtxMenu, setMgrCtxMenu] = useState(null);
  const [tmCtxMenu, setTmCtxMenu] = useState(null);

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
  const mgrPosSaveTimer = useRef(null);
  const tmPosSaveTimers = useRef({});
  const viewportSaveTimer = useRef(null);
  const mgrSizeSaveTimer = useRef(null);

  async function saveCanvas(action, payload) {
    if (!workspaceId || !userId) return null;
    try {
      const res = await fetch("/api/save-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, workspaceId, userId, payload }),
      });
      const json = await res.json();
      if (!res.ok) { console.error("[saveCanvas] error:", json?.error); return null; }
      return json;
    } catch (err) {
      console.error("[saveCanvas] fetch error:", err);
      return null;
    }
  }

  function saveViewport(offset, scale) {
    if (!workspaceId || !userId) return;
    clearTimeout(viewportSaveTimer.current);
    viewportSaveTimer.current = setTimeout(() => {
      saveCanvas("save_viewport", { offsetX: offset.x, offsetY: offset.y, scale });
    }, 800);
  }

  const activeTeammate = useMemo(() => teammates.find((t) => t.id === activeChatId), [teammates, activeChatId]);
  const assignTarget = useMemo(() => teammates.find((t) => t.id === assignTargetId), [teammates, assignTargetId]);
  const allNames = useMemo(() => {
    const names = teammates.map((t) => t.name);
    if (managerNode) names.push(managerNode.name);
    return names;
  }, [teammates, managerNode]);

  useEffect(() => {
    if (centreView !== "canvas" || !canvasContainerRef.current || canvasInitializedRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    setCanvasOffset({ x: rect.width / 2, y: rect.height / 2 });
    canvasInitializedRef.current = true;
  }, [centreView]);

  function handleCanvasMouseDown(e) {
    if (e.button !== 1) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
    function onMouseMove(e) {
      if (!isPanningRef.current) return;
      const newOffset = { x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y };
      setCanvasOffset(newOffset);
      saveViewport(newOffset, canvasScale);
    }
    function onMouseUp() { isPanningRef.current = false; document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function handleCanvasWheel(e) {
    e.preventDefault();
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(3, Math.max(0.15, canvasScale * factor));
    const ratio = newScale / canvasScale;
    const newOffset = { x: mouseX - (mouseX - canvasOffset.x) * ratio, y: mouseY - (mouseY - canvasOffset.y) * ratio };
    setCanvasScale(newScale);
    setCanvasOffset(newOffset);
    saveViewport(newOffset, newScale);
  }

  function resetViewToManager() {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = 1;
    if (managerNode) {
      const nodeW = managerNode.nodeW ?? MGR_W;
      const nodeH = managerNode.nodeH ?? MGR_MIN_H;
      const totalH = managerNode.chatOpen ? MGR_HEADER_H + nodeH + MGR_SEND_H : MGR_HEADER_H;
      const mgCx = managerNode.pos.x + nodeW / 2;
      const mgCy = managerNode.pos.y + totalH / 2;
      setCanvasScale(newScale);
      setCanvasOffset({ x: cx - mgCx * newScale, y: cy - mgCy * newScale });
    } else {
      setCanvasScale(newScale);
      setCanvasOffset({ x: cx, y: cy });
    }
  }

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
    function onMouseUp() { isResizingRef.current = false; document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

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
    function handlePointerDown(e) { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); }
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
      await loadCanvasNodes(workspace.id);
      await loadViewport(workspace.id);
      const chat = await ensureOnboardingChat(workspace.id);
      if (!chat) throw new Error("Unable to load onboarding chat.");
      if (cancelled) return;
      setOnboardingChatId(chat.id);
      const { data: existingMessages, error: messagesError } = await supabase
        .from("messages").select("id, role, content, created_at")
        .eq("chat_id", chat.id).order("created_at", { ascending: true }).order("id", { ascending: true });
      if (messagesError) throw messagesError;
      if (cancelled) return;
      setOnboardingMessages(existingMessages ?? []);
    }
    bootstrapOnboarding().catch((err) => { if (cancelled) return; setOnboardingError(err.message ?? "Failed to load onboarding context."); });
    return () => { cancelled = true; };
  }, [authReady, userId]);

  useEffect(() => {
    if (!contextScrollRef.current) return;
    contextScrollRef.current.scrollTop = contextScrollRef.current.scrollHeight;
  }, [onboardingMessages, contextOpen]);

  const onboardingUserMessageCount = useMemo(
    () => onboardingMessages.filter((m) => m.role === "user" && typeof m.content === "string" && m.content.trim() && m.content !== "SUMMARISE_NOW").length,
    [onboardingMessages]
  );
  const remainingExchanges = Math.max(0, AUTO_SUMMARY_EXCHANGES - onboardingUserMessageCount);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  async function loadCanvasNodes(wsId) {
    const { data, error } = await supabase
      .from("chats")
      .select("id, type, name, pos_x, pos_y, chat_open, assigned_email, node_w, node_h")
      .eq("workspace_id", wsId)
      .in("type", ["manager", "teammate"]);
    if (error) { console.error("loadCanvasNodes error:", error); return; }
    if (!data || data.length === 0) return;
    const mgr = data.find((c) => c.type === "manager");
    if (mgr) {
      setManagerNode({
        id: mgr.id,
        name: mgr.name,
        chatOpen: mgr.chat_open ?? false,
        pos: { x: mgr.pos_x ?? -MGR_W / 2, y: mgr.pos_y ?? -MGR_HEADER_H / 2 },
        nodeW: mgr.node_w ?? MGR_W,
        nodeH: mgr.node_h ?? MGR_MIN_H,
      });
    }
    const tms = data.filter((c) => c.type === "teammate").map((c) => ({
      id: c.id, name: c.name,
      pos: { x: c.pos_x ?? 80, y: c.pos_y ?? 200 },
      assignedEmail: c.assigned_email ?? null,
    }));
    if (tms.length > 0) setTeammates(tms);
  }

  async function loadViewport(wsId) {
    const { data, error } = await supabase
      .from("workspace_settings")
      .select("canvas_offset_x, canvas_offset_y, canvas_scale")
      .eq("workspace_id", wsId)
      .maybeSingle();
    if (error || !data) return;
    setCanvasOffset({ x: data.canvas_offset_x ?? 0, y: data.canvas_offset_y ?? 0 });
    setCanvasScale(data.canvas_scale ?? 1);
    canvasInitializedRef.current = true;
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
    const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return false;
    const parsedJson = JSON.parse(cleaned.slice(start, end + 1));
    const res = await fetch("/api/save-business-memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, content: parsedJson }) });
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
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: messagesForSummary, workspaceId, chatType: "onboarding", forceSummary: true }) });
      const payload = await response.json();
      if (!response.ok || !payload.reply) { autoSummaryTriggeredRef.current = false; return; }
      await saveBusinessMemoryFromReply(payload.reply, { appendConfirmation: true });
    } catch (err) { console.error("Silent summary error:", err); autoSummaryTriggeredRef.current = false; }
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
      const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: controlMessages, workspaceId, chatType: "onboarding", forceSummary: trimmed === "SUMMARISE_NOW" }) });
      const payload = await response.json();
      if (!response.ok || !payload.reply) {
        const errMsg = (typeof payload.error === "string" && payload.error.trim()) || `Chat request failed (${response.status}).`;
        const errIns = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "assistant", content: errMsg }).select("id, role, content, created_at").single();
        if (errIns.error) setOnboardingError(errMsg); else setOnboardingMessages((prev) => [...prev, errIns.data]);
        return;
      }
      const asstIns = await supabase.from("messages").insert({ chat_id: onboardingChatId, role: "assistant", content: payload.reply }).select("id, role, content, created_at").single();
      if (asstIns.error) throw asstIns.error;
      setOnboardingMessages((prev) => [...prev, asstIns.data]);
      const countAfter = nextMessages.filter((m) => m.role === "user" && typeof m.content === "string" && m.content.trim() && m.content !== "SUMMARISE_NOW").length;
      if (shouldPersist && countAfter >= AUTO_SUMMARY_EXCHANGES && !businessProfileSaveCompleteRef.current) {
        void runSilentBackgroundSummary([...nextMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })), { role: "assistant", content: payload.reply }]);
      }
    } catch (err) { setOnboardingError(err.message ?? "Something went wrong."); }
    finally { setOnboardingBusy(false); setOnboardingInput(""); }
  }, [onboardingBusy, onboardingChatId, onboardingMessages, runSilentBackgroundSummary, workspaceId]);

  async function handleSummariseNowClick() {
    if (!onboardingChatId || onboardingBusy || summariseConfirmLoading) return;
    setSummariseConfirmLoading(true); setOnboardingError(null);
    try { await runSilentBackgroundSummary(onboardingMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))); }
    catch (err) { setOnboardingError(err.message ?? "Failed to generate and save summary."); }
    finally { setSummariseConfirmLoading(false); }
  }

  async function handleOnboardingSubmit(e) { e.preventDefault(); await submitOnboardingMessage(onboardingInput); }

  function getNextTeammatePos() {
    const cols = 4;
    const colW = TM_NODE_W + 24;
    const idx = teammates.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const nodeW = managerNode?.nodeW ?? MGR_W;
    const mgrH = managerNode?.chatOpen ? MGR_HEADER_H + (managerNode?.nodeH ?? MGR_MIN_H) + MGR_SEND_H : MGR_HEADER_H;
    const baseX = managerNode ? managerNode.pos.x + nodeW / 2 - (Math.min(cols, idx + 1) * colW) / 2 + col * colW : 80 + col * colW;
    const baseY = managerNode ? managerNode.pos.y + mgrH + 80 + row * 64 : 200 + row * 64;
    return { x: baseX, y: baseY };
  }

  async function handleCreateTeammate(name) {
    const pos = getNextTeammatePos();
    const result = await saveCanvas("create_teammate", { name, pos });
    if (!result?.data) return;
    const { id } = result.data;
    setTeammates((prev) => [...prev, { id, name, pos, assignedEmail: null }]);
  }

  async function handleCreateManager(name) {
    const pos = { x: -MGR_W / 2, y: -MGR_HEADER_H / 2 };
    const result = await saveCanvas("create_manager", { name, pos });
    if (!result?.data) return;
    const { id } = result.data;
    setManagerNode({ id, name, chatOpen: false, pos, nodeW: MGR_W, nodeH: MGR_MIN_H });
  }

  function toggleManagerChat() {
    setManagerNode((prev) => {
      if (!prev) return prev;
      const chatOpen = !prev.chatOpen;
      saveCanvas("toggle_chat_open", { chatId: prev.id, chatOpen });
      return { ...prev, chatOpen };
    });
  }

  function setManagerPos(pos) {
    setManagerNode((prev) => {
      if (!prev) return prev;
      clearTimeout(mgrPosSaveTimer.current);
      mgrPosSaveTimer.current = setTimeout(() => { saveCanvas("update_pos", { chatId: prev.id, pos }); }, 600);
      return { ...prev, pos };
    });
  }

  function setManagerSize({ w, h, x, y }) {
    setManagerNode((prev) => {
      if (!prev) return prev;
      const newNode = { ...prev, nodeW: w, nodeH: h, pos: { x, y } };
      clearTimeout(mgrSizeSaveTimer.current);
      mgrSizeSaveTimer.current = setTimeout(() => {
        saveCanvas("update_size", { chatId: prev.id, nodeW: w, nodeH: h });
        saveCanvas("update_pos", { chatId: prev.id, pos: { x, y } });
      }, 600);
      return newNode;
    });
  }

  function setTeammatePos(id, pos) {
    setTeammates((prev) => prev.map((t) => t.id === id ? { ...t, pos } : t));
    clearTimeout(tmPosSaveTimers.current[id]);
    tmPosSaveTimers.current[id] = setTimeout(() => { saveCanvas("update_pos", { chatId: id, pos }); }, 600);
  }

  function assignTeammate(id, email) {
    setTeammates((prev) => prev.map((t) => t.id === id ? { ...t, assignedEmail: email } : t));
    saveCanvas("assign_email", { chatId: id, email });
  }

  function unassignTeammate(id) {
    setTeammates((prev) => prev.map((t) => t.id === id ? { ...t, assignedEmail: null } : t));
    saveCanvas("unassign_email", { chatId: id });
  }

  function handleRename(id, newName) {
    if (id === "manager") {
      setManagerNode((prev) => prev ? { ...prev, name: newName } : prev);
      if (managerNode) saveCanvas("rename_chat", { chatId: managerNode.id, name: newName });
    } else {
      setTeammates((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
      saveCanvas("rename_chat", { chatId: id, name: newName });
    }
  }

  function openTeammateChat(id) { setActiveChatId(id); setCentreView("chat"); }
  function closeTeammateChat() { setActiveChatId(null); setCentreView("canvas"); }
  function goToCanvas() { setActiveChatId(null); setCentreView("canvas"); }

  function openTmCtxMenu(e, id) {
    e.preventDefault();
    e.stopPropagation();
    setTmCtxMenu({ x: e.clientX, y: e.clientY, id });
  }

  if (!authReady) return null;

  return (
    <>
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
        *::-webkit-scrollbar { width: 3px; height: 3px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 999px; }
        *::-webkit-scrollbar-thumb:hover { background-color: #52525b; }
        *::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        *::-webkit-scrollbar-corner { background: transparent; }
      `}</style>

      {modalType === "teammate" && <NewChatModal title="New Teammate Chat" onClose={() => setModalType(null)} onCreate={handleCreateTeammate} existingNames={allNames} />}
      {modalType === "manager" && <NewChatModal title="New Manager Chat" onClose={() => setModalType(null)} onCreate={handleCreateManager} existingNames={allNames} />}
      {assignTargetId && assignTarget && (
        <AssignModal
          teammate={assignTarget}
          onClose={() => setAssignTargetId(null)}
          onAssign={(email) => { assignTeammate(assignTargetId, email); setAssignTargetId(null); }}
          onUnassign={() => unassignTeammate(assignTargetId)}
        />
      )}
      {renameTargetId && (
        <RenameModal
          currentName={renameTargetId === "manager" ? managerNode?.name ?? "" : teammates.find((t) => t.id === renameTargetId)?.name ?? ""}
          existingNames={allNames}
          onClose={() => setRenameTargetId(null)}
          onRename={(newName) => handleRename(renameTargetId, newName)}
        />
      )}

      {mgrCtxMenu && (
        <ManagerContextMenu
          x={mgrCtxMenu.x} y={mgrCtxMenu.y}
          onNewTeammate={() => setModalType("teammate")}
          onRename={() => setRenameTargetId("manager")}
          onDelete={() => { if (managerNode) saveCanvas("delete_chat", { chatId: managerNode.id }); setManagerNode(null); }}
          onClose={() => setMgrCtxMenu(null)}
        />
      )}
      {tmCtxMenu && (
        <TeammateContextMenu
          x={tmCtxMenu.x} y={tmCtxMenu.y}
          onAssign={() => setAssignTargetId(tmCtxMenu.id)}
          onRename={() => setRenameTargetId(tmCtxMenu.id)}
          onClose={() => setTmCtxMenu(null)}
        />
      )}

      <div className="flex h-screen min-h-0 flex-col bg-zinc-900 font-sans text-zinc-100">
        <header className="flex h-12 shrink-0 items-center justify-end border-b border-zinc-800 bg-zinc-900 px-3">
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-200 ring-1 ring-zinc-600 transition-colors hover:bg-zinc-600" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Account menu">Me</button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/40">
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80" onClick={() => setMenuOpen(false)}>Profile</button>
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700/80" onClick={handleSignOut}>Log Out</button>
              </div>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside style={{ width: sidebarOpen ? "260px" : "52px" }} className="relative flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out overflow-hidden">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
              {sidebarOpen ? (
                <>
                  <p className="truncate px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Utility</p>
                  <button type="button" onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Collapse sidebar"><ChevronLeftIcon /></button>
                </>
              ) : (
                <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300" aria-label="Expand sidebar"><ChevronRightIcon /></button>
              )}
            </div>
            <nav className="flex-1 overflow-y-auto p-2" aria-label="Navigation">
              <ul className="space-y-1">
                <li>
                  {sidebarOpen ? (
                    <button type="button" onClick={goToCanvas} className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${centreView === "canvas" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"}`}><CanvasIcon className="shrink-0" />Canvas</button>
                  ) : (
                    <button type="button" onClick={goToCanvas} title="Canvas" className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full transition-colors ${centreView === "canvas" ? "bg-zinc-700 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}><CanvasIcon className="h-4 w-4" /></button>
                  )}
                </li>
                {sidebarOpen ? (
                  <li aria-hidden><p className="mt-3 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Teammate Chats</p></li>
                ) : (
                  <li aria-hidden><div className="my-1 mx-1 border-t border-zinc-800" /></li>
                )}
                {teammates.map((tm) => (
                  <li key={tm.id}>
                    {sidebarOpen ? (
                      <button type="button" onClick={() => openTeammateChat(tm.id)} onContextMenu={(e) => openTmCtxMenu(e, tm.id)} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors truncate block ${activeChatId === tm.id && centreView === "chat" ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-800/60"}`}>{tm.name}</button>
                    ) : (
                      <button type="button" onClick={() => openTeammateChat(tm.id)} onContextMenu={(e) => openTmCtxMenu(e, tm.id)} title={tm.name} className={`flex h-8 w-8 mx-auto items-center justify-center rounded-full text-xs font-semibold transition-colors ${activeChatId === tm.id && centreView === "chat" ? "bg-zinc-600 text-zinc-50" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"}`}>{getInitials(tm.name)}</button>
                    )}
                  </li>
                ))}
                <li>
                  {sidebarOpen ? (
                    <button type="button" onClick={() => setModalType("teammate")} className="mt-0.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"><PlusIcon className="h-4 w-4 shrink-0 opacity-80" />New chat</button>
                  ) : (
                    <button type="button" onClick={() => setModalType("teammate")} title="New chat" className="mt-0.5 flex h-8 w-8 mx-auto items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-300"><PlusIcon className="h-4 w-4" /></button>
                  )}
                </li>
              </ul>
            </nav>
            <div className="border-t border-zinc-800 p-2">
              {sidebarOpen ? (
                <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"><SettingsIcon className="shrink-0" />Settings</button>
              ) : (
                <button type="button" title="Settings" className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"><SettingsIcon /></button>
              )}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col bg-zinc-900 overflow-hidden">
            {centreView === "canvas" ? (
              <div ref={canvasContainerRef} className="relative flex-1 overflow-hidden select-none" onMouseDown={handleCanvasMouseDown} onWheel={handleCanvasWheel} onContextMenu={(e) => e.preventDefault()}>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)", backgroundSize: `${28 * canvasScale}px ${28 * canvasScale}px`, backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`, opacity: 0.5 }} />
                <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transformOrigin: "0 0", transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})` }}>
                  <ConnectionLines managerNode={managerNode} teammates={teammates} />
                  {managerNode && (
                    <DraggableManagerNode
                      node={managerNode}
                      canvasScale={canvasScale}
                      onToggleChat={toggleManagerChat}
                      onPosChange={setManagerPos}
                      onSizeChange={setManagerSize}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMgrCtxMenu({ x: e.clientX, y: e.clientY }); }}
                    />
                  )}
                  {teammates.map((tm) => (
                    <DraggableTeammateNode key={tm.id} node={tm} canvasScale={canvasScale} onPosChange={(pos) => setTeammatePos(tm.id, pos)} onDoubleClick={() => openTeammateChat(tm.id)} onContextMenu={(e) => openTmCtxMenu(e, tm.id)} />
                  ))}
                  {!managerNode && (
                    <div style={{ position: "absolute", left: -120, top: -44 }}>
                      <button type="button" onClick={() => setModalType("manager")} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-600 bg-zinc-900/80 text-zinc-400 transition-all hover:border-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 active:scale-95" style={{ width: 240, height: 88 }}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800"><PlusIcon className="h-5 w-5" /></span>
                        <span className="text-sm font-medium">Create Manager Chat</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
                  <button type="button" onClick={resetViewToManager} title="Focus manager chat" className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/90 text-zinc-400 shadow-md transition-colors hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"><FocusIcon /></button>
                  <p className="text-[11px] text-zinc-600 select-none">Scroll to zoom · Middle-click drag to pan · Right-click to edit</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col min-h-0">
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
                  <h2 className="text-sm font-semibold text-zinc-200 truncate">{activeTeammate?.name ?? "Chat"}</h2>
                  <button type="button" onClick={closeTeammateChat} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"><XIcon /></button>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-6">
                  <p className="text-sm text-zinc-500">Chat log for <span className="text-zinc-300 font-medium">{activeTeammate?.name}</span> will appear here.</p>
                </div>
                <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
                  <div className="mx-auto flex max-w-3xl gap-2">
                    <input type="text" placeholder={`Message ${activeTeammate?.name ?? ""}…`} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30" />
                    <button type="button" disabled className="shrink-0 rounded-lg bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 opacity-50">Send</button>
                  </div>
                </div>
              </div>
            )}
          </main>

          <aside style={{ width: contextOpen ? `${contextWidth}px` : "44px" }} className="relative flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-900 transition-[width] duration-200 ease-out">
            {contextOpen && <div onMouseDown={startContextResize} className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-10 hover:bg-zinc-600/60 transition-colors" />}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-2">
              {contextOpen ? (
                <>
                  <h2 className="truncate px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Business Context</h2>
                  <button type="button" onClick={() => setContextOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"><ChevronRightIcon /></button>
                </>
              ) : (
                <button type="button" onClick={() => setContextOpen(true)} className="flex h-full w-full items-center justify-center text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"><ChevronLeftIcon /></button>
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
                  {onboardingError && <p className="mb-2 rounded-md border border-red-900/50 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-300">{onboardingError}</p>}
                  {onboardingUserMessageCount < AUTO_SUMMARY_EXCHANGES && !businessProfileSaveCompleteRef.current && (
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] text-zinc-500">{remainingExchanges} exchanges before auto-summary</p>
                      {onboardingUserMessageCount >= 2 && (
                        <button type="button" onClick={() => void handleSummariseNowClick()} disabled={onboardingBusy || summariseConfirmLoading} className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">Summarise Now</button>
                      )}
                    </div>
                  )}
                  <form onSubmit={handleOnboardingSubmit} className="flex gap-2">
                    <input type="text" value={onboardingInput} onChange={(e) => setOnboardingInput(e.target.value)} placeholder="Reply..." disabled={onboardingBusy} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30 disabled:opacity-50" />
                    <button type="submit" disabled={onboardingBusy || !onboardingInput.trim()} className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">Send</button>
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