import { json, type RequestHandler } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_URL } from "$env/static/public";
import { SUPABASE_SERVICE_ROLE_KEY } from "$env/static/private";

// Server-side Supabase client with service role (has admin privileges)
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST: RequestHandler = async ({ request, locals }) => {
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
      return json({ error: "Only superusers can create admin accounts" }, { status: 403 });
    }

    // Get request body
    const { email, password, councilId } = await request.json();

    if (!email || !password) {
      return json({ error: "Email and password are required" }, { status: 400 });
    }

    // Create the auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return json({ error: createError.message }, { status: 400 });
    }

    // Create the council_admin record
    const { error: adminError } = await supabaseAdmin
      .from("council_admins")
      .insert({
        user_id: authData.user.id,
        council_id: councilId || null,
        role: "admin",
      });

    if (adminError) {
      // Cleanup: delete the auth user if council_admin creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return json({ error: adminError.message }, { status: 400 });
    }

    return json({ 
      success: true, 
      admin: {
        id: authData.user.id,
        email: authData.user.email,
      }
    });

  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, { status: 500 });
  }
};

