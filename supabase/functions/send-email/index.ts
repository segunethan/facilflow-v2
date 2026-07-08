import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL     = "facilflow@thesegunadebayo.com"
const FROM_NAME      = "FaciliFlow — Africa Prudential"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── DESIGN TOKENS ─────────────────────────────────────────
const B = "#C8102E"   // brand red
const INK = "#0F172A"
const MUT = "#64748B"
const BDR = "#E2E8F0"
const BG  = "#F7F8FA"
const GRN = "#059669"
const GBG = "#ECFDF5"
const BLU = "#2563EB"
const BBG = "#EFF6FF"
const AMB = "#D97706"
const ABG = "#FFFBEB"
const RED = "#DC2626"
const RBG = "#FEF2F2"

const LOGO = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="${B}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#fff">AP</text></svg>`

// ── LAYOUT HELPERS ────────────────────────────────────────
function wrap(inner) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FaciliFlow</title></head>
<body style="margin:0;padding:0;background:${BG}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="background:#fff;border-radius:12px;border:1px solid ${BDR};overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
${inner}
</td></tr>
<tr><td style="padding:20px 0;text-align:center">
<div style="font-family:Arial,sans-serif;font-size:11px;color:${MUT};margin-bottom:4px"><strong style="color:${INK}">Africa Prudential Plc</strong> · FaciliFlow Facilities Management</div>
<div style="font-family:Arial,sans-serif;font-size:11px;color:#94A3B8">This is an automated message. Please do not reply.</div>
<div style="font-family:Arial,sans-serif;font-size:11px;color:#CBD5E1;margin-top:4px">© ${new Date().getFullYear()} Africa Prudential Plc. All rights reserved.</div>
</td></tr>
</table>
</td></tr></table>
</body></html>`
}

function hdr(color, title, sub) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${color}">
<tr><td style="padding:28px 32px">
<table cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:16px;vertical-align:middle">${LOGO}</td>
<td style="vertical-align:middle">
<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">Africa Prudential Plc</div>
<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#fff">${title}</div>
${sub ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">${sub}</div>` : ""}
</td></tr></table>
</td></tr></table>`
}

function body(content) {
  return `<div style="padding:28px 32px">${content}</div>`
}

function row(label, value) {
  return `<tr>
<td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${MUT};text-transform:uppercase;letter-spacing:0.8px;width:140px;background:#F8FAFC;border-bottom:1px solid ${BDR}">${label}</td>
<td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${INK};font-weight:500;border-bottom:1px solid ${BDR}">${value || "—"}</td>
</tr>`
}

function table(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BDR};border-radius:8px;overflow:hidden;margin-bottom:20px">${rows}</table>`
}

function cta(url, label, color) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="background:${color};border-radius:8px"><a href="${url}" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none">${label}</a></td></tr></table>`
}

function hl(text, color, bg) {
  return `<div style="background:${bg};border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:12px 16px;margin:16px 0;font-family:Arial,sans-serif;font-size:13px;color:${color};line-height:1.6">${text}</div>`
}

function p(text, size, color, mb) {
  return `<p style="font-family:Arial,sans-serif;font-size:${size || 14}px;color:${color || "#334155"};margin:0 0 ${mb || 16}px;line-height:1.7">${text}</p>`
}

