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
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`Request ${id} could not be updated. Check that the record exists and you have permission to edit it.`)
  return data
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
  const { error } = await supabase.storage.from('cr-attachments').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('cr-attachments').getPublicUrl(path)
  return { path, publicUrl, name: file.name, size: file.size }
}

// ── CHANGE MANAGEMENT ──────────────────────────────────────

export const fetchChangeRoles = async () => {
  const { data, error } = await supabase.from('change_roles').select('*').order('key')
  if (error) throw error
  return data
}

export const fetchUserChangeRoles = async (tenantId) => {
  const { data, error } = await supabase
    .from('user_change_roles')
    .select('*, users(id,name,email,initials)')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return data
}

export const assignChangeRole = async (userId, roleKey, tenantId) => {
  const { data, error } = await supabase
    .from('user_change_roles')
    .insert([{ user_id: userId, role_key: roleKey, tenant_id: tenantId }])
    .select().single()
  if (error) throw error
  return data
}

export const removeChangeRole = async (userId, roleKey) => {
  const { error } = await supabase
    .from('user_change_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_key', roleKey)
  if (error) throw error
}

export const fetchApprovalLevels = async (tenantId) => {
  const { data, error } = await supabase
    .from('change_approval_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('level_order')
  if (error) throw error
  return data
}

export const saveApprovalLevel = async (level) => {
  const { data, error } = await supabase
    .from('change_approval_levels')
    .upsert([level])
    .select().single()
  if (error) throw error
  return data
}

export const deleteApprovalLevel = async (id) => {
  const { error } = await supabase.from('change_approval_levels').delete().eq('id', id)
  if (error) throw error
}

export const fetchTenantConfig = async (tenantId) => {
  const { data, error } = await supabase
    .from('change_tenant_config')
    .select('*, users(id,name,email,initials)')
    .eq('tenant_id', tenantId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const saveTenantConfig = async (tenantId, updates) => {
  const { data, error } = await supabase
    .from('change_tenant_config')
    .upsert([{ tenant_id: tenantId, ...updates, updated_at: new Date().toISOString() }])
    .select().single()
  if (error) throw error
  return data
}

// ── VEHICLE DOCUMENTS ─────────────────────────────────────
export const fetchVehicleDocs = async (tenantId) => {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return data
}

export const upsertVehicleDoc = async (doc) => {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .upsert({ ...doc, last_updated: new Date().toISOString() }, { onConflict: 'vehicle_id,document_type' })
    .select().single()
  if (error) throw error
  return data
}

export const uploadVehicleDoc = async (vehicleId, file) => {
  const path = `${vehicleId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('vehicle-docs').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('vehicle-docs').getPublicUrl(path)
  return { path, publicUrl, name: file.name, size: file.size }
}

// ── IT SUBSCRIPTIONS ──────────────────────────────────────
export const fetchSubscriptions = async (tenantId) => {
  const { data, error } = await supabase
    .from('it_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('renewal_date')
  if (error) throw error
  return data
}

export const createSubscription = async (sub) => {
  const { data, error } = await supabase.from('it_subscriptions').insert([sub]).select().single()
  if (error) throw error
  return data
}

export const updateSubscription = async (id, updates) => {
  const { data, error } = await supabase
    .from('it_subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export const uploadSubInvoice = async (subId, file) => {
  const path = `${subId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('sub-invoices').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('sub-invoices').getPublicUrl(path)
  return { path, publicUrl, name: file.name, size: file.size }
}