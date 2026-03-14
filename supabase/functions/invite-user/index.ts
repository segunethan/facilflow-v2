// supabase/functions/invite-user/index.ts
// Deploy with: supabase functions deploy invite-user --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL     = "https://jdvzoimemzijqamphgyg.supabase.co"
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY   = 're_2Z2fGbM8_CZBwztt3Jhnv8EkAeCzqQ6CC'

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Create auth user with temp password (email already confirmed)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (authError) throw authError

    const userId  = authData.user.id
    const initials = name.trim().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

    // 2. Create profile row with real auth UUID
    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert([{ id: userId, tenant_id, name, initials, email, role, dept, status: "active" }])
      .select()
      .single()
    if (profileError) throw profileError

    // 3. Send our own branded invitation email via Resend (not Supabase default)
    const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FaciliFlow — Africa Prudential <facilflow@africaprudential.com>",
        to: [email],
        subject: "You've been invited to join FaciliFlow — Africa Prudential",
        html: buildInviteEmail({ name, email, role: roleDisplay, dept, temp_password, invite_url: redirect_to }),
      }),
    })

    return new Response(JSON.stringify({ success: true, user: profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error("Invite error:", err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

// ── BRANDED INVITE EMAIL ───────────────────────────────────
function buildInviteEmail({ name, email, role, dept, temp_password, invite_url }: {
  name: string; email: string; role: string; dept: string;
  temp_password: string; invite_url: string;
}) {
  const brand  = '#C8102E'
  const ink    = '#0F172A'
  const muted  = '#64748B'
  const border = '#E2E8F0'
  const pageBg = '#F7F8FA'
  const green  = '#059669'

  const LOGO = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#C8102E"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#fff" letter-spacing="-1">AP</text></svg>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${pageBg}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${pageBg};padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="background:#fff;border-radius:12px;border:1px solid ${border};overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

          <!-- HEADER -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${brand};border-radius:12px 12px 0 0">
            <tr><td style="padding:28px 32px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:16px;vertical-align:middle">${LOGO}</td>
                  <td style="vertical-align:middle">
                    <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">Africa Prudential Plc</div>
                    <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px">Welcome to FaciliFlow</div>
                    <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">You have been invited to join the platform</div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- BODY -->
          <div style="padding:28px 32px">
            <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${name},</p>
            <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
              You have been invited to join <strong>Africa Prudential FaciliFlow</strong> — the facilities and IT change management platform for Africa Prudential Plc.
            </p>

            <!-- ACCOUNT DETAILS -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
              <tr><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;width:140px;background:#F8FAFC;border-bottom:1px solid ${border}">Name</td><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500;border-bottom:1px solid ${border}">${name}</td></tr>
              <tr><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;background:#F8FAFC;border-bottom:1px solid ${border}">Email</td><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500;border-bottom:1px solid ${border}">${email}</td></tr>
              <tr><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;background:#F8FAFC;border-bottom:1px solid ${border}">Role</td><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500;border-bottom:1px solid ${border}">${role}</td></tr>
              <tr><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;background:#F8FAFC;border-bottom:1px solid ${border}">Department</td><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500;border-bottom:1px solid ${border}">${dept}</td></tr>
              <tr><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;background:#F8FAFC">Temp Password</td><td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500"><code style="background:#F1F5F9;padding:3px 10px;border-radius:5px;font-size:14px;color:${brand};font-weight:700;letter-spacing:1px">${temp_password}</code></td></tr>
            </table>

            <!-- STEPS -->
            <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:0 0 8px;font-weight:600">How to get started:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              ${['Click the button below to open FaciliFlow', `Log in with your email and the temporary password shown above`, 'Update your password when prompted on first login'].map((step, i) => `
              <tr>
                <td style="padding:8px 0;vertical-align:top;width:28px">
                  <div style="width:22px;height:22px;background:${brand};border-radius:50%;text-align:center;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#fff;line-height:22px">${i+1}</div>
                </td>
                <td style="padding:8px 0 8px 8px;font-family:Arial,sans-serif;font-size:13px;color:#334155;line-height:1.6">${step}</td>
              </tr>`).join('')}
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr><td style="background:${brand};border-radius:8px">
                <a href="${invite_url}" style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.2px">Access FaciliFlow →</a>
              </td></tr>
            </table>

            <div style="height:1px;background:${border};margin:24px 0"></div>
            <p style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin:0;line-height:1.7">
              If you were not expecting this invitation, please ignore this email or contact your IT administrator.<br/>
              Your temporary password should be changed immediately after first login for security purposes.
            </p>
          </div>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px 0;text-align:center;border-top:1px solid ${border}">
          <div style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin-bottom:4px"><strong style="color:${ink}">Africa Prudential Plc</strong> · FaciliFlow Facilities Management</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8">This is an automated message. Please do not reply to this email.</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1;margin-top:4px">© ${new Date().getFullYear()} Africa Prudential Plc. All rights reserved.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}