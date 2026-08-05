import { writeFileSync } from 'node:fs'
import { createDemoCampers } from '../src/data.js'

const rows = createDemoCampers(() => null).map(({ id, ...row }) => row)
const header = ['Nombre', 'Apellido', 'Edad', 'GENERO', 'Cabana', 'Fuerza', 'Velocidad', 'Inteligencia', 'Creatividad', 'Liderazgo']
const genderLabels = { female: 'F', male: 'M' }
const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

const lines = [
  header.map(escapeCsv).join(','),
  ...rows.map((row) => [
    row.name,
    row.lastName,
    row.age,
    genderLabels[row.gender] || '',
    row.cabin,
    row.strength,
    row.speed,
    row.wit,
    row.creativity,
    row.leadership,
  ].map(escapeCsv).join(',')),
]

writeFileSync('campistas_prueba_300.csv', lines.join('\r\n'), 'utf8')

console.log(JSON.stringify({
  total: rows.length,
  bosque: rows.filter(({ cabin }) => cabin.startsWith('B')).length,
  sabana: rows.filter(({ cabin }) => cabin.startsWith('S')).length,
  aventura: rows.filter(({ cabin }) => cabin.startsWith('AV')).length,
  cit: rows.filter(({ cabin }) => cabin.startsWith('CIT')).length,
  uniqueNames: new Set(rows.map((row) => `${row.name} ${row.lastName}`)).size,
}, null, 2))
