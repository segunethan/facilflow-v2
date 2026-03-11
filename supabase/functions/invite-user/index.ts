// supabase/functions/invite-user/index.ts
// Deploy with: supabase functions deploy invite-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = "https://jdvzoimemzijqamphgyg.supabase.co"
// Service role key — never expose this in frontend code, only in edge functions
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, name, role, dept, tenant_id, temp_password, redirect_to } = await req.json()

    // Create admin client with service role
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create the auth user with a temp password
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: false, // they still need to verify
      user_metadata: { full_name: name },
    })

    if (authError) throw authError

    const userId = authData.user.id
    const initials = name.trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

    // Create profile row with the real auth UUID
    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert([{
        id: userId,
        tenant_id,
        name,
        initials,
        email,
        role,
        dept,
        status: "invited",
      }])
      .select()
      .single()

    if (profileError) throw profileError

    // Send invite email via Supabase (generates magic link)
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to,
      data: { full_name: name },
    })

    // Non-fatal if invite email fails — user can still log in with temp password
    if (inviteError) console.error("Invite email error:", inviteError)

    return new Response(JSON.stringify({ success: true, user: profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error("Invite error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})