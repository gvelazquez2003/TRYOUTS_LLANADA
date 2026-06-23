import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, Check, ChevronRight, CircleHelp, Edit3, FileSpreadsheet, LayoutGrid, Menu, MoveRight, Plus, RefreshCw, Search, Sparkles, Trash2, Trophy, UploadCloud, UserPlus, Users, X } from 'lucide-react'
import { balanceCampers, getBalanceScore, teamAverages } from './balance'
import { BALANCE_DIMENSIONS, DEMO_CAMPERS, SKILLS, TRIBES } from './data'
import { parseCampersFile } from './importers'
import llanadaLogo from './assets/lllg-logo.png'

const STORAGE_KEY = 'tribu-camp-campers-v1'
const TEAMS_STORAGE_KEY = 'formacion-tribus-teams-v1'
const emptyForm = { name: '', age: '', ...Object.fromEntries(SKILLS.map(({ key }) => [key, 3])) }
const camperAverage = (camper) => SKILLS.reduce((total, { key }) => total + camper[key], 0) / SKILLS.length
const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('')
const reconcileAssignments = (current, campers) => {
  if (!Array.isArray(current)) return null
  const validIds = new Set(campers.map(({ id }) => id))
  const next = TRIBES.map((_, index) => (Array.isArray(current[index]) ? current[index] : []).filter((id) => validIds.has(id)))
  const assigned = new Set(next.flat())
  campers.filter(({ id }) => !assigned.has(id)).forEach(({ id }) => { const smallest = next.reduce((best, team, index) => team.length < next[best].length ? index : best, 0); next[smallest].push(id) })
  return next
}

function Brand({ footer = false }) {
  return <span className={`brand-content ${footer ? 'footer-brand-content' : ''}`}><img className="brand-logo" src={llanadaLogo} alt="La Llanada Venezuela" /><span className="brand-title"><strong>FORMACIÓN DE</strong><small>TRIBUS</small></span></span>
}

function Rating({ value, onChange, label }) {
  return <div className="rating" role="group" aria-label={label}>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={value === rating ? 'active' : ''} onClick={() => onChange(rating)} aria-label={`${rating} de 5`}>{rating}</button>)}</div>
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
  const [form, setForm] = useState(camper || emptyForm)
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const age = Number(form.age)
    if (name.length < 2) return setError('Escribe el nombre completo del campista.')
    if (!Number.isInteger(age) || age < 5 || age > 20) return setError('La edad debe estar entre 5 y 20 años.')
    onSave({ ...form, name, age })
  }
  return <form onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">Ficha de evaluación</span><h2>{camper ? 'Editar campista' : 'Nuevo campista'}</h2><p>Registra sus datos y califica cada aptitud.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={20} /></button></div>
    <div className="form-grid"><label className="field field-wide"><span>Nombre y apellido</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Sofía Herrera" /></label><label className="field"><span>Edad</span><div className="input-suffix"><input type="number" min="5" max="20" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} placeholder="12" /><small>años</small></div></label></div>
    <div className="skills-form"><div className="skills-title"><strong>Aptitudes</strong><span>1 = inicial · 5 = sobresaliente</span></div>{SKILLS.map(({ key, label, icon }) => <div className="skill-row" key={key}><div className="skill-name"><span>{icon}</span><strong>{label}</strong></div><Rating label={label} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} /></div>)}</div>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" type="submit"><Check size={18} /> {camper ? 'Guardar cambios' : 'Agregar campista'}</button></div>
  </form>
}

function ImportZone({ onImport }) {
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState(null)
  const load = async (file) => {
    if (!file) return
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
      const { campers, errors } = parseCampersFile(await file.text())
      const { added, duplicates } = onImport(campers)
      const details = [errors.length ? `${errors.length} fila(s) con errores` : '', duplicates ? `${duplicates} duplicado(s)` : ''].filter(Boolean).join(' · ')
      setNotice({ type: added ? 'success' : 'warning', text: `${added} campista(s) importados${details ? `. ${details}.` : '.'}` })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    }
  }
  return <div className="import-block">
    <label className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); load(event.dataTransfer.files[0]) }}>
      <input type="file" accept=".csv,.txt,.pdf,.xlsx" onChange={(event) => { load(event.target.files[0]); event.target.value = '' }} />
      <span className="drop-icon"><UploadCloud size={23} /></span><span><strong>Arrastra aquí la lista de campistas</strong><small>CSV con Nombre, Edad, Fuerza, Velocidad, Inteligencia, Creatividad y Liderazgo</small></span><span className="button secondary compact"><FileSpreadsheet size={16} /> Elegir archivo</span>
    </label>
    <div className="paper-note"><AlertTriangle size={17} /><span><strong>¿Usan la hoja impresa?</strong> Sí. Los evaluadores pueden llenarla en papel; después se transcribe o se carga el CSV. No es obligatorio usar el teléfono.</span></div>
    {notice && <div className={`import-notice ${notice.type}`}><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Cerrar"><X size={15} /></button></div>}
  </div>
}

