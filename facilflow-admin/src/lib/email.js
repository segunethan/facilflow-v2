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
