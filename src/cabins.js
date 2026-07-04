export const CABIN_OPTIONS = [
  ...Array.from({ length: 12 }, (_, index) => `B${index + 1}`),
  ...Array.from({ length: 16 }, (_, index) => `S${index + 1}`),
  'CIT 1',
  'CIT 2',
  'AV 1',
  'AV 2',
]

const normalizedCabins = new Map(CABIN_OPTIONS.map((cabin) => [cabin.replace(/\s+/g, ''), cabin]))

export function normalizeCabin(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  const compact = raw.replace(/\s+/g, '')
  const bunkMatch = compact.match(/^([BS])0?(\d+)$/)
  if (bunkMatch) return normalizedCabins.get(`${bunkMatch[1]}${Number(bunkMatch[2])}`) || raw
  const staffMatch = compact.match(/^(CIT|AV)0?([12])$/)
  if (staffMatch) return normalizedCabins.get(`${staffMatch[1]}${staffMatch[2]}`) || raw
  return normalizedCabins.get(compact) || raw
}

export function isValidCabin(value) {
  const cabin = normalizeCabin(value)
  return !cabin || CABIN_OPTIONS.includes(cabin)
}
