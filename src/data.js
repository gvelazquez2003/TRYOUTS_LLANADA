export const SKILLS = [
  { key: 'strength', label: 'Fuerza', icon: 'F' },
  { key: 'speed', label: 'Velocidad', icon: 'V' },
  { key: 'wit', label: 'Inteligencia', icon: 'I' },
  { key: 'creativity', label: 'Creatividad', icon: 'C' },
  { key: 'leadership', label: 'Liderazgo', icon: 'L' },
]

export const GENDER_OPTIONS = [
  { value: 'male', label: 'M' },
  { value: 'female', label: 'F' },
]

export function normalizeGender(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
  if (['h', 'm', 'masculino', 'hombre', 'hombres', 'nino', 'niño', 'varon', 'varones'].includes(normalized)) return 'male'
  if (['f', 'femenino', 'mujer', 'mujeres', 'nina', 'niña'].includes(normalized)) return 'female'
  return ''
}

export function genderLabel(value) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label || '-'
}

// Pesos de balance definidos para el contexto del campamento.
// Edad + Velocidad = 40%, Liderazgo = 20%, Fuerza = 20%,
// Creatividad = 10%, Inteligencia = 10%.
export const BALANCE_DIMENSIONS = [
  { key: 'age', label: 'Edad', weight: 20 },
  { key: 'speed', label: 'Velocidad', weight: 20 },
  { key: 'leadership', label: 'Liderazgo', weight: 20 },
  { key: 'strength', label: 'Fuerza', weight: 20 },
  { key: 'creativity', label: 'Creatividad', weight: 10 },
  { key: 'wit', label: 'Inteligencia', weight: 10 },
]

export const TRIBES = [
  ['Alemania', 'de', '#2d3648', 'impares'], ['Francia', 'fr', '#3155a4', 'impares'],
  ['Holanda', 'nl', '#e56b35', 'impares'], ['Portugal', 'pt', '#167a53', 'pares'],
  ['Colombia', 'co', '#d4a91c', 'pares'], ['Mexico', 'mx', '#1f875d', 'pares'],
  ['Noruega', 'no', '#c33b4e', 'pares'], ['Belgica', 'be', '#d9a827', 'pares'],
  ['Argentina', 'ar', '#53a7c7', 'impares'], ['Brasil', 'br', '#30934b', 'impares'],
  ['Japon', 'jp', '#d64b5c', 'impares'], ['Inglaterra', 'gb-eng', '#a83f47', 'pares'],
  ['Estados Unidos', 'us', '#3c5a96', 'impares'], ['Espana', 'es', '#c9473b', 'pares'],
  ['Canada', 'ca', '#d44848', 'impares'], ['Uruguay', 'uy', '#428ebd', 'pares'],
].map(([name, flagCode, color, side]) => ({ name, flagCode, flagUrl: `https://flagcdn.com/w80/${flagCode}.png`, color, side }))

const FEMALE_BASE_NAMES = [
  'Sofia', 'Valentina', 'Isabella', 'Camila', 'Mariana', 'Luciana', 'Antonella', 'Victoria', 'Sara', 'Renata',
  'Julieta', 'Amanda', 'Elena', 'Paula', 'Clara', 'Gabriela', 'Daniela', 'Andrea', 'Martina', 'Emilia',
  'Catalina', 'Josefina', 'Carolina', 'Natalia', 'Manuela', 'Alejandra', 'Lucia', 'Emma', 'Abril', 'Bianca',
  'Alana', 'Ariana', 'Micaela', 'Regina', 'Salome', 'Isadora', 'Maia', 'Celeste', 'Allison', 'Miranda',
  'Fiorella', 'Violeta', 'Rebeca', 'Adriana', 'Barbara', 'Cecilia', 'Diana', 'Estefania', 'Fabiana', 'Jimena',
  'Laura', 'Lorena', 'Maite', 'Noelia', 'Patricia', 'Rafaela', 'Teresa', 'Veronica', 'Ximena', 'Zoe',
]

const MALE_BASE_NAMES = [
  'Mateo', 'Santiago', 'Sebastian', 'Nicolas', 'Samuel', 'Daniel', 'Gabriel', 'Thiago', 'Lucas', 'Martin',
  'Emiliano', 'Joaquin', 'Benjamin', 'Tomas', 'Diego', 'Alejandro', 'Leonardo', 'Andres', 'Miguel', 'David',
  'Adrian', 'Bruno', 'Carlos', 'Cristobal', 'Eduardo', 'Felipe', 'Gael', 'Hector', 'Ignacio', 'Javier',
  'Kevin', 'Lorenzo', 'Manuel', 'Pablo', 'Rafael', 'Rodrigo', 'Simon', 'Valentino', 'Yago', 'Agustin',
  'Alonso', 'Bautista', 'Camilo', 'Dario', 'Elias', 'Fernando', 'Guillermo', 'Ian', 'Ivan', 'Jeremias',
  'Julian', 'Leon', 'Matias', 'Maximiliano', 'Oscar', 'Patricio', 'Ricardo', 'Salvador', 'Vicente', 'Xavier',
]

