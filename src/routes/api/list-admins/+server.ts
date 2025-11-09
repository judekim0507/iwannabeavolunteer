import { json, type RequestHandler } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private";

const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const GET: RequestHandler = async ({ request }) => {
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
      return json({ error: "Only superusers can list admin accounts" }, { status: 403 });
    }

    // Get all council admins
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("council_admins")
      .select("*")
      .order("created_at", { ascending: false });

    if (adminsError) {
      return json({ error: adminsError.message }, { status: 400 });
    }

    // Get all auth users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return json({ error: usersError.message }, { status: 400 });
    }

    // Combine the data
    const adminsWithEmails = (admins || []).map((admin) => {
      const authUser = users.find((u) => u.id === admin.user_id);
      return {
        ...admin,
        email: authUser?.email || "Unknown",
      };
    });

    return json({ admins: adminsWithEmails });

  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, { status: 500 });
  }
};

