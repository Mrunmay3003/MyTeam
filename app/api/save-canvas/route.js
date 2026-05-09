import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, workspaceId, userId, payload } = body ?? {};

    if (!workspaceId || !userId || !action) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_user_id", userId)
      .single();

    if (wsError || !workspace) {
      return Response.json({ error: "Workspace not found or unauthorized." }, { status: 403 });
    }

    if (action === "create_manager") {
      const { name, pos } = payload;
      const { data, error } = await supabaseAdmin
        .from("chats")
        .insert({ workspace_id: workspaceId, type: "manager", name, pos_x: pos.x, pos_y: pos.y, chat_open: false })
        .select("id, name, pos_x, pos_y, chat_open")
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, data });
    }

    if (action === "create_teammate") {
      const { name, pos } = payload;
      const { data, error } = await supabaseAdmin
        .from("chats")
        .insert({ workspace_id: workspaceId, type: "teammate", name, pos_x: pos.x, pos_y: pos.y, chat_open: false })
        .select("id, name, pos_x, pos_y, assigned_email")
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true, data });
    }

    if (action === "update_pos") {
      const { chatId, pos } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ pos_x: pos.x, pos_y: pos.y })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "update_size") {
      const { chatId, nodeW, nodeH } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ node_w: nodeW, node_h: nodeH })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "toggle_chat_open") {
      const { chatId, chatOpen } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ chat_open: chatOpen })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "assign_email") {
      const { chatId, email } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ assigned_email: email })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "unassign_email") {
      const { chatId } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ assigned_email: null })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "delete_chat") {
      const { chatId } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .delete()
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "rename_chat") {
      const { chatId, name } = payload;
      const { error } = await supabaseAdmin
        .from("chats")
        .update({ name })
        .eq("id", chatId)
        .eq("workspace_id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "save_viewport") {
      const { offsetX, offsetY, scale } = payload;
      const { error } = await supabaseAdmin
        .from("workspace_settings")
        .upsert({ workspace_id: workspaceId, canvas_offset_x: offsetX, canvas_offset_y: offsetY, canvas_scale: scale, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "set_role") {
      const { role } = payload;
      const { error } = await supabaseAdmin
        .from("workspaces")
        .update({ seen_onboarding: true, user_role: role })
        .eq("id", workspaceId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "save_org_code") {
  const { code } = payload;
  const { error } = await supabaseAdmin
    .from("workspaces")
    .update({ org_code: code })
    .eq("id", workspaceId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

  if (action === "save_teammate_link") {
    const { linkedWorkspaceId, linkedChatId } = payload;
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ linked_workspace_id: linkedWorkspaceId, linked_chat_id: linkedChatId })
      .eq("id", workspaceId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

    return Response.json({ error: "Unknown action." }, { status: 400 });

  } catch (err) {
    console.error("[/api/save-canvas] error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}