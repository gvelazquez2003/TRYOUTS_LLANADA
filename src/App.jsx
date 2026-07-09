import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, Check, ChevronRight, CircleHelp, Download, Edit3, FileSpreadsheet, LayoutGrid, Menu, MoveRight, Plus, RefreshCw, Search, Sparkles, Trash2, Trophy, UploadCloud, UserPlus, Users, X } from 'lucide-react'
import { balanceCampers, getBalanceScore, teamAverages } from './balance'
import { CABIN_OPTIONS, isValidCabin, normalizeCabin } from './cabins.js'
import { BALANCE_DIMENSIONS, DEMO_CAMPERS, SKILLS, TRIBES } from './data'
import { parseCampersFile } from './importers'
import { getDeviceId, isRemoteSyncConfigured, readLocalSnapshot, readRemoteSnapshot, saveLocalSnapshot, writeRemoteSnapshot } from './syncStore'
import llanadaLogo from './assets/lllg-logo.png'

const emptyForm = { name: '', lastName: '', age: '', cabin: '', ...Object.fromEntries(SKILLS.map(({ key }) => [key, 3])) }
const camperAverage = (camper) => SKILLS.reduce((total, { key }) => total + camper[key], 0) / SKILLS.length
const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('')
const fullName = (camper) => [camper.name, camper.lastName].filter(Boolean).join(' ')
const normalizeIdentity = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const matchesCamperQuery = (camper, query) => {
  const tokens = normalizeIdentity(query).split(' ').filter(Boolean)
  if (!tokens.length) return true
  const searchable = normalizeIdentity(fullName(camper))
  return tokens.every((token) => searchable.includes(token))
}
const identityKey = ({ name = '', lastName = '', age = '', cabin = '' }, includeCabin = false) => [normalizeIdentity(name), normalizeIdentity(lastName), String(age).trim(), includeCabin ? normalizeIdentity(cabin) : ''].join('|')
const syncErrorStatus = (error) => {
  const message = error?.message || ''
  if (message.includes('(404)')) return { mode: 'error', label: 'Tabla sync no existe', detail: message }
  if (message.includes('(401)') || message.includes('(403)')) return { mode: 'error', label: 'Revisa permisos sync', detail: message }
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('url')) return { mode: 'error', label: 'Revisa URL sync', detail: message }
  return { mode: 'error', label: 'Sync sin conexión', detail: message }
}
const reconcileAssignments = (current, campers) => {
  if (!campers.length) return null
  if (!Array.isArray(current)) return null
  const validIds = new Set(campers.map(({ id }) => id))
  const next = TRIBES.map((_, index) => (Array.isArray(current[index]) ? current[index] : []).filter((id) => validIds.has(id)))
  const assigned = new Set(next.flat())
  campers.filter(({ id }) => !assigned.has(id)).forEach(({ id }) => { const smallest = next.reduce((best, team, index) => team.length < next[best].length ? index : best, 0); next[smallest].push(id) })
  return next
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const fileSafe = (value) => String(value || 'tribu')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

function FlagImage({ team, large = false }) {
  return <img className={`flag-emoji ${large ? 'large' : ''}`} src={team.flagUrl} alt={`Bandera de ${team.name}`} loading="lazy" />
}

const textDecodeScore = (text) => (
  (text.match(/\uFFFD/g) || []).length * 5 +
  (text.match(/[ÃÂ]/g) || []).length
)

async function readCsvText(file) {
  const buffer = await file.arrayBuffer()
  const candidates = ['utf-8', 'windows-1252'].map((encoding) => ({
    encoding,
    text: new TextDecoder(encoding).decode(buffer),
  }))
  return candidates.sort((a, b) => textDecodeScore(a.text) - textDecodeScore(b.text))[0].text
}

function downloadTribeSheet(team) {
  const generatedAt = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())
  const rows = team.members.map((member, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.lastName || '—')}</td><td>${escapeHtml(member.age)}</td><td>${escapeHtml(member.cabin || '—')}</td></tr>`).join('')
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(team.name)} · Formación de Tribus</title>
  <style>
    body { font-family: Arial, sans-serif; color: #173f35; margin: 32px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid ${team.color}; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 34px; }
    .meta { text-align: right; color: #617168; font-size: 13px; }
    .flag { width: 58px; height: 38px; object-fit: cover; border-radius: 6px; margin-right: 12px; vertical-align: middle; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th { text-align: left; background: #edf3e9; color: #173f35; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    th, td { border: 1px solid #d9dfd6; padding: 11px 12px; }
    td:first-child { width: 48px; text-align: center; color: #617168; }
    .call-note { margin-top: 22px; border: 1px dashed #b9c4b8; border-radius: 10px; padding: 14px; color: #52645d; }
    @media print { body { margin: 20mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:18px;padding:10px 14px;border:0;border-radius:8px;background:#173f35;color:white;font-weight:700;">Imprimir hoja</button>
  <header>
    <div><h1><img class="flag" src="${escapeHtml(team.flagUrl)}" alt="Bandera de ${escapeHtml(team.name)}" />${escapeHtml(team.name)}</h1><p>Lista para reunir a los campistas de esta tribu.</p></div>
    <div class="meta"><strong>Formación de Tribus</strong><br />${team.members.length} campista(s)<br />${escapeHtml(generatedAt)}</div>
  </header>
  <table>
    <thead><tr><th>#</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Cabaña</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">Esta tribu no tiene campistas asignados.</td></tr>'}</tbody>
  </table>
  <div class="call-note"><strong>Nota para staff:</strong> llama a cada campista, verifica su cabaña y marca asistencia antes de iniciar la actividad.</div>
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tribu-${fileSafe(team.name)}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadCabinAssignmentSheet(rows, cabinFilter) {
  const generatedAt = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())
  const title = cabinFilter ? `Cabaña ${cabinFilter}` : 'Todas las cabañas'
  const tableRows = rows.map(({ camper, team }, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(camper.name)}</td><td>${escapeHtml(camper.lastName || '—')}</td><td>${escapeHtml(camper.age)}</td><td>${escapeHtml(camper.cabin || '—')}</td><td>${escapeHtml(team.name)}</td></tr>`).join('')
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Campistas por cabaña</title>
  <style>
    body { font-family: Arial, sans-serif; color: #173f35; margin: 32px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #173f35; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 32px; }
    .meta { text-align: right; color: #617168; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th { text-align: left; background: #edf3e9; color: #173f35; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    th, td { border: 1px solid #d9dfd6; padding: 10px 12px; }
    td:first-child { width: 48px; text-align: center; color: #617168; }
    .note { margin-top: 22px; border: 1px dashed #b9c4b8; border-radius: 10px; padding: 14px; color: #52645d; }
    @media print { body { margin: 20mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:18px;padding:10px 14px;border:0;border-radius:8px;background:#173f35;color:white;font-weight:700;">Imprimir hoja</button>
  <header>
    <div><h1>${escapeHtml(title)}</h1><p>Lista de campistas con su tribu asignada.</p></div>
    <div class="meta"><strong>Formación de Tribus</strong><br />${rows.length} campista(s)<br />${escapeHtml(generatedAt)}</div>
  </header>
  <table>
    <thead><tr><th>#</th><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Cabaña</th><th>Tribu</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="6">No hay campistas para esta cabaña.</td></tr>'}</tbody>
  </table>
  <div class="note"><strong>Nota para staff:</strong> usa esta hoja para ubicar a los campistas de cada cabaña y enviarlos a su tribu correspondiente.</div>
</body>
</html>`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${cabinFilter ? `cabana-${fileSafe(cabinFilter)}` : 'campistas-por-cabana'}-tribus.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Brand({ footer = false }) {
  return <span className={`brand-content ${footer ? 'footer-brand-content' : ''}`}><img className="brand-logo" src={llanadaLogo} alt="La Llanada Venezuela" /><span className="brand-title"><strong>FORMACIÓN DE</strong><small>TRIBUS</small></span></span>
}

function Rating({ value, onChange, label }) {
  return <div className="rating" role="group" aria-label={label}>{[0, 1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={value === rating ? 'active' : ''} onClick={() => onChange(rating)} aria-label={`${rating} de 5`}>{rating}</button>)}</div>
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const handler = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>
}

function CamperForm({ camper, onSave, onClose }) {
  const [form, setForm] = useState({ ...emptyForm, ...(camper || {}) })
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const lastName = form.lastName.trim()
    const cabin = normalizeCabin(form.cabin)
    const age = Number(form.age)
    if (name.length < 2) return setError('Escribe el nombre del campista.')
    if (lastName.length < 2) return setError('Escribe el apellido del campista.')
    if (!Number.isInteger(age) || age < 5 || age > 20) return setError('La edad debe estar entre 5 y 20 años.')
    if (!isValidCabin(cabin)) return setError('La cabaña debe ser B1-B12, S1-S16, CIT 1, CIT 2 o AV 1-AV 4.')
    onSave({ ...form, name, lastName, age, cabin })
  }
  return <form onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Ficha de evaluación</span><h2>{camper ? 'Editar campista' : 'Nuevo campista'}</h2><p>Registra sus datos y califica cada aptitud.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={20} /></button></div>
    <div className="form-grid camper-form-grid"><label className="field"><span>Nombre</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Sofía" /></label><label className="field"><span>Apellido</span><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Ej. Herrera" /></label><label className="field"><span>Edad</span><div className="input-suffix"><input type="number" min="5" max="20" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="12" /><small>años</small></div></label><label className="field"><span>Cabaña</span><select value={normalizeCabin(form.cabin)} onChange={(event) => setForm({ ...form, cabin: event.target.value })}><option value="">Sin cabaña</option>{CABIN_OPTIONS.map((cabinOption) => <option key={cabinOption} value={cabinOption}>{cabinOption}</option>)}</select></label></div>
    <div className="skills-form"><div className="skills-title"><strong>Aptitudes</strong><span>0 = no observado · 5 = sobresaliente</span></div>{SKILLS.map(({ key, label, icon }) => <div className="skill-row" key={key}><div className="skill-name"><span>{icon}</span><strong>{label}</strong></div><Rating label={label} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} /></div>)}</div>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" type="submit"><Check size={18} /> {camper ? 'Guardar cambios' : 'Agregar campista'}</button></div>
  </form>
}

function TribeCamperForm({ teams, initialTeamIndex = 0, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', lastName: '', age: '', cabin: '', teamIndex: initialTeamIndex, ...Object.fromEntries(SKILLS.map(({ key }) => [key, 3])) })
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const lastName = form.lastName.trim()
    const cabin = normalizeCabin(form.cabin)
    const age = Number(form.age)
    const teamIndex = Number(form.teamIndex)
    if (name.length < 2) return setError('Escribe el nombre del campista.')
    if (lastName.length < 2) return setError('Escribe el apellido del campista.')
    if (!Number.isInteger(age) || age < 5 || age > 20) return setError('La edad debe estar entre 5 y 20 aÃ±os.')
    if (!isValidCabin(cabin)) return setError('La cabaña debe ser B1-B12, S1-S16, CIT 1, CIT 2 o AV 1-AV 4.')
    if (!Number.isInteger(teamIndex) || !teams[teamIndex]) return setError('Selecciona una tribu vÃ¡lida.')
    onSave({ ...form, name, lastName, age, cabin }, teamIndex)
  }
  return <form onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Agregar desde tribus</span><h2>Nuevo campista</h2><p>Registra sus datos, aptitudes y la tribu donde debe quedar.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={20} /></button></div>
    <div className="form-grid tribe-add-grid"><label className="field"><span>Nombre</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Sofía" /></label><label className="field"><span>Apellido</span><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Ej. Herrera" /></label><label className="field"><span>Edad</span><div className="input-suffix"><input type="number" min="5" max="20" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="12" /><small>años</small></div></label><label className="field"><span>Cabaña</span><select value={normalizeCabin(form.cabin)} onChange={(event) => setForm({ ...form, cabin: event.target.value })}><option value="">Sin cabaña</option>{CABIN_OPTIONS.map((cabinOption) => <option key={cabinOption} value={cabinOption}>{cabinOption}</option>)}</select></label><label className="field full-span"><span>Tribu</span><select value={form.teamIndex} onChange={(event) => setForm({ ...form, teamIndex: Number(event.target.value) })}>{teams.map((team, index) => <option key={team.name} value={index}>{team.name}</option>)}</select></label></div>
    <div className="skills-form"><div className="skills-title"><strong>Aptitudes</strong><span>0 = no observado Â· 5 = sobresaliente</span></div>{SKILLS.map(({ key, label, icon }) => <div className="skill-row" key={key}><div className="skill-name"><span>{icon}</span><strong>{label}</strong></div><Rating label={label} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} /></div>)}</div>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" type="submit"><Plus size={18} /> Agregar a tribu</button></div>
  </form>
}

function ImportZone({ onImport }) {
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState(null)
  const [duplicateDetails, setDuplicateDetails] = useState([])
  const [showDuplicates, setShowDuplicates] = useState(true)
  const load = async (file) => {
    if (!file) return
    setDuplicateDetails([])
    setShowDuplicates(true)
    const extension = file.name.split('.').pop().toLowerCase()
    if (extension === 'pdf') {
      setNotice({ type: 'warning', text: 'La hoja escaneada puede conservarse como respaldo, pero la letra manuscrita no se importa con suficiente seguridad. Transcribe las notas o exporta la hoja digital como CSV.' })
      return
    }
    if (!['csv', 'txt'].includes(extension)) {
      setNotice({ type: 'error', text: 'Exporta el archivo de Excel como CSV UTF-8 antes de cargarlo.' })
      return
    }
    try {
      const parsed = parseCampersFile(await readCsvText(file))
      const errors = parsed.errors
      const { added, updated, duplicates, duplicateDetails: detailRows } = onImport(parsed)
      setDuplicateDetails(detailRows)
      setShowDuplicates(true)
      const details = [errors.length ? `${errors.length} fila(s) con errores` : '', duplicates ? `${duplicates} duplicado(s)` : ''].filter(Boolean).join(' · ')
      setNotice({ type: added || updated ? 'success' : 'warning', text: `${added} campista(s) nuevo(s), ${updated} actualizado(s)${details ? `. ${details}.` : '.'}` })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }
  return <div className="import-block">
    <label className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); load(event.dataTransfer.files[0]) }}>
      <input type="file" accept=".csv,.txt,.pdf,.xlsx" onChange={(event) => { load(event.target.files[0]); event.target.value = '' }} />
      <span className="drop-icon"><UploadCloud size={23} /></span><span><strong>Arrastra aquí la lista de campistas</strong><small>CSV con Nombre, Apellido, Edad, Cabaña, Fuerza, Velocidad, Inteligencia, Creatividad y Liderazgo</small></span><span className="button secondary compact"><FileSpreadsheet size={16} /> Elegir archivo</span>
    </label>
    <div className="paper-note"><AlertTriangle size={17} /><span><strong>¿Usan la hoja impresa?</strong> Sí. Los evaluadores pueden llenarla en papel; después se transcribe o se carga el CSV. No es obligatorio usar el teléfono.</span></div>
    {notice && <div className={`import-notice ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Cerrar"><X size={15} /></button></div>}
    {duplicateDetails.length > 0 && <div className={`duplicate-report ${showDuplicates ? '' : 'collapsed'}`}><div><button type="button" className="duplicate-toggle" onClick={() => setShowDuplicates(!showDuplicates)}><strong>Duplicados detectados</strong><span>{duplicateDetails.length} registro(s) {showDuplicates ? 'visibles' : 'ocultos'}</span></button><div className="duplicate-actions"><button type="button" onClick={() => navigator.clipboard?.writeText(duplicateDetails.map(({ reason, camper }) => `${reason}: ${fullName(camper)} · ${camper.age} años · Cabaña ${camper.cabin || '—'}`).join('\n'))}>Copiar lista</button><button type="button" onClick={() => setShowDuplicates(!showDuplicates)}>{showDuplicates ? 'Contraer' : 'Mostrar'}</button><button type="button" onClick={() => setDuplicateDetails([])}>Ocultar</button></div></div>{showDuplicates && <ul>{duplicateDetails.map(({ key, reason, camper }) => <li key={key}><span>{reason}</span><strong>{fullName(camper)}</strong><small>{camper.age} años · Cabaña {camper.cabin || '—'}</small></li>)}</ul>}</div>}
  </div>
}

function Tryouts({ campers, setCampers, onGoTribes }) {
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = campers.filter((camper) => `${fullName(camper)} ${camper.cabin || ''}`.toLowerCase().includes(query.toLowerCase()))
  const save = (camper) => {
    if (editing) setCampers((items) => items.map((item) => item.id === editing.id ? { ...camper, id: item.id } : item))
    else setCampers((items) => [...items, { ...camper, id: crypto.randomUUID() }])
    setModalOpen(false); setEditing(null)
  }
  const importCampers = ({ campers: incoming, hasCabin, hasScores }) => {
    const seen = new Set()
    const duplicateDetails = []
    const keyForImport = (camper) => identityKey(camper, hasCabin)
    const fallbackPreloadKey = (camper) => identityKey(camper, false)
    const unique = incoming.filter((camper, index) => {
      const key = keyForImport(camper)
      if (seen.has(key)) {
        duplicateDetails.push({ key: `archivo-${key}-${index}`, reason: 'Repetido en el archivo', camper })
        return false
      }
      seen.add(key)
      return true
    })
    const exactExistingKeys = new Set(campers.map((camper) => identityKey(camper, hasCabin)))
    const preloadExistingKeys = new Set(campers.filter((camper) => !camper.cabin).map((camper) => identityKey(camper, false)))
    const scoreValues = (camper) => Object.fromEntries(SKILLS.map(({ key }) => [key, camper[key]]))
    const hasExistingMatch = (camper) => exactExistingKeys.has(keyForImport(camper)) || (hasCabin && preloadExistingKeys.has(fallbackPreloadKey(camper)))
    const mergeCamper = (current, imported) => ({
      ...current,
      name: imported.name,
      lastName: imported.lastName,
      age: imported.age,
      cabin: hasCabin ? (imported.cabin || current.cabin || '') : (current.cabin || ''),
      ...(hasScores ? scoreValues(imported) : {}),
    })
    const added = unique.filter((camper) => !hasExistingMatch(camper)).length
    const updated = unique.length - added
    unique.filter(hasExistingMatch).forEach((camper, index) => {
      duplicateDetails.push({ key: `existente-${keyForImport(camper)}-${index}`, reason: 'Ya existía y fue actualizado', camper })
    })
    setCampers((items) => {
      const incomingByKey = new Map(unique.map((camper) => [keyForImport(camper), camper]))
      const incomingByPreloadKey = new Map(unique.map((camper) => [fallbackPreloadKey(camper), camper]))
      const currentKeys = new Set(items.map((item) => identityKey(item, hasCabin)))
      const currentPreloadKeys = new Set(items.filter((item) => !item.cabin).map((item) => identityKey(item, false)))
      const updatedItems = items.map((item) => {
        const exactMatch = incomingByKey.get(identityKey(item, hasCabin))
        const preloadMatch = hasCabin && !item.cabin ? incomingByPreloadKey.get(identityKey(item, false)) : null
        return exactMatch || preloadMatch ? mergeCamper(item, exactMatch || preloadMatch) : item
      })
      const additions = unique
        .filter((camper) => !currentKeys.has(keyForImport(camper)) && !(hasCabin && currentPreloadKeys.has(fallbackPreloadKey(camper))))
        .map((camper) => ({ ...camper, id: crypto.randomUUID(), cabin: hasCabin ? camper.cabin : '', ...(hasScores ? scoreValues(camper) : {}) }))
      return [...updatedItems, ...additions]
    })
    return { added, updated, duplicates: duplicateDetails.length, duplicateDetails }
  }
  const addDemo = () => setCampers(Array.from({ length: 300 }, (_, index) => {
    const [fullDemoName] = DEMO_CAMPERS[index % DEMO_CAMPERS.length]
    const [name, ...lastNameParts] = fullDemoName.split(' ')
    return {
      id: crypto.randomUUID(),
      name,
      lastName: lastNameParts.join(' '),
      age: randomInt(6, 16),
      cabin: CABIN_OPTIONS[index % CABIN_OPTIONS.length],
      strength: randomInt(0, 5),
      speed: randomInt(0, 5),
      wit: randomInt(0, 5),
      creativity: randomInt(0, 5),
      leadership: randomInt(0, 5),
    }
  }))
  const deleteAll = () => {
    if (window.confirm('¿Seguro que quieres eliminar TODOS los registros de campistas? Esta acción también limpia la distribución actual de tribus.')) setCampers([])
  }

  return <>
    <section className="hero"><div><span className="eyebrow"><Sparkles size={14} /> Módulo de evaluación</span><h1>Conoce el talento de<br /><em>cada campista.</em></h1><p>Registra sus aptitudes para construir tribus más justas, diversas y equilibradas.</p></div><div className="hero-illustration" aria-hidden="true"><div className="sun" /><div className="mountain mountain-one" /><div className="mountain mountain-two" /><div className="flag">★</div><div className="trees">♠ ♠ ♠</div></div></section>
    <section className="stats-row"><article><span className="stat-icon green"><Users /></span><div><strong>{campers.length}</strong><small>Campistas registrados</small></div></article><article><span className="stat-icon gold"><BarChart3 /></span><div><strong>{campers.length ? (campers.reduce((total, camper) => total + camperAverage(camper), 0) / campers.length).toFixed(1) : '—'}</strong><small>Promedio de aptitudes</small></div></article><article><span className="stat-icon coral"><Trophy /></span><div><strong>16</strong><small>Tribus disponibles</small></div></article></section>
    <section className="panel roster-panel"><div className="panel-header"><div><span className="eyebrow">Base de campistas</span><h2>Participantes</h2><p>Administra las fichas antes de hacer la división.</p></div><div className="panel-actions">{campers.length > 0 && <button className="button danger-action" onClick={deleteAll}><Trash2 size={18} /> Eliminar todos</button>}<button className="button primary" onClick={() => { setEditing(null); setModalOpen(true) }}><Plus size={18} /> Agregar campista</button></div></div>
      <ImportZone onImport={importCampers} />
      <div className="preload-note"><strong>Flujo recomendado:</strong> primero sube la lista previa con Nombre, Apellido y Edad. Después sube otro CSV con esos mismos datos y cabaña para actualizar aptitudes. Los duplicados se validan con nombre, apellido, edad y cabaña cuando esté disponible.</div>
      {campers.length ? <><div className="toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar campista o cabaña..." /></div><span>{filtered.length} de {campers.length}</span></div><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Apellido</th><th>Edad</th><th>Cabaña</th>{SKILLS.map(({ key, label }) => <th key={key}>{label}</th>)}<th>Prom.</th><th /></tr></thead><tbody>{filtered.map((camper) => <tr key={camper.id}><td><span className="avatar">{initials(fullName(camper))}</span><strong>{camper.name}</strong></td><td><strong>{camper.lastName || '—'}</strong></td><td>{camper.age} años</td><td><span className="cabin-pill">{camper.cabin || '—'}</span></td>{SKILLS.map(({ key }) => <td key={key}><span className={`score score-${camper[key]}`}>{camper[key]}</span></td>)}<td><strong>{camperAverage(camper).toFixed(1)}</strong></td><td><div className="row-actions"><button onClick={() => { setEditing(camper); setModalOpen(true) }} title="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => setCampers((items) => items.filter(({ id }) => id !== camper.id))} title="Eliminar"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div></> : <div className="empty-state"><span><UserPlus size={34} /></span><h3>Tu lista está esperando aventureros</h3><p>Agrega el primer campista, arrastra un CSV o carga un grupo de ejemplo.</p><div><button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Agregar campista</button><button className="button secondary" onClick={addDemo}>Cargar datos de prueba</button></div></div>}
    </section>
    {campers.length > 0 && <div className="next-banner"><div><span><Sparkles size={22} /></span><div><strong>¿Todos listos?</strong><p>Cuando termines las evaluaciones, crea las 16 tribus equilibradas.</p></div></div><button className="button light" onClick={onGoTribes}>Ir a formar tribus <ArrowRight size={18} /></button></div>}
    {modalOpen && <Modal onClose={() => { setModalOpen(false); setEditing(null) }}><CamperForm camper={editing} onSave={save} onClose={() => { setModalOpen(false); setEditing(null) }} /></Modal>}
  </>
}

function Tribes({ campers, teams, generated, onGenerate, onMove, onAddCamper }) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [tribeQuery, setTribeQuery] = useState('')
  const [cabinFilter, setCabinFilter] = useState('')
  const [sideFilter, setSideFilter] = useState('all')
  const [addingTeamIndex, setAddingTeamIndex] = useState(null)
  const balance = getBalanceScore(teams, campers)
  const selected = selectedIndex === null ? null : teams[selectedIndex]
  const hasTribeFilter = generated && tribeQuery.trim().length > 0
  const hasCabinFilter = generated && cabinFilter.trim().length > 0
  const hasSideFilter = generated && sideFilter !== 'all'
  const hasRosterFilter = hasTribeFilter || hasCabinFilter
  const filteredTeams = useMemo(() => teams.map((team) => ({
    ...team,
    visibleMembers: hasRosterFilter
      ? team.members.filter((member) => (!hasTribeFilter || matchesCamperQuery(member, tribeQuery)) && (!hasCabinFilter || normalizeIdentity(member.cabin) === normalizeIdentity(cabinFilter)))
      : team.members,
  })), [teams, tribeQuery, cabinFilter, hasTribeFilter, hasCabinFilter, hasRosterFilter])
  const displayedTeams = filteredTeams
    .filter((team) => !hasSideFilter || team.side === sideFilter)
    .filter((team) => !hasRosterFilter || team.visibleMembers.length)
  const filteredTotal = filteredTeams.reduce((total, team) => total + team.visibleMembers.length, 0)
  const selectedVisibleMembers = selected ? (hasRosterFilter ? selected.members.filter((member) => (!hasTribeFilter || matchesCamperQuery(member, tribeQuery)) && (!hasCabinFilter || normalizeIdentity(member.cabin) === normalizeIdentity(cabinFilter))) : selected.members) : []
  const cabinOptions = useMemo(() => Array.from(new Set(campers.map((camper) => camper.cabin).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [campers])
  const cabinRows = useMemo(() => teams.flatMap((team) => team.members.map((camper) => ({ camper, team })))
    .filter(({ camper }) => !hasCabinFilter || normalizeIdentity(camper.cabin) === normalizeIdentity(cabinFilter))
    .sort((a, b) => (a.camper.cabin || '').localeCompare(b.camper.cabin || '', 'es', { numeric: true }) || fullName(a.camper).localeCompare(fullName(b.camper), 'es')), [teams, cabinFilter, hasCabinFilter])
  const dropMember = (event, targetIndex) => {
    event.preventDefault()
    const memberId = event.dataTransfer.getData('text/camper-id')
    const sourceIndex = Number(event.dataTransfer.getData('text/team-index'))
    if (memberId && Number.isInteger(sourceIndex)) onMove(memberId, sourceIndex, targetIndex)
  }
  return <>
    <section className="tribes-hero"><div><span className="eyebrow"><LayoutGrid size={14} /> Módulo de distribución</span><h1>16 tribus.<br /><em>Un solo campamento.</em></h1><p>El algoritmo distribuye edades y aptitudes usando las prioridades definidas para el campamento.</p><div className="hero-actions"><button className="button primary" disabled={!campers.length} onClick={onGenerate}>{generated ? <RefreshCw size={18} /> : <Sparkles size={18} />}{generated ? 'Generar otra distribución' : 'Formar las tribus'}</button><span><CircleHelp size={16} /> {campers.length ? `${campers.length} campistas listos` : 'Primero registra campistas en Tryouts'}</span></div></div><div className="balance-preview"><div className="balance-ring" style={{ '--score': generated ? balance : 0 }}><strong>{generated ? `${balance}%` : '—'}</strong><small>equilibrio</small></div><div><span>Mayor prioridad</span><strong>Edad + Velocidad</strong><small>50% de la clasificación</small></div></div></section>
    <section className="weights-panel"><div><span className="eyebrow">Criterios de balance</span><strong>Importancia relativa</strong></div><div className="weight-chips"><span>Edad + Velocidad <b>50%</b></span><span>Liderazgo <b>20%</b></span><span>Fuerza <b>20%</b></span><span>Creatividad <b>5%</b></span><span>Inteligencia <b>5%</b></span></div><small>Estos porcentajes suman 100% y se usan directamente para equilibrar las tribus.</small></section>
    <section className="how-it-works"><span className="step"><b>1</b><span><strong>Leemos los perfiles</strong><small>Edad y aptitudes</small></span></span><ChevronRight /><span className="step"><b>2</b><span><strong>Aplicamos los pesos</strong><small>{BALANCE_DIMENSIONS.length} criterios</small></span></span><ChevronRight /><span className="step"><b>3</b><span><strong>Personalizas el resultado</strong><small>Cambios de último minuto</small></span></span></section>
    <section className="tribe-section"><div className="section-heading"><div><span className="eyebrow">Mapa de tribus</span><h2>{generated ? 'Distribución actual' : 'Las tribus del campamento'}</h2></div>{generated && <div className="result-legend"><span><i className="dot green-dot" /> Cambios manuales habilitados</span><span>Arrastra campistas entre tribus</span></div>}</div>
      {generated && <div className="customize-hint"><MoveRight size={18} /><span><strong>Esta distribución es editable.</strong> Abre una tribu para mover a un campista, o arrástralo directamente entre tarjetas.</span></div>}
      {generated && <div className="tribe-filter-bar"><div className="search"><Search size={18} /><input value={tribeQuery} onChange={(event) => setTribeQuery(event.target.value)} placeholder="Filtrar en tribus por nombre..." /></div><span>{hasTribeFilter ? `${filteredTotal} coincidencia(s) de ${campers.length}` : `${campers.length} campistas distribuidos`}</span>{hasTribeFilter && <button type="button" onClick={() => setTribeQuery('')}>Limpiar filtro</button>}</div>}
      {generated && <div className="cabin-export-bar"><label className="field"><span>Filtrar por cabaña</span><select value={cabinFilter} onChange={(event) => setCabinFilter(event.target.value)}><option value="">Todas las cabañas</option>{cabinOptions.map((cabin) => <option key={cabin} value={cabin}>{cabin}</option>)}</select></label><span>{hasCabinFilter ? `${cabinRows.length} campista(s) de ${cabinFilter}` : `${cabinRows.length} campista(s) con tribu`}</span><button type="button" className="button secondary" disabled={!cabinRows.length} onClick={() => downloadCabinAssignmentSheet(cabinRows, cabinFilter)}><Download size={16} /> Exportar lista</button><div className="side-buttons"><button type="button" className={sideFilter === 'pares' ? 'active' : ''} onClick={() => setSideFilter(sideFilter === 'pares' ? 'all' : 'pares')}>Pares</button><button type="button" className={sideFilter === 'impares' ? 'active' : ''} onClick={() => setSideFilter(sideFilter === 'impares' ? 'all' : 'impares')}>Impares</button></div>{hasCabinFilter && <button type="button" onClick={() => setCabinFilter('')}>Ver todas</button>}</div>}
      {generated && <div className="tribe-add-row"><button type="button" className="button secondary" onClick={() => setAddingTeamIndex(selectedIndex ?? 0)}><Plus size={18} /> Agregar campista a tribu</button></div>}
      {(hasTribeFilter || hasCabinFilter || hasSideFilter) && !displayedTeams.length && <div className="empty-mini tribe-filter-empty">No hay tribus con campistas que coincidan con ese filtro.</div>}
      <div className="tribe-grid">{displayedTeams.map((team) => { const teamIndex = teams.findIndex(({ name }) => name === team.name); const averages = teamAverages(team.members); const visibleMembers = team.visibleMembers || team.members; return <article className={`tribe-card ${generated ? 'generated' : ''}`} key={team.name} style={{ '--tribe': team.color }} onClick={() => generated && setSelectedIndex(teamIndex)} onDragOver={(event) => generated && event.preventDefault()} onDrop={(event) => dropMember(event, teamIndex)}><div className="tribe-accent" /><div className="tribe-top"><FlagImage team={team} /><span className="member-count"><Users size={14} /> {hasRosterFilter ? `${visibleMembers.length}/${team.members.length}` : team.members.length}</span></div><h3>{team.name}</h3>{generated ? <><div className="member-preview">{visibleMembers.slice(0, 3).map((member) => <span draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/camper-id', member.id); event.dataTransfer.setData('text/team-index', String(teamIndex)) }} className="mini-avatar" title={`${fullName(member)} · arrastra para mover`} key={member.id}>{initials(fullName(member))}</span>)}{visibleMembers.length > 3 && <span className="mini-avatar more">+{visibleMembers.length - 3}</span>}{!hasRosterFilter && !team.members.length && <small>Suelta un campista aquí</small>}</div><div className="tribe-metrics"><span>Edad <strong>{averages.age ? averages.age.toFixed(1) : '—'}</strong></span><span>Aptitud <strong>{averages.skills ? averages.skills.toFixed(1) : '—'}</strong></span></div></> : <p>Esperando distribución</p>} {generated && <div className="tribe-actions"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedIndex(teamIndex) }}>Editar <ChevronRight size={15} /></button><button type="button" disabled={!team.members.length} onClick={(event) => { event.stopPropagation(); downloadTribeSheet(team) }}><Download size={14} /> Hoja</button></div>}</article> })}</div>
    </section>
    {selected && <Modal onClose={() => setSelectedIndex(null)}><div className="modal-heading team-modal-title"><div><FlagImage team={selected} large /><div><span className="eyebrow">Personalizar tribu</span><h2>{selected.name}</h2></div></div><div className="modal-heading-actions"><button className="button secondary compact" disabled={!selected.members.length} onClick={() => downloadTribeSheet(selected)}><Download size={16} /> Descargar hoja</button><button className="icon-button" onClick={() => setSelectedIndex(null)}><X size={20} /></button></div></div><p className="move-help">Selecciona cualquier tribu para mover a un campista libremente. Los cambios se guardan automáticamente en este dispositivo.</p>{hasRosterFilter && <div className="modal-filter-note"><Search size={15} /> Mostrando {selectedVisibleMembers.length} de {selected.members.length} con el filtro activo.</div>}<div className="team-members">{selectedVisibleMembers.length ? selectedVisibleMembers.map((member) => <div key={member.id}><span className="avatar">{initials(fullName(member))}</span><div><strong>{fullName(member)}</strong><small>{member.age} años · Cabaña {member.cabin || '—'} · Promedio {camperAverage(member).toFixed(1)}</small></div><label className="move-select"><span>Mover a</span><select value={selectedIndex} onChange={(event) => onMove(member.id, selectedIndex, Number(event.target.value))}>{teams.map((team, index) => <option key={team.name} value={index}>{team.name}</option>)}</select></label></div>) : <div className="empty-mini">{selected.members.length && hasRosterFilter ? 'No hay coincidencias en esta tribu con el filtro activo.' : 'Esta tribu está vacía. Puedes arrastrar integrantes hasta su tarjeta.'}</div>}</div></Modal>}
    {addingTeamIndex !== null && <Modal onClose={() => setAddingTeamIndex(null)}><TribeCamperForm teams={teams} initialTeamIndex={addingTeamIndex} onSave={(camper, teamIndex) => { onAddCamper(camper, teamIndex); setAddingTeamIndex(null) }} onClose={() => setAddingTeamIndex(null)} /></Modal>}
  </>
}

export default function App() {
  const [initialSnapshot] = useState(readLocalSnapshot)
  const [active, setActive] = useState('tryouts')
  const [menuOpen, setMenuOpen] = useState(false)
  const [campers, setCampers] = useState(() => initialSnapshot.campers)
  const [assignments, setAssignments] = useState(() => reconcileAssignments(initialSnapshot.assignments, initialSnapshot.campers))
  const [syncStatus, setSyncStatus] = useState(() => isRemoteSyncConfigured() ? { mode: 'syncing', label: 'Conectando sync' } : { mode: 'local', label: 'Solo este dispositivo' })
  const latestStateRef = useRef({ campers, assignments })
  const applyingRemoteRef = useRef(false)
  const syncReadyRef = useRef(false)
  const lastRemoteUpdateRef = useRef(null)
  const pendingRemoteSaveRef = useRef(false)

  useEffect(() => {
    latestStateRef.current = { campers, assignments }
    saveLocalSnapshot({ campers, assignments })
    if (isRemoteSyncConfigured() && syncReadyRef.current && !applyingRemoteRef.current) pendingRemoteSaveRef.current = true
  }, [campers, assignments])

  useEffect(() => {
    if (!isRemoteSyncConfigured()) return undefined
    let cancelled = false
    let pollTimeout = null
    const deviceId = getDeviceId()
    const applyRemote = (remote) => {
      const remoteCampers = remote.campers || []
      applyingRemoteRef.current = true
      pendingRemoteSaveRef.current = false
      setCampers(remoteCampers)
      setAssignments(reconcileAssignments(remote.assignments, remoteCampers))
      window.setTimeout(() => { applyingRemoteRef.current = false }, 0)
    }
    const poll = async () => {
      try {
        const remote = await readRemoteSnapshot()
        if (cancelled) return
        if (remote?.updatedAt && remote.updatedAt !== lastRemoteUpdateRef.current) {
          lastRemoteUpdateRef.current = remote.updatedAt
          if (remote.updatedBy !== deviceId) applyRemote(remote)
        }
        if (!remote && !syncReadyRef.current) {
          const saved = await writeRemoteSnapshot(latestStateRef.current)
          lastRemoteUpdateRef.current = saved?.updatedAt || null
        }
        syncReadyRef.current = true
        if (pendingRemoteSaveRef.current && !applyingRemoteRef.current) {
          const saved = await writeRemoteSnapshot(latestStateRef.current)
          lastRemoteUpdateRef.current = saved?.updatedAt || lastRemoteUpdateRef.current
          pendingRemoteSaveRef.current = false
        }
        setSyncStatus({ mode: 'online', label: 'Sincronizado' })
      } catch (error) {
        if (!cancelled) setSyncStatus(syncErrorStatus(error))
      } finally {
        if (!cancelled) pollTimeout = window.setTimeout(poll, 4000)
      }
    }
    const boot = async () => {
      setSyncStatus({ mode: 'syncing', label: 'Conectando sync' })
      try {
        const remote = await readRemoteSnapshot()
        if (cancelled) return
        if (remote) {
          lastRemoteUpdateRef.current = remote.updatedAt
          applyRemote(remote)
        } else {
          const saved = await writeRemoteSnapshot(latestStateRef.current)
          lastRemoteUpdateRef.current = saved?.updatedAt || null
        }
        syncReadyRef.current = true
        setSyncStatus({ mode: 'online', label: 'Sincronizado' })
      } catch (error) {
        if (!cancelled) setSyncStatus(syncErrorStatus(error))
      } finally {
        if (!cancelled) pollTimeout = window.setTimeout(poll, 4000)
      }
    }
    boot()
    return () => {
      cancelled = true
      if (pollTimeout) window.clearTimeout(pollTimeout)
    }
  }, [])

  useEffect(() => {
    if (!isRemoteSyncConfigured() || !syncReadyRef.current || applyingRemoteRef.current) return undefined
    const timeout = window.setTimeout(async () => {
      setSyncStatus({ mode: 'syncing', label: 'Guardando sync' })
      try {
        const saved = await writeRemoteSnapshot({ campers, assignments })
        lastRemoteUpdateRef.current = saved?.updatedAt || lastRemoteUpdateRef.current
        pendingRemoteSaveRef.current = false
        setSyncStatus({ mode: 'online', label: 'Sincronizado' })
      } catch (error) {
        pendingRemoteSaveRef.current = true
        setSyncStatus(syncErrorStatus(error))
      }
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [campers, assignments])

  const updateCampers = (updater) => {
    const next = typeof updater === 'function' ? updater(campers) : updater
    setCampers(next)
    setAssignments((current) => reconcileAssignments(current, next))
  }
  const camperMap = useMemo(() => new Map(campers.map((camper) => [camper.id, camper])), [campers])
  const teams = useMemo(() => TRIBES.map((tribe, index) => ({ ...tribe, members: assignments ? (assignments[index] || []).map((id) => camperMap.get(id)).filter(Boolean) : [] })), [assignments, camperMap])
  const average = useMemo(() => campers.length ? campers.reduce((total, camper) => total + camperAverage(camper), 0) / campers.length : 0, [campers])
  const generate = () => setAssignments(balanceCampers(campers).map((team) => team.members.map(({ id }) => id)))
  const move = (memberId, sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return
    setAssignments((current) => current.map((ids, index) => index === sourceIndex ? ids.filter((id) => id !== memberId) : index === targetIndex ? [...ids, memberId] : ids))
  }
  const addCamperToTeam = (camper, teamIndex) => {
    const id = crypto.randomUUID()
    const newCamper = { ...camper, id }
    setCampers((items) => [...items, newCamper])
    setAssignments((current) => {
      const base = TRIBES.map((_, index) => Array.isArray(current?.[index]) ? current[index] : [])
      return base.map((ids, index) => index === teamIndex ? [...ids, id] : ids)
    })
  }
  return <div className="app-shell"><header><button className="brand" onClick={() => setActive('tryouts')}><Brand /></button><nav className={menuOpen ? 'open' : ''}><button className={active === 'tryouts' ? 'active' : ''} onClick={() => { setActive('tryouts'); setMenuOpen(false) }}><UserPlus size={17} /> Tryouts</button><button className={active === 'tribes' ? 'active' : ''} onClick={() => { setActive('tribes'); setMenuOpen(false) }}><LayoutGrid size={17} /> Tribus</button></nav><span className={`sync-pill ${syncStatus.mode}`} title={syncStatus.detail || (isRemoteSyncConfigured() ? 'Sincronización entre dispositivos activa si Supabase está configurado.' : 'Configura Supabase para compartir los datos entre dispositivos.')}><i />{syncStatus.label}</span><div className="header-status"><span>{campers.length}</span><div><strong>Campistas</strong><small>{average ? `${average.toFixed(1)} prom.` : 'Sin evaluar'}</small></div></div><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></header><main>{active === 'tryouts' ? <Tryouts campers={campers} setCampers={updateCampers} onGoTribes={() => setActive('tribes')} /> : <Tribes campers={campers} teams={teams} generated={Boolean(assignments)} onGenerate={generate} onMove={move} onAddCamper={addCamperToTeam} />}</main><footer><span className="brand footer-brand"><Brand footer /></span><p>Equipos equilibrados. Experiencias inolvidables.</p><small>{isRemoteSyncConfigured() ? 'Los datos se sincronizan entre dispositivos y también quedan respaldados localmente.' : 'Modo local: configura Supabase para sincronizar datos entre dispositivos.'}</small></footer></div>
}