const SECOND_NAMES = [
  'Adriana', 'Alessandra', 'Amelia', 'Anabella', 'Aurora', 'Beatriz', 'Carla', 'Constanza', 'Cristina', 'Delfina',
  'Fernanda', 'Francisca', 'Ines', 'Ivanna', 'Jose', 'Lara', 'Luisa', 'Mercedes', 'Milagros', 'Pilar',
  'Alberto', 'Antonio', 'Arturo', 'Emilio', 'Enrique', 'Esteban', 'Francisco', 'Gerardo', 'Hugo', 'Jose',
  'Luis', 'Marco', 'Mauricio', 'Ramiro', 'Sergio', 'Teo', 'Alfredo', 'Cesar', 'Ruben', 'Saul',
]

const LAST_NAMES = [
  'Herrera', 'Romero', 'Gonzalez', 'Ortega', 'Ruiz', 'Ortiz', 'Moreno', 'Contreras', 'Soto', 'Vargas',
  'Mendoza', 'Rojas', 'Castillo', 'Pereira', 'Navarro', 'Acosta', 'Campos', 'Reyes', 'Fuentes', 'Cabrera',
  'Arias', 'Marquez', 'Leon', 'Cruz', 'Mora', 'Diaz', 'Vega', 'Castro', 'Perez', 'Gomez',
  'Nunez', 'Silva', 'Molina', 'Salas', 'Ibarra', 'Gil', 'Torres', 'Flores', 'Pineda', 'Escobar',
  'Parra', 'Rangel', 'Villalobos', 'Quintero', 'Montes', 'Valera', 'Cardenas', 'Ferrer', 'Urbina', 'Baptista',
  'Aguilar', 'Aguirre', 'Alvarado', 'Andrade', 'Bello', 'Benitez', 'Blanco', 'Bravo', 'Calderon', 'Camacho',
  'Carrillo', 'Chacin', 'Correa', 'Delgado', 'Espinoza', 'Figueroa', 'Galindo', 'Guerra', 'Lara', 'Linares',
  'Lopez', 'Machado', 'Medina', 'Mejia', 'Montilla', 'Ochoa', 'Olivares', 'Palacios', 'Peinado', 'Ponce',
  'Prieto', 'Pulido', 'Ramirez', 'Rendon', 'Rivas', 'Rosales', 'Saavedra', 'Sanchez', 'Suarez', 'Tovar',
]

const PROGRAM_DISTRIBUTION = [
  { total: 100, cabins: Array.from({ length: 12 }, (_, index) => `B${index + 1}`), ages: [7, 8, 9, 10] },
  { total: 110, cabins: Array.from({ length: 16 }, (_, index) => `S${index + 1}`), ages: [11, 12, 13] },
  { total: 50, cabins: Array.from({ length: 6 }, (_, index) => `AV ${index + 1}`), ages: [13, 14, 15] },
  { total: 40, cabins: Array.from({ length: 6 }, (_, index) => `CIT ${index + 1}`), ages: [15, 16, 17] },
]

function clampScore(value) {
  return Math.max(0, Math.min(5, value))
}

function givenName(gender, index) {
  const names = gender === 'female' ? FEMALE_BASE_NAMES : MALE_BASE_NAMES
  if (index < names.length) return names[index]
  const second = SECOND_NAMES[(index * 7 + (gender === 'female' ? 3 : 11)) % SECOND_NAMES.length]
  return `${names[index % names.length]} ${second}`
}

function skillScore(globalIndex, age, skillIndex, programIndex) {
  const base = 2 + ((globalIndex * 17 + age * 5 + skillIndex * 11) % 4)
  const programBoost = [
    [0, 1, 0, 1, 0],
    [0, 0, 1, 1, 1],
    [1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1],
  ][programIndex][skillIndex]
  const correction = (globalIndex + skillIndex) % 13 === 0 ? -2 : (globalIndex + age + skillIndex) % 17 === 0 ? 1 : 0
  return clampScore(base + programBoost + correction)
}

export function createDemoCampers(createId = () => crypto.randomUUID()) {
  const genderCounters = { female: 0, male: 0 }
  const rows = []
  PROGRAM_DISTRIBUTION.forEach((program, programIndex) => {
    for (let index = 0; index < program.total; index += 1) {
      const globalIndex = rows.length
      const gender = (globalIndex + programIndex + Math.floor(index / 5)) % 2 === 0 ? 'female' : 'male'
      const name = givenName(gender, genderCounters[gender])
      genderCounters[gender] += 1
      const lastName = LAST_NAMES[(globalIndex * 13 + programIndex * 7) % LAST_NAMES.length]
      const age = program.ages[(index + Math.floor(index / program.cabins.length)) % program.ages.length]
      const cabin = program.cabins[index % program.cabins.length]
      const [strength, speed, wit, creativity, leadership] = SKILLS.map((_, skillIndex) => skillScore(globalIndex, age, skillIndex, programIndex))
      rows.push({ id: createId(), name, lastName, age, gender, cabin, strength, speed, wit, creativity, leadership })
    }
  })
  return rows
}