// ── TEMPLATES ─────────────────────────────────────────────
const templates = {

  user_invitation: (d) => ({
    subject: "You've been invited to join FaciliFlow — Africa Prudential",
    html: wrap(hdr(B, "Welcome to FaciliFlow", "You have been invited to join the platform") + body(`
      ${p(`Hi <strong>${d.name || "there"}</strong>,`)}
      ${p("You have been invited to join <strong>Africa Prudential FaciliFlow</strong> — the facilities and IT change management platform.")}
      ${table(row("Name", d.name) + row("Email", d.email) + row("Role", (d.role||"").replace(/_/g," ")) + row("Department", d.dept) + row("Temp Password", d.temp_password ? `<code style="background:#F1F5F9;padding:2px 8px;border-radius:4px;color:${B};font-weight:700">${d.temp_password}</code>` : "Set on first login"))}
      ${cta(d.invite_url || "https://facilflowuser.vercel.app", "Access FaciliFlow →", B)}
      <p style="font-family:Arial,sans-serif;font-size:11px;color:${MUT};margin-top:20px">If you were not expecting this, please ignore this email.</p>
    `))
  }),

  request_approved: (d) => ({
    subject: `Your ${d.type || "facility"} request has been approved — FaciliFlow`,
    html: wrap(hdr(GRN, "Request Approved", `Your ${d.type || "facility"} request has been actioned`) + body(`
      ${p(`Hi <strong>${d.requester_name || "there"}</strong>,`)}
      ${p(`Your <strong>${d.type}</strong> request has been <strong style="color:${GRN}">approved</strong> by ${d.approver}.`)}
      ${table(
        row("Request ID", d.request_id) +
        row("Title", d.title) +
        row("Approved By", d.approver) +
        row("Approved On", d.approved_at) +
        (d.vehicle ? row("Assigned Vehicle", d.vehicle) : "") +
        (d.driver  ? row("Assigned Driver",  d.driver)  : "")
      )}
      ${d.note ? hl(`<strong>Note:</strong> "${d.note}"`, GRN, GBG) : ""}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Request →", GRN)}
    `))
  }),

  request_rejected: (d) => ({
    subject: `Your ${d.type || "facility"} request was not approved — FaciliFlow`,
    html: wrap(hdr(RED, "Request Not Approved", `Your ${d.type || "facility"} request requires attention`) + body(`
      ${p(`Hi <strong>${d.requester_name || "there"}</strong>,`)}
      ${p(`Your <strong>${d.type}</strong> request has not been approved at this time.`)}
      ${table(row("Request ID", d.request_id) + row("Title", d.title) + row("Reviewed By", d.approver))}
      ${d.reason ? hl(`<strong>Reason:</strong> "${d.reason}"`, RED, RBG) : ""}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Request →", RED)}
    `))
  }),

  request_delivered: (d) => ({
    subject: `Your ${d.type || "facility"} request has been delivered — FaciliFlow`,
    html: wrap(hdr(BLU, "Request Delivered", "Your request has been fulfilled") + body(`
      ${p(`Hi <strong>${d.requester_name || "there"}</strong>,`)}
      ${p(`Your <strong>${d.type}</strong> request has been <strong style="color:${BLU}">delivered</strong> and marked complete.`)}
      ${table(row("Request ID", d.request_id) + row("Title", d.title) + row("Delivered On", d.delivered_at) + row("Processed By", d.processed_by || "Facilities Team"))}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Request History →", BLU)}
    `))
  }),

  cr_submitted: (d) => ({
    subject: `Action Required: New Change Request ${d.cr_id} — ${d.title}`,
    html: wrap(hdr(B, "New Change Request", "Your approval is required") + body(`
      ${p(`Hi <strong>${d.approver_name || "there"}</strong>,`)}
      ${p("A new change request has been submitted and requires your review and approval.")}
      ${d.is_emergency ? hl("⚡ <strong>EMERGENCY CHANGE REQUEST</strong> — Immediate attention required.", RED, RBG) : ""}
      ${table(row("CR ID", d.cr_id) + row("Title", d.title) + row("Change Type", d.change_type) + row("Risk Level", d.risk_level) + row("System", d.system_name) + row("Environment", d.environment) + row("Raised By", d.raised_by) + row("Proposed Date", d.deploy_date))}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "Review & Approve →", B)}
    `))
  }),

  cr_approved: (d) => ({
    subject: `${d.cr_id} Approved at Stage ${d.stage} — FaciliFlow`,
    html: wrap(hdr(GRN, "Change Request Approved", `Stage ${d.stage} approval complete`) + body(`
      ${p(`Hi <strong>${d.initiator_name || "there"}</strong>,`)}
      ${p(`Your change request <strong>${d.cr_id}</strong> has been approved at <strong>Stage ${d.stage}</strong>.`)}
      ${table(row("CR ID", d.cr_id) + row("Title", d.title) + row("Approved By", d.approver) + row("Next Step", d.next_step))}
      ${d.comment ? hl(`<strong>Comment:</strong> "${d.comment}"`, GRN, GBG) : ""}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Change Request →", GRN)}
    `))
  }),

  cr_rejected: (d) => ({
    subject: `${d.cr_id} Has Been Rejected — FaciliFlow`,
    html: wrap(hdr(RED, "Change Request Rejected", "Your change request was not approved") + body(`
      ${p(`Hi <strong>${d.initiator_name || "there"}</strong>,`)}
      ${p(`Your change request <strong>${d.cr_id}: ${d.title}</strong> has been rejected.`)}
      ${table(row("CR ID", d.cr_id) + row("Title", d.title) + row("Rejected By", d.approver))}
      ${d.reason ? hl(`<strong>Reason:</strong> "${d.reason}"`, RED, RBG) : ""}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Change Request →", RED)}
    `))
  }),

  cr_scheduled: (d) => ({
    subject: `${d.cr_id} Scheduled for ${d.deploy_date} — FaciliFlow`,
    html: wrap(hdr(BLU, "Change Request Scheduled", "Approved and scheduled for deployment") + body(`
      ${p(`Hi <strong>${d.initiator_name || "there"}</strong>,`)}
      ${p(`Your change request <strong>${d.cr_id}: ${d.title}</strong> has been fully approved and scheduled.`)}
      <div style="background:${BBG};border:1px solid #BFDBFE;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${BLU};text-transform:uppercase;margin-bottom:8px">Scheduled Deployment</div>
        <div style="font-family:Arial,sans-serif;font-size:26px;font-weight:900;color:#1E3A8A">${d.deploy_date}</div>
        <div style="font-family:Arial,sans-serif;font-size:15px;color:${BLU};margin-top:6px;font-weight:600">${d.deploy_start} – ${d.deploy_end}</div>
        <div style="font-family:Arial,sans-serif;font-size:12px;color:${MUT};margin-top:4px">${d.environment}</div>
      </div>
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View on Calendar →", BLU)}
    `))
  }),


  // ── CR STAGE NOTIFICATION (level-based) ──────────────────
  cr_stage_notification: (d) => ({
    subject: `${d.cr_id} - ${d.title} - ${d.stage}`,
    html: wrap(hdr(B, "Change Request Update", d.stage) + body(`
      ${p(`You have received a Change Request notification requiring your attention.`)}
      ${table(
        row("Change Code", d.cr_id) +
        row("Title", d.title) +
        row("Current Stage", d.stage) +
        row("Action Required", d.action||"Please review and take action.")
      )}
      ${d.note ? hl(`<strong>Note:</strong> "${d.note}"`, AMB, ABG) : ""}
      <p style="font-family:Arial,sans-serif;font-size:13px;color:${MUT};margin:16px 0;line-height:1.6">
        If you are unable to access the link below, please contact your system administrator.
      </p>
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Change Request →", B)}
      ${d.participants&&d.participants.length>0?`<p style="font-family:Arial,sans-serif;font-size:11px;color:${MUT};margin-top:16px">This notification was also sent to: ${d.participants.join(", ")}</p>`:""}
    `))
  }),

  cr_reminder: (d) => ({
    subject: `Reminder: ${d.cr_id} is awaiting your approval — FaciliFlow`,
    html: wrap(hdr(AMB, "Approval Reminder", "A change request is waiting for your review") + body(`
      ${p(`Hi <strong>${d.approver_name || "there"}</strong>,`)}
      ${p("This is a reminder that the following change request is still awaiting your approval.")}
      ${hl(`⏳ Pending for <strong>${d.hours_pending || "some"} hours</strong>. Please review at your earliest convenience.`, AMB, ABG)}
      ${table(row("CR ID", d.cr_id) + row("Title", d.title) + row("Raised By", d.raised_by) + row("Submitted On", d.submitted_date))}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "Review & Approve Now →", AMB)}
    `))
  }),

  // ── HELPDESK / TICKET TEMPLATES ───────────────────────────

  // Sent to IT admins when a user raises a new ticket
  ticket_created: (d) => ({
    subject: `New Ticket ${d.ticket_id}: ${d.subject} — FaciliFlow`,
    html: wrap(hdr(B, "New Support Ticket", "A staff member has raised a ticket requiring attention") + body(`
      ${p(`A new <strong>${d.type || "support"}</strong> ticket has been submitted by <strong>${d.raised_by || "a staff member"}</strong>.`)}
      ${d.priority === "critical" || d.priority === "high"
        ? hl(`🚨 <strong>${(d.priority || "").toUpperCase()} PRIORITY</strong> — Please action this ticket promptly.`, RED, RBG)
        : ""}
      ${table(
        row("Ticket ID",  d.ticket_id) +
        row("Subject",    d.subject) +
        row("Type",       d.type) +
        row("Priority",   (d.priority || "medium").charAt(0).toUpperCase() + (d.priority || "medium").slice(1)) +
        row("Category",   d.category) +
        row("Department", d.department) +
        row("Raised By",  d.raised_by)
      )}
      ${d.description ? `<div style="margin-bottom:20px">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${MUT};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Description</div>
        <div style="background:#F8FAFC;border:1px solid ${BDR};border-radius:8px;padding:14px 16px;font-family:Arial,sans-serif;font-size:13px;color:${INK};line-height:1.7">${d.description}</div>
      </div>` : ""}
      ${cta(d.app_url || "https://facilflow-v2-admin.vercel.app", "View & Assign Ticket →", B)}
    `))
  }),

  // Sent to the submitter as a receipt confirming their ticket was received
  ticket_received: (d) => ({
    subject: `Ticket Received: ${d.ticket_id} — ${d.subject}`,
    html: wrap(hdr(GRN, "Ticket Received", "Your support request has been logged") + body(`
      ${p(`Hi there,`)}
      ${p(`Your <strong>${d.type || "support"}</strong> ticket has been successfully submitted and is now in our queue. Our IT support team will review it shortly.`)}
      <div style="background:${GBG};border:1px solid #6EE7B7;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${GRN};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Your Ticket Reference</div>
        <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:900;color:#065F46;letter-spacing:-0.5px">${d.ticket_id}</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:${GRN};margin-top:6px">${d.subject}</div>
      </div>
      ${table(
        row("Type",     d.type) +
        row("Priority", (d.priority || "medium").charAt(0).toUpperCase() + (d.priority || "medium").slice(1)) +
        row("Status",   "Open — Awaiting Assignment")
      )}
      ${hl("You will receive an email when your ticket is updated or when a support agent responds.", GRN, GBG)}
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "Track Your Ticket →", GRN)}
    `))
  }),

  // Sent to the ticket requester when admin changes the ticket status
  ticket_status_update: (d) => {
    const statusColors = {
      assigned:    { color: BLU, bg: BBG, label: "Assigned" },
      in_progress: { color: BLU, bg: BBG, label: "In Progress" },
      pending:     { color: AMB, bg: ABG, label: "Pending — Awaiting Info" },
      resolved:    { color: GRN, bg: GBG, label: "Resolved" },
      fulfilled:   { color: GRN, bg: GBG, label: "Fulfilled" },
      closed:      { color: MUT, bg: BG,  label: "Closed" },
      rejected:    { color: RED, bg: RBG, label: "Rejected" },
    }
    const s = statusColors[d.new_status] || { color: MUT, bg: BG, label: d.new_status || "Updated" }
    const isResolved = ["resolved","fulfilled","closed"].includes(d.new_status)
    return {
      subject: `Your ticket ${d.ticket_id} has been ${s.label} — FaciliFlow`,
      html: wrap(hdr(s.color, `Ticket ${s.label}`, `Update on your support ticket`) + body(`
        ${p(`Hi there,`)}
        ${p(`Your support ticket has been updated by <strong>${d.updated_by || "the support team"}</strong>.`)}
        <div style="background:${s.bg};border:1px solid ${s.color}40;border-radius:10px;padding:18px 20px;text-align:center;margin-bottom:20px">
          <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${s.color};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New Status</div>
          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:${s.color}">${s.label}</div>
        </div>
        ${table(row("Ticket ID", d.ticket_id) + row("Subject", d.subject) + row("Updated By", d.updated_by || "Support Team"))}
        ${isResolved
          ? hl("Your ticket has been resolved. If you feel the issue is not fully resolved, you can reopen it from the portal.", GRN, GBG)
          : hl("You will continue to receive updates as your ticket progresses. You can also add follow-up comments from the portal.", BLU, BBG)}
        ${cta(d.app_url || "https://facilflowuser.vercel.app", "View Your Ticket →", s.color)}
      `))
    }
  },

  // Sent to admins (when user comments) OR to user (when admin replies)
  ticket_comment: (d) => ({
    subject: `New reply on Ticket ${d.ticket_id}: ${d.subject}`,
    html: wrap(hdr(BLU, "New Ticket Reply", `${d.commenter || "Someone"} has responded to the ticket`) + body(`
      ${p(`<strong>${d.commenter || "A participant"}</strong> has added a reply to support ticket <strong>${d.ticket_id}</strong>.`)}
      ${table(row("Ticket ID", d.ticket_id) + row("Subject", d.subject) + row("From", d.commenter))}
      <div style="margin-bottom:20px">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${MUT};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Message</div>
        <div style="background:#F8FAFC;border-left:3px solid ${BLU};border-radius:0 8px 8px 0;padding:14px 16px;font-family:Arial,sans-serif;font-size:13px;color:${INK};line-height:1.7">${d.comment || ""}</div>
      </div>
      ${cta(d.app_url || "https://facilflowuser.vercel.app", "Reply to Ticket →", BLU)}
    `))
  }),
}

// ── HANDLER ───────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const { template, to, data } = await req.json()

    if (!template || !templates[template]) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}. Valid: ${Object.keys(templates).join(", ")}` }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      )
    }

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' field" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      )
    }

    const { subject, html } = templates[template](data || {})

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
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
      console.error("Resend error:", JSON.stringify(result))
      return new Response(
        JSON.stringify({ error: result }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    )

  } catch (err) {
    console.error("Function error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})