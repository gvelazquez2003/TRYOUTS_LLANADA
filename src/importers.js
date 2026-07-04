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
