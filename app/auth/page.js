"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ThemeSelector() {
  const [current, setCurrent] = useState("system");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrent(localStorage.getItem("myteam-theme") ?? "system");
  }, []);

  function select(pref) {
    localStorage.setItem("myteam-theme", pref);
    const resolved =
      pref === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : pref;
    if (resolved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    setCurrent(pref);
  }

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-zinc-700 bg-zinc-800 [html.light_&]:border-zinc-300 [html.light_&]:bg-zinc-100">
      <button
        type="button"
        onClick={() => select("system")}
        title="System"
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          current === "system"
            ? "bg-zinc-100 text-zinc-950 [html.light_&]:bg-zinc-800 [html.light_&]:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 [html.light_&]:hover:text-zinc-600"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => select("light")}
        title="Light"
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          current === "light"
            ? "bg-zinc-100 text-zinc-950 [html.light_&]:bg-zinc-800 [html.light_&]:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 [html.light_&]:hover:text-zinc-600"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => select("dark")}
        title="Dark"
        className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
          current === "dark"
            ? "bg-zinc-100 text-zinc-950 [html.light_&]:bg-zinc-800 [html.light_&]:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300 [html.light_&]:hover:text-zinc-600"
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  // Apply saved theme on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("myteam-theme") ?? "system";
    const resolved =
      saved === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : saved;
    if (resolved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("user_role")
          .eq("owner_user_id", session.user.id)
          .maybeSingle();
        if (ws?.user_role === "teammate") {
          router.replace("/teammate");
        } else {
          router.replace("/dashboard");
        }
        router.refresh();
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  function isLikelyExistingAccountError(signUpError) {
    const msg = (signUpError.message ?? "").toLowerCase();
    return (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists") ||
      msg.includes("user already")
    );
  }

  async function redirectAfterAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: ws } = await supabase
      .from("workspaces")
      .select("user_role")
      .eq("owner_user_id", session.user.id)
      .maybeSingle();
    if (ws?.user_role === "teammate") {
      router.push("/teammate");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          if (isLikelyExistingAccountError(signUpError)) {
            setNotice("An account with this email already exists. Use Login with your password.");
            setMode("login");
          } else {
            setError(signUpError.message);
          }
          return;
        }
        const identities = data?.user?.identities ?? [];
        if (data?.user && identities.length === 0) {
          setNotice("This email is already registered. Please sign in instead.");
          setMode("login");
          return;
        }
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setInfo("Account created. If email confirmation is enabled, check your inbox before signing in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        await redirectAfterAuth();
      }
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError(null);
    setInfo(null);
    setNotice(null);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 [html.light_&]:bg-zinc-100 transition-colors duration-200">

      {/* Subtle dot grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 [html.light_&]:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/50 [html.light_&]:border-zinc-200 [html.light_&]:bg-white [html.light_&]:shadow-zinc-300/40">

        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-lg font-bold tracking-tight text-zinc-50 [html.light_&]:text-zinc-900">
            MyTeam
          </h1>
          <p className="mt-1 text-xs text-zinc-500 [html.light_&]:text-zinc-500">
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="mb-6 flex rounded-lg bg-zinc-950/80 p-1 ring-1 ring-zinc-800 [html.light_&]:bg-zinc-100 [html.light_&]:ring-zinc-200"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => { setMode("login"); clearMessages(); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-zinc-800 text-zinc-50 shadow-sm [html.light_&]:bg-white [html.light_&]:text-zinc-900 [html.light_&]:shadow-zinc-200"
                : "text-zinc-500 hover:text-zinc-300 [html.light_&]:hover:text-zinc-700"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => { setMode("signup"); clearMessages(); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-zinc-800 text-zinc-50 shadow-sm [html.light_&]:bg-white [html.light_&]:text-zinc-900 [html.light_&]:shadow-zinc-200"
                : "text-zinc-500 hover:text-zinc-300 [html.light_&]:hover:text-zinc-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-shadow focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30 [html.light_&]:border-zinc-300 [html.light_&]:bg-zinc-50 [html.light_&]:text-zinc-900 [html.light_&]:placeholder:text-zinc-400 [html.light_&]:focus:border-zinc-400 [html.light_&]:focus:ring-zinc-400/30"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-shadow focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30 [html.light_&]:border-zinc-300 [html.light_&]:bg-zinc-50 [html.light_&]:text-zinc-900 [html.light_&]:placeholder:text-zinc-400 [html.light_&]:focus:border-zinc-400 [html.light_&]:focus:ring-zinc-400/30"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300 [html.light_&]:border-red-200 [html.light_&]:bg-red-50 [html.light_&]:text-red-600" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-200 [html.light_&]:border-amber-200 [html.light_&]:bg-amber-50 [html.light_&]:text-amber-700" role="status">
              {notice}
            </p>
          )}
          {info && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300 [html.light_&]:border-emerald-200 [html.light_&]:bg-emerald-50 [html.light_&]:text-emerald-700">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 [html.light_&]:bg-zinc-900 [html.light_&]:text-zinc-50 [html.light_&]:hover:bg-zinc-800"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>

      {/* Theme selector — bottom left */}
      <div className="fixed bottom-4 left-4 z-50">
        <ThemeSelector />
      </div>
    </div>
  );
}