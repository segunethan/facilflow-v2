// ============================================================
// FaciliFlow Email Service — powered by Resend
// These are called as Supabase Edge Functions
// Deploy with: supabase functions deploy send-email
// ============================================================

// Deno / Supabase Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = 're_2Z2fGbM8_CZBwztt3Jhnv8EkAeCzqQ6CC'
const FROM_EMAIL = 'facilflow@africaprudential.com'
const FROM_NAME  = 'FaciliFlow — Africa Prudential'

// ── EMAIL TEMPLATES ────────────────────────────────────────
const templates = {

  cr_submitted: (data) => ({
    subject: `[FaciliFlow] New Change Request: ${data.cr_id} — ${data.title}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#C8102E;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">New Change Request Submitted</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px">A new change request requires your approval:</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase;width:140px">CR ID</td><td style="padding:8px 12px;color:#0F172A;font-weight:700">${data.cr_id}</td></tr>
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase">Title</td><td style="padding:8px 12px;color:#0F172A">${data.title}</td></tr>
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase">Type</td><td style="padding:8px 12px;color:#0F172A">${data.change_type}</td></tr>
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase">Risk</td><td style="padding:8px 12px;color:#0F172A">${data.risk_level}</td></tr>
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase">Raised By</td><td style="padding:8px 12px;color:#0F172A">${data.raised_by}</td></tr>
            <tr><td style="padding:8px 12px;background:#F7F8FA;font-weight:600;color:#64748B;font-size:12px;text-transform:uppercase">Deploy Date</td><td style="padding:8px 12px;color:#0F172A">${data.deploy_date}</td></tr>
          </table>
          <a href="${data.app_url}" style="display:inline-block;background:#C8102E;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Review Change Request →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  cr_approved: (data) => ({
    subject: `[FaciliFlow] ✓ ${data.cr_id} Approved at Stage ${data.stage}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Change Request Approved</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px"><strong>${data.cr_id}</strong> has been approved at <strong>Stage ${data.stage}</strong> by <strong>${data.approver}</strong>.</p>
          ${data.comment ? `<div style="background:#F0FDF4;border-left:3px solid #059669;padding:12px 16px;margin-bottom:20px;color:#166534;font-style:italic">"${data.comment}"</div>` : ''}
          <p style="color:#64748B;font-size:13px">Next step: ${data.next_step}</p>
          <a href="${data.app_url}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">View Change Request →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  cr_rejected: (data) => ({
    subject: `[FaciliFlow] ✕ ${data.cr_id} Rejected`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#DC2626;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Change Request Rejected</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px"><strong>${data.cr_id}: ${data.title}</strong> has been rejected by <strong>${data.approver}</strong>.</p>
          ${data.reason ? `<div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:12px 16px;margin-bottom:20px;color:#991B1B;font-style:italic">Reason: "${data.reason}"</div>` : ''}
          <a href="${data.app_url}" style="display:inline-block;background:#DC2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">View Change Request →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  cr_scheduled: (data) => ({
    subject: `[FaciliFlow] 📅 ${data.cr_id} Scheduled for ${data.deploy_date}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#2563EB;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Change Request Scheduled</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px"><strong>${data.cr_id}: ${data.title}</strong> has been approved and scheduled.</p>
          <div style="background:#EFF6FF;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:#1E40AF">${data.deploy_date}</div>
            <div style="font-size:14px;color:#2563EB;margin-top:4px">${data.deploy_start} – ${data.deploy_end}</div>
            <div style="font-size:12px;color:#64748B;margin-top:4px">${data.environment}</div>
          </div>
          <a href="${data.app_url}" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">View on Calendar →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  cr_reminder: (data) => ({
    subject: `[FaciliFlow] ⏳ Reminder: ${data.cr_id} awaits your approval`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#D97706;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Approval Reminder</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px">This is a reminder that <strong>${data.cr_id}: ${data.title}</strong> is still awaiting your approval.</p>
          <p style="color:#64748B;font-size:13px">Submitted by ${data.raised_by} on ${data.submitted_date}.</p>
          <a href="${data.app_url}" style="display:inline-block;background:#D97706;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">Review Now →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  user_invitation: (data) => ({
    subject: `You've been invited to FaciliFlow — Africa Prudential`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#C8102E;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Welcome to FaciliFlow</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px">You've been invited to join <strong>Africa Prudential FaciliFlow</strong> as a <strong style="text-transform:capitalize">${data.role.replace('_',' ')}</strong>.</p>
          <p style="color:#64748B;font-size:13px;margin-bottom:20px">Click the button below to set up your account and get started.</p>
          <a href="${data.invite_url}" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px">Accept Invitation →</a>
          <p style="color:#94A3B8;font-size:11px;margin-top:20px">This link expires in 48 hours. If you didn't expect this email, ignore it.</p>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),

  request_approved: (data) => ({
    subject: `[FaciliFlow] ✓ Your ${data.type} request has been approved`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Request Approved</h2>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="color:#334155;margin:0 0 16px">Your <strong>${data.type}</strong> request "<strong>${data.title}</strong>" has been approved by ${data.approver}.</p>
          <p style="color:#64748B;font-size:13px">The facilities team will process your request shortly.</p>
          <a href="${data.app_url}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">View Request →</a>
        </div>
        <p style="color:#94A3B8;font-size:11px;text-align:center;margin-top:16px">FaciliFlow · Africa Prudential Plc</p>
      </div>
    `
  }),
}

// ── EDGE FUNCTION HANDLER ──────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { template, to, data } = await req.json()

    if (!templates[template]) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), { status: 400 })
    }

    const { subject, html } = templates[template](data)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(JSON.stringify({ error: result }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
