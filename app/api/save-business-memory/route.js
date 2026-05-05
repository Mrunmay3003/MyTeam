import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const body = await request.json();
    const { workspaceId, content } = body ?? {};
    console.log("API received:", { workspaceId, content });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return Response.json(
        { error: "Server configuration error (missing Supabase env)." },
        { status: 500 }
      );
    }

    if (
      typeof workspaceId !== "string" ||
      !workspaceId.trim() ||
      content == null ||
      typeof content !== "object" ||
      Array.isArray(content)
    ) {
      const reason = {
        message: "Invalid body: expected { workspaceId: string, content: object }.",
        workspaceId,
        content,
        checks: {
          workspaceIdIsString: typeof workspaceId === "string",
          workspaceIdNonEmpty:
            typeof workspaceId === "string" && !!workspaceId.trim(),
          contentPresent: content != null,
          contentIsPlainObject:
            content != null &&
            typeof content === "object" &&
            !Array.isArray(content),
        },
      };
      console.log("Returning 400 because:", reason);
      return Response.json(
        { error: reason.message },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* ignore set from route */
          }
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId.trim())
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (workspaceError) {
      console.error("save-business-memory workspace lookup:", workspaceError);
      return Response.json({ error: workspaceError.message }, { status: 500 });
    }
    if (!workspace) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from("business_memory").upsert(
      {
        workspace_id: workspaceId.trim(),
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    if (error) {
      console.error("save-business-memory upsert:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("save-business-memory route error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