function Tryouts({ campers, setCampers, onGoTribes }) {
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = campers.filter(({ name }) => name.toLowerCase().includes(query.toLowerCase()))
  const save = (camper) => {
    if (editing) setCampers((items) => items.map((item) => item.id === editing.id ? { ...camper, id: item.id } : item))
    else setCampers((items) => [...items, { ...camper, id: crypto.randomUUID() }])
    setModalOpen(false); setEditing(null)
  }
  const importCampers = (incoming) => {
    const known = new Set(campers.map(({ name, age }) => `${name.trim().toLowerCase()}|${age}`))
    const unique = incoming.filter(({ name, age }) => { const key = `${name.trim().toLowerCase()}|${age}`; if (known.has(key)) return false; known.add(key); return true })
    setCampers((items) => [...items, ...unique.map((camper) => ({ ...camper, id: crypto.randomUUID() }))])
    return { added: unique.length, duplicates: incoming.length - unique.length }
  }
  const addDemo = () => setCampers(DEMO_CAMPERS.map(([name, age, strength, speed, wit, creativity, leadership]) => ({ id: crypto.randomUUID(), name, age, strength, speed, wit, creativity, leadership })))

  return <>
    <section className="hero"><div><span className="eyebrow"><Sparkles size={14} /> Módulo de evaluación</span><h1>Conoce el talento de<br /><em>cada campista.</em></h1><p>Registra sus aptitudes para construir tribus más justas, diversas y equilibradas.</p></div><div className="hero-illustration" aria-hidden="true"><div className="sun" /><div className="mountain mountain-one" /><div className="mountain mountain-two" /><div className="flag">★</div><div className="trees">♠ ♠ ♠</div></div></section>
    <section className="stats-row"><article><span className="stat-icon green"><Users /></span><div><strong>{campers.length}</strong><small>Campistas registrados</small></div></article><article><span className="stat-icon gold"><BarChart3 /></span><div><strong>{campers.length ? (campers.reduce((total, camper) => total + camperAverage(camper), 0) / campers.length).toFixed(1) : '—'}</strong><small>Promedio de aptitudes</small></div></article><article><span className="stat-icon coral"><Trophy /></span><div><strong>16</strong><small>Tribus disponibles</small></div></article></section>
    <section className="panel roster-panel"><div className="panel-header"><div><span className="eyebrow">Base de campistas</span><h2>Participantes</h2><p>Administra las fichas antes de hacer la división.</p></div><button className="button primary" onClick={() => { setEditing(null); setModalOpen(true) }}><Plus size={18} /> Agregar campista</button></div>
      <ImportZone onImport={importCampers} />
      {campers.length ? <><div className="toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar campista..." /></div><span>{filtered.length} de {campers.length}</span></div><div className="table-wrap"><table><thead><tr><th>Campista</th><th>Edad</th>{SKILLS.map(({ key, label }) => <th key={key}>{label}</th>)}<th>Prom.</th><th /></tr></thead><tbody>{filtered.map((camper) => <tr key={camper.id}><td><span className="avatar">{initials(camper.name)}</span><strong>{camper.name}</strong></td><td>{camper.age} años</td>{SKILLS.map(({ key }) => <td key={key}><span className={`score score-${camper[key]}`}>{camper[key]}</span></td>)}<td><strong>{camperAverage(camper).toFixed(1)}</strong></td><td><div className="row-actions"><button onClick={() => { setEditing(camper); setModalOpen(true) }} title="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => setCampers((items) => items.filter(({ id }) => id !== camper.id))} title="Eliminar"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div></> : <div className="empty-state"><span><UserPlus size={34} /></span><h3>Tu lista está esperando aventureros</h3><p>Agrega el primer campista, arrastra un CSV o carga un grupo de ejemplo.</p><div><button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Agregar campista</button><button className="button secondary" onClick={addDemo}>Cargar datos de prueba</button></div></div>}
    </section>
    {campers.length > 0 && <div className="next-banner"><div><span><Sparkles size={22} /></span><div><strong>¿Todos listos?</strong><p>Cuando termines las evaluaciones, crea las 16 tribus equilibradas.</p></div></div><button className="button light" onClick={onGoTribes}>Ir a formar tribus <ArrowRight size={18} /></button></div>}
    {modalOpen && <Modal onClose={() => { setModalOpen(false); setEditing(null) }}><CamperForm camper={editing} onSave={save} onClose={() => { setModalOpen(false); setEditing(null) }} /></Modal>}
  </>
}

function Tribes({ campers, teams, generated, onGenerate, onMove }) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const balance = getBalanceScore(teams, campers)
  const selected = selectedIndex === null ? null : teams[selectedIndex]
  const dropMember = (event, targetIndex) => {
    event.preventDefault()
    const memberId = event.dataTransfer.getData('text/camper-id')
    const sourceIndex = Number(event.dataTransfer.getData('text/team-index'))
    if (memberId && Number.isInteger(sourceIndex)) onMove(memberId, sourceIndex, targetIndex)
  }
  return <>
    <section className="tribes-hero"><div><span className="eyebrow"><LayoutGrid size={14} /> Módulo de distribución</span><h1>16 tribus.<br /><em>Un solo campamento.</em></h1><p>El algoritmo distribuye edades y aptitudes usando las prioridades definidas para el campamento.</p><div className="hero-actions"><button className="button primary" disabled={!campers.length} onClick={onGenerate}>{generated ? <RefreshCw size={18} /> : <Sparkles size={18} />}{generated ? 'Generar otra distribución' : 'Formar las tribus'}</button><span><CircleHelp size={16} /> {campers.length ? `${campers.length} campistas listos` : 'Primero registra campistas en Tryouts'}</span></div></div><div className="balance-preview"><div className="balance-ring" style={{ '--score': generated ? balance : 0 }}><strong>{generated ? `${balance}%` : '—'}</strong><small>equilibrio</small></div><div><span>Mayor prioridad</span><strong>Edad + Velocidad</strong><small>50% de la clasificación</small></div></div></section>
    <section className="weights-panel"><div><span className="eyebrow">Criterios de balance</span><strong>Importancia relativa</strong></div><div className="weight-chips"><span>Edad + Velocidad <b>50%</b></span><span>Liderazgo <b>20%</b></span><span>Fuerza <b>15%</b></span><span>Creatividad <b>10%</b></span><span>Inteligencia <b>10%</b></span></div><small>Las prioridades se normalizan proporcionalmente porque los valores indicados suman 105%.</small></section>
    <section className="how-it-works"><span className="step"><b>1</b><span><strong>Leemos los perfiles</strong><small>Edad y aptitudes</small></span></span><ChevronRight /><span className="step"><b>2</b><span><strong>Aplicamos los pesos</strong><small>{BALANCE_DIMENSIONS.length} criterios</small></span></span><ChevronRight /><span className="step"><b>3</b><span><strong>Personalizas el resultado</strong><small>Cambios de último minuto</small></span></span></section>
    <section className="tribe-section"><div className="section-heading"><div><span className="eyebrow">Mapa de tribus</span><h2>{generated ? 'Distribución actual' : 'Las tribus del campamento'}</h2></div>{generated && <div className="result-legend"><span><i className="dot green-dot" /> Cambios manuales habilitados</span><span>Arrastra campistas entre tribus</span></div>}</div>
      {generated && <div className="customize-hint"><MoveRight size={18} /><span><strong>Esta distribución es editable.</strong> Abre una tribu para mover a un campista, o arrástralo directamente entre tarjetas.</span></div>}
      <div className="tribe-grid">{teams.map((team, teamIndex) => { const averages = teamAverages(team.members); return <article className={`tribe-card ${generated ? 'generated' : ''}`} key={team.name} style={{ '--tribe': team.color }} onClick={() => generated && setSelectedIndex(teamIndex)} onDragOver={(event) => generated && event.preventDefault()} onDrop={(event) => dropMember(event, teamIndex)}><div className="tribe-accent" /><div className="tribe-top"><span className="flag-emoji">{team.flag}</span><span className="member-count"><Users size={14} /> {team.members.length}</span></div><h3>{team.name}</h3>{generated ? <><div className="member-preview">{team.members.slice(0, 3).map((member) => <span draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/camper-id', member.id); event.dataTransfer.setData('text/team-index', String(teamIndex)) }} className="mini-avatar" title={`${member.name} · arrastra para mover`} key={member.id}>{initials(member.name)}</span>)}{team.members.length > 3 && <span className="mini-avatar more">+{team.members.length - 3}</span>}{!team.members.length && <small>Suelta un campista aquí</small>}</div><div className="tribe-metrics"><span>Edad <strong>{averages.age ? averages.age.toFixed(1) : '—'}</strong></span><span>Aptitud <strong>{averages.skills ? averages.skills.toFixed(1) : '—'}</strong></span></div></> : <p>Esperando distribución</p>} {generated && <button>Editar tribu <ChevronRight size={15} /></button>}</article> })}</div>
    </section>
    {selected && <Modal onClose={() => setSelectedIndex(null)}><div className="modal-heading team-modal-title"><div><span className="flag-emoji large">{selected.flag}</span><div><span className="eyebrow">Personalizar tribu</span><h2>{selected.name}</h2></div></div><button className="icon-button" onClick={() => setSelectedIndex(null)}><X size={20} /></button></div><p className="move-help">Selecciona otra tribu para mover a un campista. Los cambios se guardan automáticamente en este dispositivo.</p><div className="team-members">{selected.members.length ? selected.members.map((member) => <div key={member.id}><span className="avatar">{initials(member.name)}</span><div><strong>{member.name}</strong><small>{member.age} años · Promedio {camperAverage(member).toFixed(1)}</small></div><label className="move-select"><span>Mover a</span><select value={selectedIndex} onChange={(event) => onMove(member.id, selectedIndex, Number(event.target.value))}>{teams.map((team, index) => <option key={team.name} value={index}>{team.flag} {team.name}</option>)}</select></label></div>) : <div className="empty-mini">Esta tribu está vacía. Puedes arrastrar integrantes hasta su tarjeta.</div>}</div></Modal>}
  </>
}

export default function App() {
  const [active, setActive] = useState('tryouts')
  const [menuOpen, setMenuOpen] = useState(false)
  const [campers, setCampers] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } })
  const [assignments, setAssignments] = useState(() => { try { return reconcileAssignments(JSON.parse(localStorage.getItem(TEAMS_STORAGE_KEY)), campers) } catch { return null } })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(campers)) }, [campers])
  useEffect(() => { if (assignments) localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(assignments)); else localStorage.removeItem(TEAMS_STORAGE_KEY) }, [assignments])
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
  return <div className="app-shell"><header><button className="brand" onClick={() => setActive('tryouts')}><Brand /></button><nav className={menuOpen ? 'open' : ''}><button className={active === 'tryouts' ? 'active' : ''} onClick={() => { setActive('tryouts'); setMenuOpen(false) }}><UserPlus size={17} /> Tryouts</button><button className={active === 'tribes' ? 'active' : ''} onClick={() => { setActive('tribes'); setMenuOpen(false) }}><LayoutGrid size={17} /> Tribus</button></nav><div className="header-status"><span>{campers.length}</span><div><strong>Campistas</strong><small>{average ? `${average.toFixed(1)} prom.` : 'Sin evaluar'}</small></div></div><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></header><main>{active === 'tryouts' ? <Tryouts campers={campers} setCampers={updateCampers} onGoTribes={() => setActive('tribes')} /> : <Tribes campers={campers} teams={teams} generated={Boolean(assignments)} onGenerate={generate} onMove={move} />}</main><footer><span className="brand footer-brand"><Brand footer /></span><p>Equipos equilibrados. Experiencias inolvidables.</p><small>Los datos y los cambios de tribu se guardan en este dispositivo.</small></footer></div>
}
