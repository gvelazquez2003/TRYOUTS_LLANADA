import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, Check, ChevronRight, CircleHelp, Edit3, LayoutGrid, Menu, Plus, RefreshCw, Search, Sparkles, Trash2, Trophy, UserPlus, Users, X } from 'lucide-react'
import { balanceCampers, getBalanceScore, teamAverages } from './balance'
import { DEMO_CAMPERS, SKILLS, TRIBES } from './data'

const STORAGE_KEY = 'tribu-camp-campers-v1'
const emptyForm = { name: '', age: '', ...Object.fromEntries(SKILLS.map(({ key }) => [key, 3])) }
const camperAverage = (camper) => SKILLS.reduce((total, { key }) => total + camper[key], 0) / SKILLS.length

function Rating({ value, onChange, label }) {
  return (
    <div className="rating" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button key={rating} type="button" className={value === rating ? 'active' : ''} onClick={() => onChange(rating)} aria-label={`${rating} de 5`}>{rating}</button>
      ))}
    </div>
  )
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
  return (
    <form onSubmit={submit}>
      <div className="modal-heading"><div><span className="eyebrow">Ficha de evaluación</span><h2>{camper ? 'Editar campista' : 'Nuevo campista'}</h2><p>Registra sus datos y califica cada aptitud.</p></div><button className="icon-button" type="button" onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid">
        <label className="field field-wide"><span>Nombre y apellido</span><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Sofía Herrera" /></label>
        <label className="field"><span>Edad</span><div className="input-suffix"><input type="number" min="5" max="20" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="12" /><small>años</small></div></label>
      </div>
      <div className="skills-form"><div className="skills-title"><strong>Aptitudes</strong><span>1 = inicial · 5 = sobresaliente</span></div>{SKILLS.map(({ key, label, icon }) => <div className="skill-row" key={key}><div className="skill-name"><span>{icon}</span><strong>{label}</strong></div><Rating label={label} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} /></div>)}</div>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" type="submit"><Check size={18} /> {camper ? 'Guardar cambios' : 'Agregar campista'}</button></div>
    </form>
  )
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
  const addDemo = () => setCampers(DEMO_CAMPERS.map(([name, age, strength, speed, wit, creativity, leadership]) => ({ id: crypto.randomUUID(), name, age, strength, speed, wit, creativity, leadership })))

  return <>
    <section className="hero"><div><span className="eyebrow"><Sparkles size={14} /> Módulo de evaluación</span><h1>Conoce el talento de<br /><em>cada campista.</em></h1><p>Registra sus aptitudes para construir tribus más justas, diversas y equilibradas.</p></div><div className="hero-illustration" aria-hidden="true"><div className="sun" /><div className="mountain mountain-one" /><div className="mountain mountain-two" /><div className="flag">★</div><div className="trees">♠ ♠ ♠</div></div></section>
    <section className="stats-row"><article><span className="stat-icon green"><Users /></span><div><strong>{campers.length}</strong><small>Campistas registrados</small></div></article><article><span className="stat-icon gold"><BarChart3 /></span><div><strong>{campers.length ? camperAverage({ ...Object.fromEntries(SKILLS.map(({ key }) => [key, campers.reduce((t, c) => t + c[key], 0) / campers.length])) }).toFixed(1) : '—'}</strong><small>Promedio de aptitudes</small></div></article><article><span className="stat-icon coral"><Trophy /></span><div><strong>16</strong><small>Tribus disponibles</small></div></article></section>
    <section className="panel roster-panel"><div className="panel-header"><div><span className="eyebrow">Base de campistas</span><h2>Participantes</h2><p>Administra las fichas antes de hacer la división.</p></div><button className="button primary" onClick={() => { setEditing(null); setModalOpen(true) }}><Plus size={18} /> Agregar campista</button></div>
      {campers.length ? <><div className="toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campista..." /></div><span>{filtered.length} de {campers.length}</span></div><div className="table-wrap"><table><thead><tr><th>Campista</th><th>Edad</th>{SKILLS.map(({ key, label }) => <th key={key}>{label}</th>)}<th>Prom.</th><th /></tr></thead><tbody>{filtered.map((camper) => <tr key={camper.id}><td><span className="avatar">{camper.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><strong>{camper.name}</strong></td><td>{camper.age} años</td>{SKILLS.map(({ key }) => <td key={key}><span className={`score score-${camper[key]}`}>{camper[key]}</span></td>)}<td><strong>{camperAverage(camper).toFixed(1)}</strong></td><td><div className="row-actions"><button onClick={() => { setEditing(camper); setModalOpen(true) }} title="Editar"><Edit3 size={17} /></button><button className="danger" onClick={() => setCampers((items) => items.filter(({ id }) => id !== camper.id))} title="Eliminar"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div></> : <div className="empty-state"><span><UserPlus size={34} /></span><h3>Tu lista está esperando aventureros</h3><p>Agrega el primer campista o carga un grupo de ejemplo para explorar la aplicación.</p><div><button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Agregar campista</button><button className="button secondary" onClick={addDemo}>Cargar datos de prueba</button></div></div>}
    </section>
    {campers.length > 0 && <div className="next-banner"><div><span><Sparkles size={22} /></span><div><strong>¿Todos listos?</strong><p>Cuando termines las evaluaciones, crea las 16 tribus equilibradas.</p></div></div><button className="button light" onClick={onGoTribes}>Ir a formar tribus <ArrowRight size={18} /></button></div>}
    {modalOpen && <Modal onClose={() => { setModalOpen(false); setEditing(null) }}><CamperForm camper={editing} onSave={save} onClose={() => { setModalOpen(false); setEditing(null) }} /></Modal>}
  </>
}

function Tribes({ campers }) {
  const [teams, setTeams] = useState(() => balanceCampers([]))
  const [generated, setGenerated] = useState(false)
  const [selected, setSelected] = useState(null)
  const create = () => { setTeams(balanceCampers(campers)); setGenerated(true) }
  const balance = getBalanceScore(teams, campers)
  return <>
    <section className="tribes-hero"><div><span className="eyebrow"><LayoutGrid size={14} /> Módulo de distribución</span><h1>16 tribus.<br /><em>Un solo campamento.</em></h1><p>Nuestro algoritmo distribuye edades y aptitudes para que cada tribu tenga una mezcla justa de talentos.</p><div className="hero-actions"><button className="button primary" disabled={!campers.length} onClick={create}>{generated ? <RefreshCw size={18} /> : <Sparkles size={18} />}{generated ? 'Generar otra distribución' : 'Formar las tribus'}</button><span><CircleHelp size={16} /> {campers.length ? `${campers.length} campistas listos` : 'Primero registra campistas en Tryouts'}</span></div></div><div className="balance-preview"><div className="balance-ring" style={{ '--score': generated ? balance : 0 }}><strong>{generated ? `${balance}%` : '—'}</strong><small>equilibrio</small></div><div><span>Balanceamos</span><strong>Edad + 5 aptitudes</strong><small>y cantidad por tribu</small></div></div></section>
    <section className="how-it-works"><span className="step"><b>1</b><span><strong>Leemos los perfiles</strong><small>Edad y aptitudes</small></span></span><ChevronRight /><span className="step"><b>2</b><span><strong>Comparamos combinaciones</strong><small>120 distribuciones</small></span></span><ChevronRight /><span className="step"><b>3</b><span><strong>Elegimos la más justa</strong><small>Diferencia mínima</small></span></span></section>
    <section className="tribe-section"><div className="section-heading"><div><span className="eyebrow">Mapa de tribus</span><h2>{generated ? 'Distribución actual' : 'Las tribus del campamento'}</h2></div>{generated && <div className="result-legend"><span><i className="dot green-dot" /> Balance óptimo</span><span>Máx. {Math.ceil(campers.length / 16)} por tribu</span></div>}</div>
      <div className="tribe-grid">{teams.map((team) => { const averages = teamAverages(team.members); return <article className={`tribe-card ${generated ? 'generated' : ''}`} key={team.name} style={{ '--tribe': team.color }} onClick={() => generated && setSelected(team)}><div className="tribe-accent" /><div className="tribe-top"><span className="flag-emoji">{team.flag}</span><span className="member-count"><Users size={14} /> {team.members.length}</span></div><h3>{team.name}</h3>{generated ? <><div className="member-preview">{team.members.slice(0, 3).map((member) => <span className="mini-avatar" title={member.name} key={member.id}>{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>)}{team.members.length > 3 && <span className="mini-avatar more">+{team.members.length - 3}</span>}{!team.members.length && <small>Sin integrantes</small>}</div><div className="tribe-metrics"><span>Edad <strong>{averages.age ? averages.age.toFixed(1) : '—'}</strong></span><span>Aptitud <strong>{averages.skills ? averages.skills.toFixed(1) : '—'}</strong></span></div></> : <p>Esperando distribución</p>} {generated && <button>Ver tribu <ChevronRight size={15} /></button>}</article> })}</div>
    </section>
    {selected && <Modal onClose={() => setSelected(null)}><div className="modal-heading team-modal-title"><div><span className="flag-emoji large">{selected.flag}</span><div><span className="eyebrow">Integrantes de la tribu</span><h2>{selected.name}</h2></div></div><button className="icon-button" onClick={() => setSelected(null)}><X size={20} /></button></div><div className="team-members">{selected.members.length ? selected.members.map((member) => <div key={member.id}><span className="avatar">{member.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{member.name}</strong><small>{member.age} años · Promedio {camperAverage(member).toFixed(1)}</small></div><div className="member-skill-dots">{SKILLS.map(({ key, label }) => <i key={key} title={`${label}: ${member[key]}`} style={{ '--level': `${member[key] * 20}%` }} />)}</div></div>) : <div className="empty-mini">Esta tribu quedó vacía en esta distribución.</div>}</div></Modal>}
  </>
}

export default function App() {
  const [active, setActive] = useState('tryouts')
  const [menuOpen, setMenuOpen] = useState(false)
  const [campers, setCampers] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(campers)) }, [campers])
  const average = useMemo(() => campers.length ? campers.reduce((total, camper) => total + camperAverage(camper), 0) / campers.length : 0, [campers])
  return <div className="app-shell"><header><button className="brand" onClick={() => setActive('tryouts')}><span className="brand-mark"><i /><i /><i /></span><span><strong>TRIBU</strong><small>CAMP</small></span></button><nav className={menuOpen ? 'open' : ''}><button className={active === 'tryouts' ? 'active' : ''} onClick={() => { setActive('tryouts'); setMenuOpen(false) }}><UserPlus size={17} /> Tryouts</button><button className={active === 'tribes' ? 'active' : ''} onClick={() => { setActive('tribes'); setMenuOpen(false) }}><LayoutGrid size={17} /> Tribus</button></nav><div className="header-status"><span>{campers.length}</span><div><strong>Campistas</strong><small>{average ? `${average.toFixed(1)} prom.` : 'Sin evaluar'}</small></div></div><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></header><main>{active === 'tryouts' ? <Tryouts campers={campers} setCampers={setCampers} onGoTribes={() => setActive('tribes')} /> : <Tribes campers={campers} />}</main><footer><div className="brand footer-brand"><span className="brand-mark"><i /><i /><i /></span><span><strong>TRIBU</strong><small>CAMP</small></span></div><p>Equipos equilibrados. Experiencias inolvidables.</p><small>Los datos se guardan de forma segura en este dispositivo.</small></footer></div>
}
