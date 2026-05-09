import { useEffect, useRef, useState } from "react";
"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TeammatePage() {
  const router = useRouter();
  const [step, setStep] = useState("loading"); 
  // steps: loading → enter_code → invited → not_invited → chat

  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [orgCode, setOrgCode] = useState("");
  const [orgCodeError, setOrgCodeError] = useState("");
  const [orgCodeBusy, setOrgCodeBusy] = useState(false);

  const [workspaceId, setWorkspaceId] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [chatId, setChatId] = useState(null);
  const [chatName, setChatName] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const chatScrollRef = useRef(null);

  // Auth check
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }
      setUserId(session.user.id);
      setUserEmail(session.user.email);
      setStep("enter_code");
    })();
  }, [router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

  async function handleCodeSubmit(e) {
    e.preventDefault();
    const trimmed = orgCode.trim().toUpperCase();
    if (!trimmed) return;
    setOrgCodeBusy(true);
    setOrgCodeError("");

    // Find workspace with this org code
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, name, org_code")
      .eq("org_code", trimmed)
      .maybeSingle();

    if (wsErr || !ws) {
      setOrgCodeError("Invalid organisation code. Please check and try again.");
      setOrgCodeBusy(false);
      return;
    }

    // Check if this email is invited
    const { data: chat } = await supabase
      .from("chats")
      .select("id, name")
      .eq("workspace_id", ws.id)
      .eq("assigned_email", userEmail)
      .eq("type", "teammate")
      .maybeSingle();

    setWorkspaceId(ws.id);
    setOrgName(ws.name);
    setOrgCodeBusy(false);

    if (chat) {
      setChatId(chat.id);
      setChatName(chat.name);
      setStep("invited");
    } else {
      setStep("not_invited");
    }
  }

  async function handleAccept() {
    // Link this user to the chat
    await supabase.from("chats")
      .update({ assigned_user_id: userId })
      .eq("id", chatId);

    // Load existing messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    setMessages(msgs ?? []);
    setStep("chat");
  }

  async function handleSend() {
    if (!input.trim() || busy) return;
    const trimmed = input.trim();
    setBusy(true);
    setInput("");

    const ins = await supabase.from("messages")
      .insert({ chat_id: chatId, role: "user", content: trimmed })
      .select("id, role, content, created_at").single();
    if (ins.error) { setBusy(false); return; }

    const nextMessages = [...messages, ins.data];
    setMessages(nextMessages);

    const res = await fetch("/api/teammate-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        chatId,
        workspaceId,
        chatName,
      }),
    });
    const payload = await res.json();
    const replyText = payload.reply || "Something went wrong.";

    const asstIns = await supabase.from("messages")
      .insert({ chat_id: chatId, role: "assistant", content: replyText })
      .select("id, role, content, created_at").single();
    if (!asstIns.error) setMessages(prev => [...prev, asstIns.data]);

    setBusy(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
          <input
            type="text"
            value={orgCode}
            onChange={e => { setOrgCode(e.target.value.toUpperCase()); setOrgCodeError(""); }}
            placeholder="e.g. MYCODE"
            maxLength={12}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-center text-sm font-mono font-semibold text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
          />
          {orgCodeError && <p className="text-center text-xs text-red-400">{orgCodeError}</p>}
          <button
            type="submit"
            disabled={!orgCode.trim() || orgCodeBusy}
            className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
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
        <button type="button" onClick={() => { setStep("enter_code"); setOrgCode(""); }} className="mt-6 text-xs text-zinc-500 underline hover:text-zinc-300">
          Try a different code
        </button>
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
          <button type="button" onClick={handleAccept} className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white">
            Accept Invitation
          </button>
          <button type="button" onClick={() => router.replace("/auth")} className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "chat") return (
    <div className="flex h-screen flex-col bg-zinc-900 font-sans text-zinc-100">
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
        *::-webkit-scrollbar { width: 3px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 999px; }
        *::-webkit-scrollbar-button { display: none; }
      `}</style>

      <header className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-4">
        <p className="text-sm font-semibold text-zinc-200">{chatName}</p>
        <span className="ml-2 text-xs text-zinc-600">— {orgName}</span>
      </header>

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
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !busy && input.trim()) handleSend(); }}
            placeholder="Reply…"
            disabled={busy}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}