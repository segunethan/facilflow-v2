import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jdvzoimemzijqamphgyg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdnpvaW1lbXppanFhbXBoZ3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTI3NzEsImV4cCI6MjA4ODcyODc3MX0.MDl43rbq5EX9AO44tjpF8L2gIoy-oY0YxSKDvdH8O1o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── AUTH HELPERS ───────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

export const onAuthChange = (cb) => supabase.auth.onAuthStateChange(cb)

const APP_URL = import.meta.env.VITE_APP_URL || 'https://facilflowuser.vercel.app'

export const sendPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL })

export const updatePassword = (newPassword) =>
  supabase.auth.updateUser({ password: newPassword })

// ── DATA HELPERS ───────────────────────────────────────────

// Get logged-in user's profile from users table
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// Requests
export const fetchRequests = async (tenantId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createRequest = async (req) => {
  const { data, error } = await supabase
    .from('requests')
    .insert([req])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateRequest = async (id, updates) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Change Requests
export const fetchCRs = async (tenantId) => {
  const { data, error } = await supabase
    .from('change_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createCR = async (cr) => {
  const { data, error } = await supabase
    .from('change_requests')
    .insert([cr])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCR = async (id, updates) => {
  const { data, error } = await supabase
    .from('change_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Notifications
export const fetchNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const markNotificationsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
  if (error) throw error
}

export const createNotification = async (notif) => {
  const { error } = await supabase
    .from('notifications')
    .insert([notif])
  if (error) throw error
}

// Inventory
export const fetchInventory = async (tenantId) => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')
  if (error) throw error
  return data
}


// Vehicles (read-only for users - to show assigned vehicle details)
export const fetchVehicles = async (tenantId) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return data
}

// Drivers (read-only for users - to show assigned driver details)
export const fetchDrivers = async (tenantId) => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return data
}

// Realtime subscription helper
export const subscribeToTable = (table, tenantId, callback) => {
  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter: `tenant_id=eq.${tenantId}`
    }, callback)
    .subscribe()
}

// ── CHANGE MANAGEMENT ──────────────────────────────────────

export const fetchUserChangeRoles = async (userId) => {
  const { data, error } = await supabase
    .from('user_change_roles')
    .select('role_key')
    .eq('user_id', userId)
  if (error) return []
  return data.map(r => r.role_key)
}

export const fetchUsersWithChangeRole = async (roleKey, tenantId) => {
  const { data, error } = await supabase
    .from('user_change_roles')
    .select('user_id, users(id,name,email,initials,dept)')
    .eq('role_key', roleKey)
    .eq('tenant_id', tenantId)
  if (error) return []
  return data.map(r => r.users).filter(Boolean)
}

export const fetchApprovalLevels = async (tenantId) => {
  const { data, error } = await supabase
    .from('change_approval_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('level_order')
  if (error) return []
  return data
}

export const fetchTenantConfig = async (tenantId) => {
  const { data, error } = await supabase
    .from('change_tenant_config')
    .select('*, users(id,name,email,initials)')
    .eq('tenant_id', tenantId)
    .single()
  if (error) return null
  return data
}

export const updateCRStage = async (id, updates) => {
  const { data, error } = await supabase
    .from('change_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}
// ── HELPDESK TICKETS ─────────────────────────────────────
export const fetchMyTickets = async (userId, tenantId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createTicket = async (ticket) => {
  const { data, error } = await supabase
    .from('tickets')
    .insert([ticket])
    .select().single()
  if (error) throw error
  return data
}

export const updateTicket = async (id, updates) => {
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export const fetchTicketComments = async (ticketId) => {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at')
  if (error) throw error
  return data
}

export const addTicketComment = async (comment) => {
  const { data, error } = await supabase
    .from('ticket_comments')
    .insert([{ ...comment, created_at: new Date().toISOString() }])
    .select().single()
  if (error) throw error
  return data
}

export const fetchTicketCategories = async (tenantId) => {
  const { data, error } = await supabase
    .from('ticket_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('category')
  if (error) throw error
  return data
}

export const uploadTicketAttachment = async (ticketId, file) => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${ticketId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('ticket-attachments').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('ticket-attachments').getPublicUrl(path)
  return { name: file.name, size: file.size, url: publicUrl, path, type: file.type }
}
