import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Schedule this function in Supabase Dashboard → Edge Functions → Cron ──
// Cron expression: 0 11 * * *   (daily at 11:00 UTC = 12:00 PM WAT)

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL        = "facilflow@thesegunadebayo.com"
const FROM_NAME         = "FaciliFlow — Africa Prudential"
const APP_URL           = "https://facilflowadmin.vercel.app"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const B   = "#C8102E"
const INK = "#0F172A"
const MUT = "#64748B"
const BDR = "#E2E8F0"
const BG  = "#F7F8FA"
const AMB = "#D97706"
const ABG = "#FFFBEB"
const RED = "#DC2626"
const RBG = "#FEF2F2"
const GRN = "#059669"
const GBG = "#ECFDF5"
const BLU = "#2563EB"

const LOGO = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="12" fill="${B}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#fff">AP</text></svg>`

function wrap(inner: string) {
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
</td></tr></table></td></tr></table></body></html>`
}

function hdr(color: string, title: string, sub: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${color}">
<tr><td style="padding:28px 32px">
<table cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:16px;vertical-align:middle">${LOGO}</td>
<td style="vertical-align:middle">
<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">Africa Prudential Plc</div>
<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#fff">${title}</div>
<div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">${sub}</div>
</td></tr></table></td></tr></table>`
}

function body(content: string) {
  return `<div style="padding:28px 32px">${content}</div>`
}

function tblRow(label: string, value: string) {
  return `<tr>
<td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${MUT};text-transform:uppercase;letter-spacing:0.8px;width:140px;background:#F8FAFC;border-bottom:1px solid ${BDR}">${label}</td>
<td style="padding:10px 14px;font-family:Arial,sans-serif;font-size:13px;color:${INK};font-weight:500;border-bottom:1px solid ${BDR}">${value||"—"}</td></tr>`
}

function tbl(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BDR};border-radius:8px;overflow:hidden;margin-bottom:20px">${rows}</table>`
}

