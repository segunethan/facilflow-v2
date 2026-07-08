import { supabase } from './supabase.js'

// ── sendEmail ──────────────────────────────────────────────
// Calls the Supabase Edge Function which sends via Resend
// template: one of the keys in the edge function templates object
// to: email string or array of emails
// data: template variables object

export const sendEmail = async (template, to, data) => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: { template, to, data }
    })
    if (error) throw error
    return result
  } catch (err) {
    console.error('Email error:', err)
    // Don't throw — email failure should never block the UI action
  }
}

// ── SHORTHAND HELPERS ──────────────────────────────────────

const APP_URL = window.location.origin

export const emailCRSubmitted = (toEmails, cr, raisedBy) =>
  sendEmail('cr_submitted', toEmails, {
    cr_id: cr.id,
    title: cr.title,
    change_type: cr.changeType || cr.change_type,
    risk_level: cr.riskLevel || cr.risk_level,
    raised_by: raisedBy,
    deploy_date: cr.deployDate || cr.deploy_date,
    app_url: APP_URL,
  })

export const emailCRApproved = (toEmails, cr, approver, stage, comment, nextStep) =>
  sendEmail('cr_approved', toEmails, {
    cr_id: cr.id,
    title: cr.title,
    approver,
    stage,
    comment,
    next_step: nextStep,
    app_url: APP_URL,
  })

export const emailCRRejected = (toEmails, cr, approver, reason) =>
  sendEmail('cr_rejected', toEmails, {
    cr_id: cr.id,
    title: cr.title,
    approver,
    reason,
    app_url: APP_URL,
  })

export const emailCRScheduled = (toEmails, cr) =>
  sendEmail('cr_scheduled', toEmails, {
    cr_id: cr.id,
    title: cr.title,
    deploy_date: cr.deployDate || cr.deploy_date,
    deploy_start: cr.deployStart || cr.deploy_start,
    deploy_end: cr.deployEnd || cr.deploy_end,
    environment: cr.environment,
    app_url: APP_URL,
  })

export const emailCRReminder = (toEmails, cr, raisedBy, submittedDate) =>
  sendEmail('cr_reminder', toEmails, {
    cr_id: cr.id,
    title: cr.title,
    raised_by: raisedBy,
    submitted_date: submittedDate,
    app_url: APP_URL,
  })

export const emailUserInvitation = (toEmail, role, inviteUrl) =>
  sendEmail('user_invitation', toEmail, {
    role,
    invite_url: inviteUrl,
  })

export const emailRequestApproved = (toEmail, req, type, approver) =>
  sendEmail('request_approved', toEmail, {
    title: req.title,
    type,
    approver,
    app_url: APP_URL,
  })

export const emailTicketCreated = (toEmails, ticket, raisedBy) =>
  sendEmail('ticket_created', toEmails, {
    ticket_id: ticket.id,
    subject: ticket.subject,
    type: ticket.type === 'incident' ? 'Incident' : 'Service Request',
    priority: ticket.priority || 'medium',
    category: [ticket.category, ticket.subcategory, ticket.item].filter(Boolean).join(' › ') || '—',
    department: ticket.department || '—',
    description: (ticket.description || '').slice(0, 400),
    raised_by: raisedBy,
    app_url: APP_URL,
  })

export const emailTicketComment = (toEmails, ticket, commenterName, commentBody) =>
  sendEmail('ticket_comment', toEmails, {
    ticket_id: ticket.id,
    subject: ticket.subject,
    commenter: commenterName,
    comment: commentBody.slice(0, 600),
    app_url: APP_URL,
  })

export const emailTicketReceived = (toEmail, ticket) =>
  sendEmail('ticket_received', toEmail, {
    ticket_id: ticket.id,
    subject: ticket.subject,
    type: ticket.type === 'incident' ? 'Incident' : 'Service Request',
    priority: ticket.priority || 'medium',
    app_url: APP_URL,
  })

export const emailTicketStatusUpdate = (toEmail, ticket, newStatus, updatedBy) =>
  sendEmail('ticket_status_update', toEmail, {
    ticket_id: ticket.id,
    subject: ticket.subject,
    new_status: newStatus,
    updated_by: updatedBy,
    app_url: APP_URL,
  })
