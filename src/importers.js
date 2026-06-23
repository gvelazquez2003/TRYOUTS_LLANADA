const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

const aliases = {
  name: ['nombre', 'nombreyapellido', 'nombresyapellidos', 'campista', 'participante'],
  age: ['edad', 'anos'],
  strength: ['fuerza'],
  speed: ['velocidad'],
  wit: ['inteligencia', 'ingenio'],
  creativity: ['creatividad'],
  leadership: ['liderazgo'],
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
  const missing = Object.entries(columns).filter(([, index]) => index < 0).map(([key]) => key)
  if (missing.length) throw new Error('Faltan columnas. Usa: Nombre, Edad, Fuerza, Velocidad, Inteligencia, Creatividad y Liderazgo.')

  const campers = []
  const errors = []
  rows.slice(1).forEach((row, rowIndex) => {
    const name = (row[columns.name] || '').trim()
    if (!name) return
    const age = Number(row[columns.age])
    const scores = Object.fromEntries(['strength', 'speed', 'wit', 'creativity', 'leadership'].map((key) => [key, Number(row[columns[key]])]))
    if (!Number.isInteger(age) || age < 5 || age > 20 || Object.values(scores).some((score) => !Number.isInteger(score) || score < 1 || score > 5)) {
      errors.push(`Fila ${rowIndex + 2}: revisa la edad y las notas (deben ser enteros del 1 al 5).`)
      return
    }
    campers.push({ name, age, ...scores })
  })
  return { campers, errors }
}
