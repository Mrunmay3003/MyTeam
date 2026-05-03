"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PLACEHOLDER_CHATS = ["Creatives", "Dev", "Outreach"];

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
  const [selectedChat, setSelectedChat] = useState(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
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
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <p className="text-sm leading-relaxed text-zinc-500">
                Placeholder: add company goals, tone, and key facts your AI
                managers should keep in mind when coordinating with each team.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
