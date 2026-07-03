const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
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

export async function readRemoteSnapshot() {
  if (!isRemoteSyncConfigured()) return null
  const response = await fetch(syncUrl(`?id=eq.${encodeURIComponent(SYNC_ROOM)}&select=*`), {
    headers: syncHeaders(),
  })
  if (!response.ok) throw new Error(`No se pudo leer la sincronización (${response.status}).`)
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
  if (!response.ok) throw new Error(`No se pudo guardar la sincronización (${response.status}).`)
  const rows = await response.json()
  const row = rows[0]
  return row ? { updatedAt: row.updated_at, updatedBy: row.updated_by } : null
}
