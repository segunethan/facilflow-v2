// ============================================================
// FaciliFlow Email Service — powered by Resend
// Deploy with: supabase functions deploy send-email
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = 're_2Z2fGbM8_CZBwztt3Jhnv8EkAeCzqQ6CC'
const FROM_EMAIL     = 'facilflow@africaprudential.com'
const FROM_NAME      = 'FaciliFlow — Africa Prudential'

// ── SHARED DESIGN TOKENS ───────────────────────────────────
const brand   = '#C8102E'
const ink     = '#0F172A'
const muted   = '#64748B'
const border  = '#E2E8F0'
const pageBg  = '#F7F8FA'
const green   = '#059669'
const greenBg = '#ECFDF5'
const blue    = '#2563EB'
const blueBg  = '#EFF6FF'
const amber   = '#D97706'
const amberBg = '#FFFBEB'
const red     = '#DC2626'
const redBg   = '#FEF2F2'

// ── SHARED LAYOUT HELPERS ──────────────────────────────────
// Logo SVG as inline data — AP monogram in a red rounded square
const LOGO_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="#C8102E"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#fff" letter-spacing="-1">AP</text></svg>`

const header = (accentColor: string, title: string, subtitle?: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${accentColor};border-radius:12px 12px 0 0">
    <tr>
      <td style="padding:28px 32px">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:16px;vertical-align:middle">
              ${LOGO_SVG}
            </td>
            <td style="vertical-align:middle">
              <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">Africa Prudential Plc</div>
              <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.1">${title}</div>
              ${subtitle ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">${subtitle}</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`

const footer = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
    <tr>
      <td style="padding:20px 0;text-align:center;border-top:1px solid ${border}">
        <div style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin-bottom:6px">
          <strong style="color:${ink}">Africa Prudential Plc</strong> · FaciliFlow Facilities Management
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8">
          This is an automated message from FaciliFlow. Please do not reply to this email.
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1;margin-top:6px">
          © ${new Date().getFullYear()} Africa Prudential Plc. All rights reserved.
        </div>
      </td>
    </tr>
  </table>`

const cta = (url: string, label: string, color: string) => `
  <table cellpadding="0" cellspacing="0" style="margin-top:24px">
    <tr>
      <td style="background:${color};border-radius:8px">
        <a href="${url}" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.2px">${label}</a>
      </td>
    </tr>
  </table>`

const infoRow = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;width:140px;background:#F8FAFC;border-bottom:1px solid ${border}">${label}</td>
    <td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${ink};font-weight:500;border-bottom:1px solid ${border}">${value}</td>
  </tr>`

const wrap = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FaciliFlow</title></head>
<body style="margin:0;padding:0;background:${pageBg};font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${pageBg};padding:40px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <tr>
            <td style="background:#fff;border-radius:12px;border:1px solid ${border};overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
              ${content}
            </td>
          </tr>
          <tr><td>${footer()}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

const body = (content: string) => `<div style="padding:28px 32px">${content}</div>`

const badge = (text: string, color: string, bg: string) =>
  `<span style="display:inline-block;padding:3px 10px;background:${bg};color:${color};font-family:Arial,sans-serif;font-size:11px;font-weight:700;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">${text}</span>`

const divider = () => `<div style="height:1px;background:${border};margin:20px 0"></div>`

const highlight = (text: string, color: string, bg: string) =>
  `<div style="background:${bg};border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:12px 16px;margin:16px 0;font-family:Arial,sans-serif;font-size:13px;color:${color};line-height:1.6">${text}</div>`

// ══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════
const templates: Record<string, (data: any) => { subject: string; html: string }> = {

  // ── 1. USER INVITATION ──────────────────────────────────────
  user_invitation: (data) => ({
    subject: `You've been invited to join FaciliFlow — Africa Prudential`,
    html: wrap(`
      ${header(brand, 'Welcome to FaciliFlow', 'You have been invited to join the platform')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          You have been invited to join <strong>Africa Prudential FaciliFlow</strong> — the facilities and IT change management platform for Africa Prudential Plc.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('Name', data.name || '—')}
          ${infoRow('Email', data.email || '—')}
          ${infoRow('Role', (data.role || '').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()))}
          ${infoRow('Department', data.dept || '—')}
          ${infoRow('Temporary Password', data.temp_password ? `<code style="background:#F1F5F9;padding:2px 8px;border-radius:4px;font-size:13px;color:${brand};font-weight:700">${data.temp_password}</code>` : 'Set on first login')}
        </table>

        <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:0 0 4px">To get started:</p>
        <ol style="font-family:Arial,sans-serif;font-size:13px;color:#334155;margin:8px 0 20px;padding-left:20px;line-height:1.9">
          <li>Click the button below to open FaciliFlow</li>
          <li>Log in using your email and the temporary password above</li>
          <li>You will be prompted to set a new password on first login</li>
        </ol>

        ${cta(data.invite_url || 'https://facilflowuser.vercel.app', 'Accept Invitation & Get Started →', brand)}

        ${divider()}
        <p style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin:0;line-height:1.7">
          If you were not expecting this invitation, please ignore this email or contact your IT administrator.<br/>
          Your account will not be activated until you log in for the first time.
        </p>
      `)}
    `)
  }),

  // ── 2. REQUEST APPROVED (Pool Car + Stationery) ─────────────
  request_approved: (data) => ({
    subject: `Your ${data.type} request has been approved — FaciliFlow`,
    html: wrap(`
      ${header(green, 'Request Approved', `Your ${data.type} request has been actioned`)}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.requester_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Your <strong>${data.type}</strong> request has been <strong style="color:${green}">approved</strong> by ${data.approver}.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('Request ID', data.request_id || '—')}
          ${infoRow('Title', data.title || '—')}
          ${infoRow('Type', data.type || '—')}
          ${infoRow('Approved By', data.approver || '—')}
          ${infoRow('Approved On', data.approved_at || new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}))}
          ${data.vehicle ? infoRow('Assigned Vehicle', data.vehicle) : ''}
          ${data.driver  ? infoRow('Assigned Driver',  data.driver)  : ''}
        </table>

        ${data.note ? highlight(`<strong>Note from approver:</strong> "${data.note}"`, green, greenBg) : ''}

        <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:0 0 20px;line-height:1.6">
          ${data.type === 'Pool Car'
            ? 'Your vehicle has been assigned. Please ensure you return the vehicle in good condition.'
            : 'The facilities team will process and deliver your stationery items shortly.'}
        </p>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View Request Details →', green)}
      `)}
    `)
  }),

  // ── 3. REQUEST REJECTED ─────────────────────────────────────
  request_rejected: (data) => ({
    subject: `Your ${data.type} request was not approved — FaciliFlow`,
    html: wrap(`
      ${header(red, 'Request Not Approved', `Your ${data.type} request requires attention`)}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.requester_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Unfortunately your <strong>${data.type}</strong> request has not been approved at this time.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('Request ID', data.request_id || '—')}
          ${infoRow('Title', data.title || '—')}
          ${infoRow('Type', data.type || '—')}
          ${infoRow('Reviewed By', data.approver || '—')}
        </table>

        ${data.reason ? highlight(`<strong>Reason:</strong> "${data.reason}"`, red, redBg) : ''}

        <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:16px 0;line-height:1.6">
          If you believe this decision is incorrect or would like to discuss further, please contact your line manager or the facilities team.
        </p>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View Request →', red)}
      `)}
    `)
  }),

  // ── 4. REQUEST DELIVERED ────────────────────────────────────
  request_delivered: (data) => ({
    subject: `Your ${data.type} request has been delivered — FaciliFlow`,
    html: wrap(`
      ${header(blue, 'Request Delivered', 'Your request has been fulfilled')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.requester_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Your <strong>${data.type}</strong> request has been <strong style="color:${blue}">delivered</strong> and marked as complete.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('Request ID', data.request_id || '—')}
          ${infoRow('Title', data.title || '—')}
          ${infoRow('Delivered On', data.delivered_at || new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}))}
          ${infoRow('Processed By', data.processed_by || 'Facilities Team')}
        </table>

        <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:0 0 20px;line-height:1.6">
          If you did not receive your items or have any concerns, please raise a new request or contact the facilities team directly.
        </p>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View Request History →', blue)}
      `)}
    `)
  }),

  // ── 5. CR SUBMITTED ─────────────────────────────────────────
  cr_submitted: (data) => ({
    subject: `Action Required: New Change Request ${data.cr_id} — ${data.title}`,
    html: wrap(`
      ${header(brand, 'New Change Request', 'Your approval is required')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.approver_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          A new change request has been submitted and requires your review and approval.
        </p>

        ${data.is_emergency ? highlight('⚡ <strong>EMERGENCY CHANGE REQUEST</strong> — This requires immediate attention and expedited approval.', red, redBg) : ''}

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('CR ID', data.cr_id)}
          ${infoRow('Title', data.title)}
          ${infoRow('Change Type', data.change_type)}
          ${infoRow('Risk Level', data.risk_level)}
          ${infoRow('System / Service', data.system_name || '—')}
          ${infoRow('Environment', data.environment)}
          ${infoRow('Raised By', data.raised_by)}
          ${infoRow('Proposed Date', data.deploy_date)}
        </table>

        ${data.description ? `<div style="background:#F8FAFC;border-radius:8px;padding:14px 16px;margin-bottom:20px"><div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Description</div><p style="font-family:Arial,sans-serif;font-size:13px;color:#334155;margin:0;line-height:1.7">${data.description}</p></div>` : ''}

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'Review & Approve Change Request →', brand)}

        ${divider()}
        <p style="font-family:Arial,sans-serif;font-size:11px;color:${muted};margin:0">
          Please review the full change request details including rollback plan and test evidence before approving.
        </p>
      `)}
    `)
  }),

  // ── 6. CR APPROVED ──────────────────────────────────────────
  cr_approved: (data) => ({
    subject: `${data.cr_id} Approved at Stage ${data.stage} — FaciliFlow`,
    html: wrap(`
      ${header(green, 'Change Request Approved', `Stage ${data.stage} approval complete`)}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.initiator_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Your change request <strong>${data.cr_id}</strong> has been approved at <strong>Stage ${data.stage}</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('CR ID', data.cr_id)}
          ${infoRow('Title', data.title)}
          ${infoRow('Approved By', data.approver)}
          ${infoRow('Stage', `Stage ${data.stage}`)}
          ${infoRow('Next Step', data.next_step || '—')}
        </table>

        ${data.comment ? highlight(`<strong>Approver comment:</strong> "${data.comment}"`, green, greenBg) : ''}

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View Change Request →', green)}
      `)}
    `)
  }),

  // ── 7. CR REJECTED ──────────────────────────────────────────
  cr_rejected: (data) => ({
    subject: `${data.cr_id} Has Been Rejected — FaciliFlow`,
    html: wrap(`
      ${header(red, 'Change Request Rejected', 'Your change request was not approved')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.initiator_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Your change request <strong>${data.cr_id}: ${data.title}</strong> has been rejected.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('CR ID', data.cr_id)}
          ${infoRow('Title', data.title)}
          ${infoRow('Rejected By', data.approver)}
          ${infoRow('Rejected At Stage', `Stage ${data.stage || '—'}`)}
        </table>

        ${data.reason ? highlight(`<strong>Reason for rejection:</strong> "${data.reason}"`, red, redBg) : ''}

        <p style="font-family:Arial,sans-serif;font-size:13px;color:${muted};margin:16px 0;line-height:1.6">
          You may revise your change request and resubmit after addressing the concerns raised.
        </p>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View Change Request →', red)}
      `)}
    `)
  }),

  // ── 8. CR SCHEDULED ─────────────────────────────────────────
  cr_scheduled: (data) => ({
    subject: `${data.cr_id} Scheduled for ${data.deploy_date} — FaciliFlow`,
    html: wrap(`
      ${header(blue, 'Change Request Scheduled', 'Your change has been approved and scheduled')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.initiator_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          Your change request <strong>${data.cr_id}: ${data.title}</strong> has been fully approved and is scheduled for deployment.
        </p>

        <div style="background:${blueBg};border:1px solid #BFDBFE;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
          <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${blue};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Scheduled Deployment</div>
          <div style="font-family:Arial,sans-serif;font-size:26px;font-weight:900;color:#1E3A8A;letter-spacing:-0.5px">${data.deploy_date}</div>
          <div style="font-family:Arial,sans-serif;font-size:15px;color:${blue};margin-top:6px;font-weight:600">${data.deploy_start} – ${data.deploy_end}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:${muted};margin-top:4px">${data.environment}</div>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('CR ID', data.cr_id)}
          ${infoRow('Title', data.title)}
          ${infoRow('System', data.system_name || '—')}
          ${infoRow('Environment', data.environment)}
        </table>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'View on Calendar →', blue)}
      `)}
    `)
  }),

  // ── 9. CR REMINDER ──────────────────────────────────────────
  cr_reminder: (data) => ({
    subject: `Reminder: ${data.cr_id} is awaiting your approval — FaciliFlow`,
    html: wrap(`
      ${header(amber, 'Approval Reminder', 'A change request is still waiting for your review')}
      ${body(`
        <p style="font-family:Arial,sans-serif;font-size:15px;color:${ink};margin:0 0 8px;font-weight:600">Hi ${data.approver_name || 'there'},</p>
        <p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 20px;line-height:1.7">
          This is a reminder that the following change request is still awaiting your approval.
        </p>

        ${highlight(`⏳ This request has been pending for <strong>${data.hours_pending || 'some'} hours</strong>. Please review at your earliest convenience.`, amber, amberBg)}

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${border};border-radius:8px;overflow:hidden;margin-bottom:20px">
          ${infoRow('CR ID', data.cr_id)}
          ${infoRow('Title', data.title)}
          ${infoRow('Change Type', data.change_type || '—')}
          ${infoRow('Risk Level', data.risk_level || '—')}
          ${infoRow('Raised By', data.raised_by)}
          ${infoRow('Submitted On', data.submitted_date)}
        </table>

        ${cta(data.app_url || 'https://facilflowuser.vercel.app', 'Review & Approve Now →', amber)}
      `)}
    `)
  }),

}

// ── EDGE FUNCTION HANDLER ──────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { template, to, data } = await req.json()

    if (!templates[template]) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}. Valid: ${Object.keys(templates).join(', ')}` }),
        { status: 400 }
      )
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

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )

  } catch (err) {
    console.error('Email error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})