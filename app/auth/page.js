"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

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

    return () => {
      cancelled = true;
    };
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
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          if (isLikelyExistingAccountError(signUpError)) {
            setNotice(
              "An account with this email already exists. Use Login with your password."
            );
            setMode("login");
          } else {
            setError(signUpError.message);
          }
          return;
        }

        // Duplicate signup: Supabase returns a user with no new identities (security / existing email).
        const identities = data?.user?.identities ?? [];
        if (data?.user && identities.length === 0) {
          setNotice(
            "This email is already registered. Please sign in instead."
          );
          setMode("login");
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setInfo(
            "Account created. If email confirmation is enabled, check your inbox before signing in."
          );
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
            MyTeam
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <div
          className="mb-6 flex rounded-lg bg-zinc-950/80 p-1 ring-1 ring-zinc-800"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-zinc-800 text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-zinc-800 text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 transition-shadow focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30"
              placeholder="you@company.com"
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
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 transition-shadow focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              className="rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
              role="status"
            >
              {notice}
            </p>
          )}
          {info && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
