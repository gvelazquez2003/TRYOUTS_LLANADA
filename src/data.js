export const SKILLS = [
  { key: 'strength', label: 'Fuerza', icon: '💪' },
  { key: 'speed', label: 'Velocidad', icon: '⚡' },
  { key: 'wit', label: 'Inteligencia', icon: '🧠' },
  { key: 'creativity', label: 'Creatividad', icon: '✨' },
  { key: 'leadership', label: 'Liderazgo', icon: '🏅' },
]

// Las prioridades indicadas suman 105. El algoritmo las normaliza para
// conservar exactamente la proporción solicitada sin perder ninguna categoría.
export const BALANCE_DIMENSIONS = [
  { key: 'age', label: 'Edad', weight: 25 },
  { key: 'speed', label: 'Velocidad', weight: 25 },
  { key: 'leadership', label: 'Liderazgo', weight: 20 },
  { key: 'strength', label: 'Fuerza', weight: 15 },
  { key: 'creativity', label: 'Creatividad', weight: 10 },
  { key: 'wit', label: 'Inteligencia', weight: 10 },
]

export const TRIBES = [
  ['Alemania', '🇩🇪', '#2d3648'], ['Francia', '🇫🇷', '#3155a4'],
  ['Holanda', '🇳🇱', '#e56b35'], ['Portugal', '🇵🇹', '#167a53'],
  ['Colombia', '🇨🇴', '#d4a91c'], ['México', '🇲🇽', '#1f875d'],
  ['Noruega', '🇳🇴', '#c33b4e'], ['Bélgica', '🇧🇪', '#d9a827'],
  ['Argentina', '🇦🇷', '#53a7c7'], ['Brasil', '🇧🇷', '#30934b'],
  ['Japón', '🇯🇵', '#d64b5c'], ['Inglaterra', '🏴', '#a83f47'],
  ['Estados Unidos', '🇺🇸', '#3c5a96'], ['España', '🇪🇸', '#c9473b'],
  ['Canadá', '🇨🇦', '#d44848'], ['Uruguay', '🇺🇾', '#428ebd'],
].map(([name, flag, color]) => ({ name, flag, color }))

export const DEMO_CAMPERS = [
  ['Sofía Herrera', 12, 3, 5, 4, 5, 4], ['Mateo Rojas', 13, 5, 4, 3, 2, 4],
  ['Valentina Cruz', 11, 2, 4, 5, 5, 3], ['Santiago León', 14, 4, 3, 4, 3, 5],
  ['Isabella Mora', 12, 3, 5, 3, 4, 4], ['Sebastián Díaz', 10, 5, 4, 2, 3, 3],
  ['Camila Torres', 13, 2, 3, 5, 5, 4], ['Nicolás Vega', 15, 4, 4, 4, 2, 5],
  ['Mariana Ruiz', 11, 3, 4, 4, 5, 3], ['Samuel Castro', 12, 5, 5, 2, 2, 4],
  ['Luciana Pérez', 14, 2, 3, 5, 4, 5], ['Daniel Gómez', 13, 4, 5, 3, 3, 3],
  ['Antonella Silva', 10, 3, 4, 4, 5, 2], ['Gabriel Núñez', 15, 5, 3, 3, 2, 5],
  ['Emma Vargas', 12, 2, 5, 4, 4, 4], ['Thiago Mendoza', 11, 4, 4, 3, 3, 3],
  ['Victoria Soto', 13, 3, 3, 5, 5, 4], ['Lucas Romero', 14, 5, 4, 2, 3, 4],
  ['Sara Navarro', 10, 2, 5, 4, 5, 3], ['Martín Acosta', 15, 4, 3, 4, 2, 5],
  ['Renata Campos', 12, 3, 4, 5, 4, 3], ['Emiliano Reyes', 13, 5, 5, 2, 2, 4],
  ['Julieta Molina', 11, 2, 3, 5, 5, 5], ['Joaquín Salas', 14, 4, 5, 3, 3, 3],
  ['Amanda Fuentes', 12, 3, 4, 4, 5, 4], ['Benjamín Ortiz', 10, 5, 4, 2, 3, 2],
  ['Elena Cabrera', 15, 2, 3, 5, 4, 5], ['Tomás Pineda', 13, 4, 5, 3, 2, 4],
  ['Paula Ibarra', 11, 3, 4, 4, 5, 3], ['Diego Arias', 14, 5, 3, 3, 3, 5],
  ['Clara Márquez', 12, 2, 5, 5, 4, 4], ['Alejandro Gil', 13, 4, 4, 2, 3, 3],
]
