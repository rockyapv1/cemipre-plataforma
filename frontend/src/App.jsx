import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import CarpetasDriveView from './components/CarpetasDriveView.jsx';

const TABS = [
  { id: 'bitacoras', label: 'Bitácoras', symbol: '▦' },
  { id: 'calendario', label: 'Calendario', symbol: '▤' },
  { id: 'actividad', label: 'Actividad', symbol: '◎' },
  { id: 'drive', label: 'Carpetas Drive', symbol: '▣' },
];

const formatDate = (iso) => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(iso));

const formatDateTime = (iso) => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', day: '2-digit', month: 'short',
  hour: '2-digit', minute: '2-digit',
}).format(new Date(iso));

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Notice({ children, kind = 'info' }) {
  return <div className={`notice notice-${kind}`} role="status">{children}</div>;
}

function FormActions({ onCancel, saving, action = 'Guardar' }) {
  return (
    <div className="form-actions">
      <button className="btn btn-ghost" type="button" onClick={onCancel}>Cancelar</button>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Guardando…' : action}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('bitacoras');
  const [people, setPeople] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [person, setPerson] = useState(null);
  const [events, setEvents] = useState([]);
  const [changes, setChanges] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);

  const visiblePeople = useMemo(() => people.filter((p) =>
    `${p.codigo} ${p.nombre}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')),
  ), [people, search]);

  const totalLogs = people.reduce((total, p) => total + p.total_bitacoras, 0);

  async function loadOverview() {
    const [peopleData, eventsData, activityData] = await Promise.all([
      api.users(), api.events(), api.activity(),
    ]);
    setPeople(peopleData.personas);
    setEvents(eventsData.eventos);
    setChanges(activityData.actividad);
    setSelectedId((old) => old ?? peopleData.personas[0]?.id ?? null);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [peopleData, eventsData, activityData] = await Promise.all([
          api.users(), api.events(), api.activity(),
        ]);
        if (ignore) return;
        setPeople(peopleData.personas);
        setEvents(eventsData.eventos);
        setChanges(activityData.actividad);
        setSelectedId(peopleData.personas[0]?.id ?? null);
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setBusy(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (selectedId === null) { setPerson(null); return; }
    let ignore = false;
    setSummary(null);
    api.user(selectedId).then((data) => { if (!ignore) setPerson(data); })
      .catch((e) => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [selectedId, reload]);

  async function mutation(fn, success) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await fn();
      await loadOverview();
      setReload((n) => n + 1);
      setMessage(success);
      setModal(null);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  function openModal(type, data = {}) {
    setError('');
    setForm(data);
    setModal(type);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitModal(event) {
    event.preventDefault();
    if (modal === 'new-person') {
      const result = await mutation(() => api.createUser({
        codigo: (form.codigo || '').trim(), nombre: (form.nombre || '').trim(),
      }), 'Usuario agregado correctamente.');
      if (result) { setSelectedId(result.id); setTab('bitacoras'); }
    }
    if (modal === 'new-log' && selectedId !== null) {
      await mutation(() => api.createLog({
        persona_id: selectedId, titulo: form.titulo || '', url_docs: (form.url_docs || '').trim(),
      }), 'Bitácora registrada.');
    }
    if (modal === 'edit-log') {
      await mutation(() => api.updateLog(form.id, {
        titulo: form.titulo || '', url_docs: (form.url_docs || '').trim(),
      }), 'Datos de la bitácora actualizados.');
    }
    if (modal === 'new-event') {
      if (!form.inicio || !form.fin) {
        setError('Debes indicar fecha y hora de inicio y fin.');
        return;
      }
      const start = new Date(form.inicio);
      const end = new Date(form.fin);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError('Fecha u hora inválida.');
        return;
      }
      await mutation(() => api.createEvent({
        titulo: form.titulo || '', descripcion: form.descripcion || '',
        responsable: form.responsable || 'Equipo CEMIPRE',
        inicio: start.toISOString(), fin: end.toISOString(),
      }), 'Evento creado en el calendario local.');
    }
  }

  async function showSummary() {
    if (selectedId === null) return;
    setError('');
    try { setSummary(await api.summary(selectedId)); }
    catch (e) { setError(e.message); }
  }

  async function removeEvent(event) {
    if (!window.confirm(`¿Eliminar el evento «${event.titulo}»?`)) return;
    await mutation(() => api.deleteEvent(event.id), 'Evento eliminado.');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <div className="brand-symbol" aria-hidden="true">C</div>
          <div><strong>CEMIPRE</strong><span>Plataforma de bitácoras</span></div>
        </div>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <nav className="navigation" aria-label="Secciones">
          {TABS.map((item) => (
            <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`}
              type="button" onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-indicator" aria-hidden="true" />
          <div><strong>Modo demostración</strong><span>Sin cuentas ni datos reales</span></div>
        </div>
      </aside>

      <main id="contenido" className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Panel de trabajo <span>/</span> <strong>{TABS.find((t) => t.id === tab)?.label}</strong></div>
          <div className="top-actions"><span className="demo-chip">● ENTORNO LOCAL</span><span className="avatar" aria-label="Equipo de prueba">EQ</span></div>
        </header>

        <div className="page-body">
          <div className="page-heading">
            <div>
              <p className="eyebrow">ORGANIZACIÓN · CEMIPRE</p>
              <h1>{tab === 'bitacoras' ? 'Gestión de bitácoras' : tab === 'calendario' ? 'Calendario compartido' : tab === 'drive' ? 'Sincronización de Drive' : 'Registro de actividad'}</h1>
              <p className="subtitle">{tab === 'bitacoras'
                ? 'Accede a las bitácoras y administra sus enlaces a Google Docs.'
                : tab === 'calendario' ? 'Agenda de demostración guardada en la base de datos local.'
                  : tab === 'drive' ? 'Consulta el estado y sincroniza los metadatos de Google Drive.'
                  : 'Historial de cambios hechos dentro de esta plataforma.'}</p>
            </div>
            {tab === 'bitacoras' && <button className="btn btn-primary" type="button" onClick={() => openModal('new-person')}>+ Nuevo usuario</button>}
            {tab === 'calendario' && <button className="btn btn-primary" type="button" onClick={() => openModal('new-event')}>+ Crear evento</button>}
          </div>

          <Notice kind="warn"><strong>Prototipo con datos ficticios.</strong> Aún no se conecta con Google Drive, Google Docs, IA ni correo electrónico. No lo publiques con información real sin implementar autenticación y permisos.</Notice>
          {error && <Notice kind="error">{error} <button className="inline-button" type="button" onClick={() => setError('')}>Cerrar</button></Notice>}
          {message && <Notice kind="success">{message} <button className="inline-button" type="button" onClick={() => setMessage('')}>Cerrar</button></Notice>}

          {busy ? <div className="empty-state">Cargando información…</div> : (
            <>
              <section className="stats" aria-label="Indicadores">
                <div className="stat-card"><span>Usuarios registrados</span><strong>{people.length}</strong><small>En el sistema de prueba</small></div>
                <div className="stat-card"><span>Bitácoras</span><strong>{totalLogs}</strong><small>Documentos por vincular</small></div>
                <div className="stat-card"><span>Eventos</span><strong>{events.length}</strong><small>Calendario local</small></div>
              </section>

              {tab === 'bitacoras' && (
                <div className="content-grid">
                  <section className="panel people-panel" aria-label="Lista de usuarios">
                    <div className="panel-title"><h2>Usuarios</h2><span className="count-pill">{people.length}</span></div>
                    <label className="search-field">
                      <span className="sr-only">Buscar usuario por nombre o código</span>
                      <span aria-hidden="true">⌕</span>
                      <input type="search" placeholder="Buscar usuario…" value={search}
                        onChange={(e) => setSearch(e.target.value)} />
                    </label>
                    <div className="people-list">
                      {visiblePeople.length === 0 ? <p className="muted padded">Sin resultados. Puedes crear un usuario nuevo.</p> : visiblePeople.map((p) => (
                        <button type="button" key={p.id}
                          className={`person-row ${selectedId === p.id ? 'selected' : ''}`}
                          onClick={() => setSelectedId(p.id)}>
                          <span className="person-avatar">{p.codigo.slice(-2)}</span>
                          <span className="person-info"><strong>{p.nombre}</strong><small>{p.codigo} · {p.total_bitacoras} bitácoras</small></span>
                          <span className="chevron" aria-hidden="true">›</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="panel detail-panel" aria-label="Detalle de bitácoras">
                    {!person ? <div className="empty-state">Selecciona un usuario para ver sus bitácoras.</div> : (
                      <>
                        <div className="detail-heading">
                          <div className="title-with-icon"><div className="detail-avatar">{person.codigo.slice(-2)}</div>
                            <div><p className="eyebrow">{person.codigo}</p><h2>{person.nombre}</h2><p className="muted">{person.bitacoras.length} bitácoras registradas</p></div>
                          </div>
                          <button className="btn btn-secondary" type="button" onClick={() => openModal('new-log')}>+ Agregar bitácora</button>
                        </div>
                        <div className="section-heading"><h3>Documentos y registros</h3><span>{person.bitacoras.length} documentos</span></div>
                        {person.bitacoras.length === 0 ? <div className="empty-state">Este usuario aún no tiene bitácoras.</div> : (
                          <div className="logs-list">{person.bitacoras.map((b) => (
                            <article className="log-row" key={b.id}>
                              <span className="doc-icon" aria-hidden="true">≡</span>
                              <div className="log-body"><strong>{b.titulo}</strong><small>Actualización de ficha: {formatDate(b.actualizada)}</small>
                                <span className={`link-status ${b.url_docs ? 'linked' : ''}`}>{b.url_docs ? '● Enlace a Google Docs agregado' : '○ Sin documento vinculado'}</span>
                              </div>
                              <div className="log-actions">
                                <button className="btn btn-tiny" type="button" onClick={() => openModal('edit-log', b)}>Configurar</button>
                                {b.url_docs && <a className="btn btn-tiny btn-outline" target="_blank" rel="noopener noreferrer" href={b.url_docs}>Abrir ↗</a>}
                              </div>
                            </article>
                          ))}</div>
                        )}
                        <div className="summary-card">
                          <div className="summary-top"><span className="sparkle" aria-hidden="true">✧</span>
                            <div><h3>Resumen por usuario</h3><p>Vista local de ejemplo. La generación mediante IA todavía no está integrada.</p></div>
                            <button className="btn btn-secondary" type="button" onClick={showSummary}>Ver demo</button>
                          </div>
                          {summary && <div className="summary-result">
                            <strong>Resumen ilustrativo · {summary.cantidad_bitacoras} bitácoras</strong>
                            <p className="muted">{summary.advertencia}</p>
                            <ul>{summary.secciones.map((s, i) => <li key={`${s.titulo}-${i}`}><strong>{s.titulo}:</strong> {s.texto}</li>)}</ul>
                          </div>}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              )}

              {tab === 'calendario' && (
                <section className="panel wide-panel">
                  <div className="panel-title"><h2>Eventos programados</h2><span className="count-pill">{events.length}</span></div>
                  <p className="muted">Los eventos se guardan en SQLite. Todavía no se sincronizan con Google Calendar.</p>
                  {events.length === 0 ? <div className="empty-state">No hay eventos. Crea el primero para comenzar.</div> : (
                    <div className="event-list">{events.map((event) => (
                      <article className="event-row" key={event.id}>
                        <div className="event-date"><strong>{new Date(event.inicio).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: '2-digit' })}</strong><span>{new Date(event.inicio).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', month: 'short' })}</span></div>
                        <div className="event-body"><h3>{event.titulo}</h3><p>{formatDateTime(event.inicio)} – {formatDateTime(event.fin)}</p>
                          <p>{event.responsable}{event.descripcion ? ` · ${event.descripcion}` : ''}</p></div>
                        <button className="btn btn-tiny" type="button" onClick={() => removeEvent(event)}>Eliminar</button>
                      </article>
                    ))}</div>
                  )}
                </section>
              )}

              {tab === 'drive' && <CarpetasDriveView />}

              {tab === 'actividad' && (
                <section className="panel wide-panel">
                  <div className="panel-title"><h2>Últimos movimientos</h2><span className="count-pill">{changes.length}</span></div>
                  <Notice>Este historial registra cambios de usuarios, enlaces, bitácoras y eventos hechos en esta aplicación. <strong>No registra cambios dentro de Google Docs ni envía emails.</strong></Notice>
                  {changes.length === 0 ? <div className="empty-state">Todavía no hay movimientos registrados.</div> : (
                    <div className="activity-list">{changes.map((item) => (
                      <div className="activity-row" key={item.id}><span className="timeline-dot" aria-hidden="true" />
                        <div><strong>{item.descripcion}</strong><small>{formatDateTime(item.fecha)}</small></div></div>
                    ))}</div>
                  )}
                </section>
              )}
            </>
          )}
          <footer className="footer">CEMIPRE · Proyecto colaborativo universitario · Datos ficticios para desarrollo</footer>
        </div>
      </main>

      {modal && <Modal title={{ 'new-person': 'Registrar usuario', 'new-log': 'Agregar bitácora', 'edit-log': 'Configurar bitácora', 'new-event': 'Crear evento' }[modal]}
        onClose={() => setModal(null)}>
        <form onSubmit={submitModal} className="form-grid">
          {error && <Notice kind="error">{error}</Notice>}
          {modal === 'new-person' && <>
            <label>Código de usuario<input autoFocus maxLength={32} required placeholder="Ej.: USR-004" value={form.codigo || ''} onChange={(e) => updateField('codigo', e.target.value)} /></label>
            <label>Nombre identificador<input maxLength={120} required placeholder="Ej.: Usuario 004" value={form.nombre || ''} onChange={(e) => updateField('nombre', e.target.value)} /></label>
            <Notice kind="warn">Usa únicamente identidades inventadas mientras no existan controles de acceso.</Notice>
          </>}
          {(modal === 'new-log' || modal === 'edit-log') && <>
            <label>Nombre de la bitácora<input autoFocus maxLength={160} required placeholder="Ej.: Seguimiento general" value={form.titulo || ''} onChange={(e) => updateField('titulo', e.target.value)} /></label>
            <label>Enlace de Google Docs (opcional)<input type="url" placeholder="https://docs.google.com/document/d/.../edit" value={form.url_docs || ''} onChange={(e) => updateField('url_docs', e.target.value)} /></label>
            <p className="form-hint">El enlace solo se guarda como referencia. La edición se realizará en Google Docs con los permisos existentes.</p>
          </>}
          {modal === 'new-event' && <>
            <label>Nombre del evento<input autoFocus maxLength={160} required placeholder="Ej.: Reunión de equipo" value={form.titulo || ''} onChange={(e) => updateField('titulo', e.target.value)} /></label>
            <div className="two-fields"><label>Inicio<input required type="datetime-local" value={form.inicio || ''} onChange={(e) => updateField('inicio', e.target.value)} /></label>
              <label>Fin<input required type="datetime-local" value={form.fin || ''} onChange={(e) => updateField('fin', e.target.value)} /></label></div>
            <label>Responsable<input maxLength={120} value={form.responsable || ''} placeholder="Equipo CEMIPRE" onChange={(e) => updateField('responsable', e.target.value)} /></label>
            <label>Descripción (opcional)<textarea maxLength={2000} rows={3} value={form.descripcion || ''} onChange={(e) => updateField('descripcion', e.target.value)} /></label>
          </>}
          <FormActions saving={saving} onCancel={() => setModal(null)} action={modal === 'new-event' ? 'Crear evento' : 'Guardar'} />
        </form>
      </Modal>}
    </div>
  );
}