function cta(url: string, label: string, color: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="background:${color};border-radius:8px"><a href="${url}" style="display:inline-block;padding:12px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none">${label}</a></td></tr></table>`
}

function hl(text: string, color: string, bg: string) {
  return `<div style="background:${bg};border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:12px 16px;margin:16px 0;font-family:Arial,sans-serif;font-size:13px;color:${color};line-height:1.6">${text}</div>`
}

function p(text: string) {
  return `<p style="font-family:Arial,sans-serif;font-size:14px;color:#334155;margin:0 0 16px;line-height:1.7">${text}</p>`
}

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json()
    console.error("Resend error:", JSON.stringify(err))
  }
  return res.ok
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)

    // ── 1. VEHICLE DOCUMENT ALERTS ─────────────────────────────
    const { data: docs } = await db
      .from("vehicle_documents")
      .select("*, vehicles(plate, model, tenant_id)")

    // Get facility admin emails per tenant
    const { data: facilityAdmins } = await db
      .from("users")
      .select("email, tenant_id")
      .in("role", ["facility_admin", "admin"])
      .eq("status", "active")

    const adminsByTenant: Record<string, string[]> = {}
    for (const u of facilityAdmins || []) {
      if (!adminsByTenant[u.tenant_id]) adminsByTenant[u.tenant_id] = []
      if (u.email) adminsByTenant[u.tenant_id].push(u.email)
    }

    // Group expiring/expired docs by tenant
    const docAlerts: Record<string, any[]> = {}
    for (const doc of docs || []) {
      const expiry = new Date(doc.expiry_date)
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
      if (days > 7) continue  // not yet alerting
      const tenantId = doc.vehicles?.tenant_id
      if (!tenantId) continue
      if (!docAlerts[tenantId]) docAlerts[tenantId] = []
      docAlerts[tenantId].push({ ...doc, daysRemaining: days })
    }

    let docEmailsSent = 0
    for (const [tenantId, alerts] of Object.entries(docAlerts)) {
      const recipients = adminsByTenant[tenantId] || []
      if (!recipients.length) continue

      const rows = alerts.map(a =>
        tblRow(`${a.vehicles?.plate} — ${a.document_type}`,
          `${a.daysRemaining < 0 ? `<span style="color:${RED};font-weight:700">EXPIRED ${Math.abs(a.daysRemaining)} days ago</span>` : `<span style="color:${a.daysRemaining<=7?AMB:GRN};font-weight:700">${a.daysRemaining} day(s) remaining</span>`} · Expires: ${new Date(a.expiry_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`)
      ).join("")

      const hasExpired = alerts.some(a => a.daysRemaining < 0)
      const headerColor = hasExpired ? RED : AMB
      const subject = `Vehicle Compliance Alert — ${alerts.length} document(s) require attention`

      const html = wrap(
        hdr(headerColor, "Vehicle Compliance Alert", `${alerts.length} document(s) expiring or expired`) +
        body(`
          ${p("The following vehicle compliance documents require immediate attention:")}
          ${hl(hasExpired
            ? "⚠ One or more documents have already <strong>expired</strong>. Please renew immediately."
            : "⏰ One or more documents will expire <strong>within 7 days</strong>. Please arrange renewal.",
            hasExpired ? RED : AMB,
            hasExpired ? RBG : ABG)}
          ${tbl(rows)}
          ${p("Log in to the Admin Console to update documents and upload renewal certificates.")}
          ${cta(APP_URL, "Go to Fleet Management →", headerColor)}
        `)
      )

      await sendEmail(recipients, subject, html)
      docEmailsSent += recipients.length
    }

    // ── 2. IT SUBSCRIPTION ALERTS ──────────────────────────────
    const { data: subs } = await db
      .from("it_subscriptions")
      .select("*")
      .eq("status", "active")

    const { data: itAdmins } = await db
      .from("users")
      .select("email, tenant_id")
      .in("role", ["it_admin", "admin"])
      .eq("status", "active")

    const itAdminsByTenant: Record<string, string[]> = {}
    for (const u of itAdmins || []) {
      if (!itAdminsByTenant[u.tenant_id]) itAdminsByTenant[u.tenant_id] = []
      if (u.email) itAdminsByTenant[u.tenant_id].push(u.email)
    }

    const subAlerts: Record<string, any[]> = {}
    for (const sub of subs || []) {
      const renewal = new Date(sub.renewal_date)
      const days = Math.ceil((renewal.getTime() - today.getTime()) / 86400000)
      if (days > 7 || days < 0) continue  // only 0–7 days window
      if (!subAlerts[sub.tenant_id]) subAlerts[sub.tenant_id] = []
      subAlerts[sub.tenant_id].push({ ...sub, daysRemaining: days })
    }

    let subEmailsSent = 0
    for (const [tenantId, alerts] of Object.entries(subAlerts)) {
      const recipients = itAdminsByTenant[tenantId] || []
      if (!recipients.length) continue

      for (const sub of alerts) {
        const isToday = sub.daysRemaining === 0
        const subject = isToday
          ? `Subscription Renewal Due Today — ${sub.name}`
          : `Subscription Alert — ${sub.name} renews in ${sub.daysRemaining} day(s)`

        const html = wrap(
          hdr(isToday ? RED : AMB, "Subscription Renewal Alert", isToday ? "Renewal due today" : `Renews in ${sub.daysRemaining} day(s)`) +
          body(`
            ${p(`Your <strong>${sub.name}</strong> subscription is ${isToday ? "<strong style='color:${RED}'>due for renewal today</strong>" : `renewing in <strong>${sub.daysRemaining} day(s)</strong>`}.`)}
            ${tbl(
              tblRow("Subscription", sub.name) +
              tblRow("Vendor", sub.vendor || "—") +
              tblRow("Category", sub.category || "—") +
              tblRow("Renewal Date", new Date(sub.renewal_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})) +
              tblRow("Cost", sub.cost ? `₦${Number(sub.cost).toLocaleString()}` : "—") +
              tblRow("Billing Cycle", sub.billing_cycle || "—") +
              tblRow("Assigned Owner", sub.assigned_owner || "—")
            )}
            ${isToday
              ? hl("⚠ This subscription is due for renewal <strong>today</strong>. Please process payment to avoid service interruption.", RED, RBG)
              : hl(`⏰ Renewal in <strong>${sub.daysRemaining} day(s)</strong>. Ensure payment is arranged before the renewal date.`, AMB, ABG)}
            ${cta(APP_URL, "View IT Subscriptions →", isToday ? RED : AMB)}
          `)
        )

        await sendEmail(recipients, subject, html)
        subEmailsSent += recipients.length
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        doc_alerts: Object.values(docAlerts).flat().length,
        doc_emails_sent: docEmailsSent,
        sub_alerts: Object.values(subAlerts).flat().length,
        sub_emails_sent: subEmailsSent,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    console.error("compliance-alerts error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    )
  }
})
