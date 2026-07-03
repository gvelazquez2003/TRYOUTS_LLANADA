function cleanEnv(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '')
}

function projectRefFromKey(key) {
  try {
    const payload = JSON.parse(atob(key.split('.')[1]))
    return payload.ref || ''
  } catch {
    return ''
  }
}

function normalizeSupabaseUrl(value, key) {
  const cleanValue = cleanEnv(value)
  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) return cleanValue.replace(/\/$/, '')
  if (/^[a-z0-9-]+$/i.test(cleanValue)) return `https://${cleanValue}.supabase.co`
  const ref = projectRefFromKey(key)
  return ref ? `https://${ref}.supabase.co` : ''
}

const SUPABASE_KEY = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL, SUPABASE_KEY)
const SYNC_ROOM = import.meta.env.VITE_SYNC_ROOM || 'llanada-tryouts'
const SYNC_TABLE = import.meta.env.VITE_SUPABASE_SYNC_TABLE || 'tribe_app_state'
const DEVICE_KEY = 'formacion-tribus-device-id'

export const LOCAL_STORAGE_KEYS = {
  campers: 'tribu-camp-campers-v1',
  teams: 'formacion-tribus-teams-v1',
}

export function isRemoteSyncConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, deviceId)
  }
  return deviceId
}

export function readLocalSnapshot() {
  try {
    return {
      campers: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.campers)) || [],
      assignments: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.teams)) || null,
    }
  } catch {
    return { campers: [], assignments: null }
  }
}

export function saveLocalSnapshot({ campers, assignments }) {
  localStorage.setItem(LOCAL_STORAGE_KEYS.campers, JSON.stringify(campers))
  if (assignments) localStorage.setItem(LOCAL_STORAGE_KEYS.teams, JSON.stringify(assignments))
  else localStorage.removeItem(LOCAL_STORAGE_KEYS.teams)
}

function syncHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function syncUrl(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SYNC_TABLE}${query}`
}

async function responseError(response, action) {
  const details = await response.text()
  return new Error(`${action} falló (${response.status}). ${details.slice(0, 220)}`)
}

export async function readRemoteSnapshot() {
  if (!isRemoteSyncConfigured()) return null
  const response = await fetch(syncUrl(`?id=eq.${encodeURIComponent(SYNC_ROOM)}&select=*`), {
    headers: syncHeaders(),
  })
  if (!response.ok) throw await responseError(response, 'Lectura de Supabase')
  const rows = await response.json()
  const row = rows[0]
  if (!row) return null
  return {
    campers: Array.isArray(row.campers) ? row.campers : [],
    assignments: row.assignments || null,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function writeRemoteSnapshot({ campers, assignments }) {
  if (!isRemoteSyncConfigured()) return null
  const payload = [{
    id: SYNC_ROOM,
    campers,
    assignments,
    updated_at: new Date().toISOString(),
    updated_by: getDeviceId(),
  }]
  const response = await fetch(syncUrl('?on_conflict=id'), {
    method: 'POST',
    headers: syncHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw await responseError(response, 'Guardado en Supabase')
  const rows = await response.json()
  const row = rows[0]
  return row ? { updatedAt: row.updated_at, updatedBy: row.updated_by } : null
}
