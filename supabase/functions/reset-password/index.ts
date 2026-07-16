// supabase/functions/reset-password/index.ts
// Deploy with: supabase functions deploy reset-password --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL     = "https://jdvzoimemzijqamphgyg.supabase.co"
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL       = "facilflow@thesegunadebayo.com"
const FROM_NAME        = "FaciliFlow — Africa Prudential"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email, redirect_to } = await req.json()
    if (!email) throw new Error("email is required")

    const redirectTo = redirect_to || "https://facilflowuser.vercel.app"

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Generate a recovery link via admin API — bypasses Supabase's own mailer entirely
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    })
    if (error) throw error

    const resetLink = data.properties?.action_link
    if (!resetLink) throw new Error("Failed to generate reset link")

    // Send via Resend HTTP API (same pattern as invite-user)
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject: "Reset your FaciliFlow password",
        html: buildResetEmail({ email, resetLink }),
      }),
    })

    const emailResult = await emailRes.json()
    if (!emailRes.ok) {
      console.error("Resend error:", emailResult)
      throw new Error("Failed to send reset email")
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error("Reset password error:", err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

// ── BRANDED RESET EMAIL ────────────────────────────────────
function buildResetEmail({ email, resetLink }: { email: string; resetLink: string }) {
  const brand  = '#C8102E'
  const ink    = '#0F172A'
  const muted  = '#64748B'
  const border = '#E2E8F0'
  const pageBg = '#F7F8FA'

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
                    <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px">Password Reset Request</div>
                    <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">FaciliFlow — Facilities Management Platform</div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- BODY -->
          <div style="padding:32px 32px">
            <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 10px;font-weight:600">Hi there,</p>
            <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
              We received a request to reset the password for your FaciliFlow account associated with <strong>${email}</strong>.
            </p>
            <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 24px;line-height:1.7">
              Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:${brand};border-radius:8px">
                  <a href="${resetLink}" style="display:inline-block;padding:14px 36px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.2px">Reset my password →</a>
                </td>
              </tr>
            </table>

            <!-- LINK FALLBACK -->
            <div style="background:#F8FAFC;border:1px solid ${border};border-radius:8px;padding:16px;margin-bottom:24px">
              <p style="font-family:Arial,sans-serif;font-size:12px;color:${muted};margin:0 0 8px;font-weight:600">If the button doesn't work, copy this link into your browser:</p>
              <p style="font-family:Arial,sans-serif;font-size:11px;color:${brand};margin:0;word-break:break-all;line-height:1.6">${resetLink}</p>
            </div>

            <div style="height:1px;background:${border};margin:0 0 20px"></div>
            <p style="font-family:Arial,sans-serif;font-size:12px;color:${muted};margin:0;line-height:1.7">
              If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.<br/>
              For security, this link expires in 1 hour and can only be used once.
            </p>
          </div>

        </td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 0;text-align:center">
            <div style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin-bottom:4px">
              <strong style="color:${ink}">Africa Prudential Plc</strong> · FaciliFlow Facilities Management
            </div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8">This is an automated message. Please do not reply to this email.</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1;margin-top:4px">© ${new Date().getFullYear()} Africa Prudential Plc. All rights reserved.</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
