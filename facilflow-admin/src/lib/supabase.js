import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jdvzoimemzijqamphgyg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdnpvaW1lbXppanFhbXBoZ3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTI3NzEsImV4cCI6MjA4ODcyODc3MX0.MDl43rbq5EX9AO44tjpF8L2gIoy-oY0YxSKDvdH8O1o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── AUTH ───────────────────────────────────────────────────
export const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
export const getSession = () => supabase.auth.getSession()
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange(cb)

export const getProfile = async (userId) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// ── USERS ──────────────────────────────────────────────────
export const fetchUsers = async (tenantId) => {
  const { data, error } = await supabase.from('users').select('*').eq('tenant_id', tenantId).order('created_at')
  if (error) throw error
  return data
}

export const updateUser = async (id, updates) => {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteUser = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

// ── VEHICLES ───────────────────────────────────────────────
export const fetchVehicles = async (tenantId) => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('tenant_id', tenantId).order('plate')
  if (error) throw error
  return data
}

export const createVehicle = async (v) => {
  const { data, error } = await supabase.from('vehicles').insert([v]).select().single()
  if (error) throw error
  return data
}

export const updateVehicle = async (id, updates) => {
  const { data, error } = await supabase.from('vehicles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── DRIVERS ────────────────────────────────────────────────
export const fetchDrivers = async (tenantId) => {
  const { data, error } = await supabase.from('drivers').select('*').eq('tenant_id', tenantId).order('name')
  if (error) throw error
  return data
}

export const createDriver = async (d) => {
  const { data, error } = await supabase.from('drivers').insert([d]).select().single()
  if (error) throw error
  return data
}

export const updateDriver = async (id, updates) => {
  const { data, error } = await supabase.from('drivers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── INVENTORY ──────────────────────────────────────────────
export const fetchInventory = async (tenantId) => {
  const { data, error } = await supabase.from('inventory').select('*').eq('tenant_id', tenantId).order('name')
  if (error) throw error
  return data
}

export const createInventoryItem = async (item) => {
  const { data, error } = await supabase.from('inventory').insert([item]).select().single()
  if (error) throw error
  return data
}

export const updateInventoryItem = async (id, updates) => {
  const { data, error } = await supabase.from('inventory').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── FACILITY REQUESTS ──────────────────────────────────────
export const fetchRequests = async (tenantId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
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

// ── CHANGE REQUESTS ────────────────────────────────────────
export const fetchCRs = async (tenantId) => {
  const { data, error } = await supabase.from('change_requests').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const updateCR = async (id, updates) => {
  const { data, error } = await supabase.from('change_requests').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── AUDIT LOG ──────────────────────────────────────────────
export const fetchAuditLog = async (tenantId) => {
  const { data, error } = await supabase.from('audit_log').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200)
  if (error) throw error
  return data
}

export const addAuditEntry = async (entry) => {
  const { error } = await supabase.from('audit_log').insert([entry])
  if (error) throw error
}

// ── FILE STORAGE ───────────────────────────────────────────
export const uploadAttachment = async (crId, file) => {
  const path = `${crId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage.from('cr-attachments').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('cr-attachments').getPublicUrl(path)
  return { path, publicUrl, name: file.name, size: file.size }
}

export const getAttachmentUrl = (path) => {
  const { data: { publicUrl } } = supabase.storage.from('cr-attachments').getPublicUrl(path)
  return publicUrl
}