import { isValidCabin, normalizeCabin } from './cabins.js'

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

const aliases = {
  name: ['nombre', 'nombres', 'nombreyapellido', 'nombresyapellidos', 'campista', 'participante'],
  lastName: ['apellido', 'apellidos'],
  age: ['edad', 'anos'],
  cabin: ['cabana', 'cabaa', 'cabanaid', 'cabin', 'cabanas', 'cabinas'],
  strength: ['fuerza'],
  speed: ['velocidad'],
  wit: ['inteligencia', 'ingenio'],
  creativity: ['creatividad'],
  leadership: ['liderazgo'],
}

const scoreKeys = ['strength', 'speed', 'wit', 'creativity', 'leadership']
const scoreAliases = { o: 0, O: 0, l: 1, I: 1, '|': 1, S: 5, s: 5 }

const cleanOcrLine = (line) => String(line || '')
  .replace(/[|_[\]{}]/g, ' ')
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeOcrDigit = (value) => {
  const cleaned = String(value || '').replace(/[oOlI|Ss]/g, (match) => scoreAliases[match])
  const number = Number(cleaned.replace(/\D/g, ''))
  return Number.isInteger(number) ? number : NaN
}

const normalizeOcrCabin = (value) => {
  const compact = String(value || '').toUpperCase().replace(/\s+/g, '').replace(/[|]/g, '1')
  const number = compact.match(/\d{1,2}/)?.[0] || ''
  if (/^[B8]/.test(compact)) return normalizeCabin(`B${number}`)
  if (/^[S5]/.test(compact)) return normalizeCabin(`S${number}`)
  if (/^C/.test(compact)) return normalizeCabin(`CIT${number}`)
  if (/^A?V/.test(compact)) return normalizeCabin(`AV${number}`)
  return normalizeCabin(compact)
}

const titleCaseName = (value) => String(value || '').toLowerCase().replace(/(^|\s|-)([a-záéíóúüñ])/g, (match) => match.toUpperCase())

function splitFullName(value) {
  const words = String(value || '')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (words.length < 2) return null
  return {
    name: titleCaseName(words.slice(0, -1).join(' ')),
    lastName: titleCaseName(words.at(-1)),
  }
}

function parseTryoutsOcrLine(line) {
  const withoutRowNumber = cleanOcrLine(line).replace(/^\s*(?:No\.?\s*)?\d{1,2}\s*[).:-]?\s+/i, '')
  const cabinPattern = '(?:[B8S5]\\s*\\d{1,2}|C\\s*[I1L]?\\s*T?\\s*\\d{1,2}|A\\s*V\\s*\\d{1,2})'
  const scorePattern = '[0-5oOlI|Ss]'
  const rowPattern = new RegExp(`^(.+?)\\s+(1[0-9oOsS]|[5-9]|20)\\s+(${cabinPattern})\\s+(${scorePattern})\\s+(${scorePattern})\\s+(${scorePattern})\\s+(${scorePattern})\\s+(${scorePattern})\\s*$`, 'i')
  const match = withoutRowNumber.match(rowPattern)
  if (!match) return null

  const [, fullName, ageText, cabinText, strength, speed, wit, creativity, leadership] = match
  const identity = splitFullName(fullName)
  if (!identity) return null

  const cabin = normalizeOcrCabin(cabinText)
  const scores = [strength, speed, wit, creativity, leadership].map(normalizeOcrDigit)
  return {
    ...identity,
    age: normalizeOcrDigit(ageText),
    cabin,
    strength: scores[0],
    speed: scores[1],
    wit: scores[2],
    creativity: scores[3],
    leadership: scores[4],
  }
}

function parseRows(text, delimiter) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1 }
    else if (character === '"') quoted = !quoted
    else if (character === delimiter && !quoted) { row.push(field.trim()); field = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field.trim()); field = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else field += character
  }
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function parseCampersFile(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = [';', '\t', ','].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0]
  const rows = parseRows(text.replace(/^\uFEFF/, ''), delimiter)
  if (rows.length < 2) throw new Error('El archivo no contiene filas de campistas.')

  const headers = rows[0].map(normalize)
  const columns = Object.fromEntries(Object.entries(aliases).map(([key, options]) => [key, headers.findIndex((header) => options.includes(header))]))
  const requiredColumns = ['name', 'lastName', 'age']
  const missing = requiredColumns.filter((key) => columns[key] < 0)
  if (missing.length) throw new Error('Faltan columnas. Usa al menos: Nombre, Apellido y Edad.')

  const availableScoreColumns = scoreKeys.filter((key) => columns[key] >= 0)
  if (availableScoreColumns.length > 0 && availableScoreColumns.length < scoreKeys.length) {
    throw new Error('Si vas a cargar aptitudes, incluye todas: Fuerza, Velocidad, Inteligencia, Creatividad y Liderazgo.')
  }

  const hasScores = availableScoreColumns.length === scoreKeys.length
  const hasCabin = columns.cabin >= 0
  const campers = []
  const errors = []

  rows.slice(1).forEach((row, rowIndex) => {
    const name = (row[columns.name] || '').trim()
    if (!name) return

    const lastName = (row[columns.lastName] || '').trim()
    const cabin = hasCabin ? normalizeCabin(row[columns.cabin]) : ''
    const age = Number(row[columns.age])
    const scores = hasScores
      ? Object.fromEntries(scoreKeys.map((key) => [key, Number(row[columns[key]])]))
      : Object.fromEntries(scoreKeys.map((key) => [key, 0]))

    const hasInvalidScore = hasScores && Object.values(scores).some((score) => !Number.isInteger(score) || score < 0 || score > 5)
    if (lastName.length < 2 || !Number.isInteger(age) || age < 5 || age > 20 || hasInvalidScore || (hasCabin && !isValidCabin(cabin))) {
      errors.push(`Fila ${rowIndex + 2}: revisa apellido, edad, cabaña${hasScores ? ' y notas (las notas deben ser enteros del 0 al 5)' : ''}.`)
      return
    }

    campers.push({ name, lastName, age, cabin, ...scores })
  })

  return { campers, errors, hasCabin, hasScores }
}

export function parseTryoutsOcrText(text) {
  const lines = String(text || '').split(/\r?\n/).map(cleanOcrLine).filter(Boolean)
  const campers = []
  const errors = []
  const candidateLines = lines.filter((line) => /^\s*(?:No\.?\s*)?\d{1,2}\s*[).:-]?\s+/i.test(line) || /\b(?:B|S|CIT|AV)\s*\d{1,2}\b/i.test(line))

  candidateLines.forEach((line) => {
    const camper = parseTryoutsOcrLine(line)
    if (!camper) {
      if (/^\s*(?:No\.?\s*)?\d{1,2}\s*[).:-]?\s+/i.test(line)) errors.push(`No se pudo leer completa esta fila: "${line}"`)
      return
    }

    const hasInvalidScore = scoreKeys.some((key) => !Number.isInteger(camper[key]) || camper[key] < 0 || camper[key] > 5)
    if (!Number.isInteger(camper.age) || camper.age < 5 || camper.age > 20 || !isValidCabin(camper.cabin) || hasInvalidScore) {
      errors.push(`Fila dudosa: ${camper.name} ${camper.lastName}. Revisa edad, cabaña y notas.`)
      return
    }

    campers.push(camper)
  })

  if (!campers.length) {
    errors.push('No se detectaron filas válidas. Intenta con una foto más recta, con más luz, o escaneada desde arriba.')
  }

  return { campers, errors, hasCabin: true, hasScores: true, ocrLines: lines.length }
}
