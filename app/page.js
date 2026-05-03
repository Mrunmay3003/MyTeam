"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
