import { json, type RequestHandler } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private";

// Server-side Supabase client with service role
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Get the current user from the request
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is authenticated and is a superuser
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a superuser
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("council_admins")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || adminRole?.role !== "superuser") {
      return json({ error: "Only superusers can delete admin accounts" }, { status: 403 });
    }

    // Get request body
    const { adminId, userId } = await request.json();

    if (!adminId || !userId) {
      return json({ error: "Admin ID and User ID are required" }, { status: 400 });
    }

    // Delete from council_admins
    const { error: deleteError } = await supabaseAdmin
      .from("council_admins")
      .delete()
      .eq("id", adminId);

    if (deleteError) {
      return json({ error: deleteError.message }, { status: 400 });
    }

    // Delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      return json({ error: authDeleteError.message }, { status: 400 });
    }

    return json({ success: true });

  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, { status: 500 });
  }
};

