import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Leaf,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { AVATAR_COLORS, TEAM_MEMBERS, getInitials } from '../demoData.js';
import { BotanicalSprig } from './Icons.jsx';

export function InicioView({
  activeMember,
  people,
  logs,
  events,
  todayLabel,
  onNavigate,
  onSelectPerson,
  onOpenLog,
  onOpenNewEvent,
  formatShortDate,
}) {
  const firstName = activeMember.name.split(' ')[0];
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.actualizada) - new Date(a.actualizada))
    .slice(0, 5);
  const upcomingEvents = [...events]
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio))
    .slice(0, 4);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="green-dot" aria-hidden="true" />
            {todayLabel}
          </p>
          <h1>Un buen día para acompañar.</h1>
          <p>Hola, {firstName}. Todo lo que tu equipo necesita, más cerca.</p>
        </div>
        <button className="btn btn-outline-card" type="button" onClick={() => onNavigate('calendario')}>
          <CalendarDays size={15} /> Ver calendario <ArrowUpRight size={14} />
        </button>
      </div>

      <section className="welcome-banner" aria-label="Bienvenida">
        <div className="banner-copy">
          <p className="eyebrow">CONECTADOS PARA CUIDAR MEJOR</p>
          <h2>Cada registro cuenta. Cada persona, también.</h2>
          <p>
            Un mismo espacio para compartir avances, dar continuidad y acompañar en equipo.
          </p>
          <button type="button" onClick={() => onNavigate('usuarios')}>
            Explorar usuarios <ArrowRight size={14} />
          </button>
        </div>

        <div className="banner-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="floating-label label-a">
            <BookOpen size={14} />
            Bitácoras al día
            <span className="mini-check">
              <Check size={10} />
            </span>
          </div>

          <div className="illustration-card">
            <div className="illus-top">
              <span className="illus-avatar">EM</span>
              <div>
                <b>Elena Martínez</b>
                <small>Un acompañamiento compartido</small>
              </div>
              <span className="illus-leaf">
                <Leaf size={17} />
              </span>
            </div>
            <div className="illus-line w80" />
            <div className="illus-line w60" />
            <div className="illus-line w90" />
            <div className="illus-bottom">
              <span className="overlap-avatar">CT</span>
              <span className="overlap-avatar blue">DR</span>
              <span className="overlap-avatar peach">VS</span>
              <small>Un equipo, una mirada</small>
            </div>
          </div>

          <div className="floating-label label-b">
            <Sparkles size={15} />
            Información que conecta
          </div>

          <BotanicalSprig />
        </div>
      </section>

      <section className="stats-grid" aria-label="Indicadores">
        <button type="button" className="stat-card" onClick={() => onNavigate('usuarios')}>
          <span className="stat-icon stat-green">
            <Users size={18} />
          </span>
          <div className="stat-meta">
            <span>Usuarios acompañados</span>
            <b>{people.length}</b>
          </div>
          <ArrowUpRight size={15} className="stat-arrow" />
        </button>

        <button type="button" className="stat-card" onClick={() => onNavigate('bitacoras')}>
          <span className="stat-icon stat-peach">
            <BookOpen size={18} />
          </span>
          <div className="stat-meta">
            <span>Bitácoras compartidas</span>
            <b>{logs.length}</b>
          </div>
          <ArrowUpRight size={15} className="stat-arrow" />
        </button>

        <button type="button" className="stat-card" onClick={() => onNavigate('calendario')}>
          <span className="stat-icon stat-lavender">
            <CalendarDays size={18} />
          </span>
          <div className="stat-meta">
            <span>Próximos eventos</span>
            <b>{events.length}</b>
          </div>
          <ArrowUpRight size={15} className="stat-arrow" />
        </button>
      </section>

      <div className="dashboard-columns">
        <section className="panel" aria-label="Bitácoras recientes">
          <div className="panel-title">
            <div>
              <h2>Retoma donde lo dejaste</h2>
              <p className="panel-subtitle">Las últimas bitácoras del equipo.</p>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate('bitacoras')}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bitácora</th>
                  <th>Usuario</th>
                  <th>Última actualización</th>
                  <th aria-label="Abrir" />
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      No hay bitácoras registradas todavía.
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id} className="clickable-row" onClick={() => onOpenLog(log)}>
                      <td>
                        <div className="doc-cell">
                          <span className="document-icon">
                            <FileText size={14} />
                          </span>
                          <div>
                            <strong className="cell-title">{log.titulo}</strong>
                            <small className="cell-sub">{log.area || 'Seguimiento'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{log.persona_nombre || `Usuario ${log.persona_id}`}</td>
                      <td>
                        <div>{formatShortDate(log.actualizada)}</div>
                        <small className="cell-sub">por {log.author || 'Equipo'}</small>
                      </td>
                      <td className="right-cell">
                        <ArrowUpRight size={14} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" aria-label="Agenda próxima">
          <div className="panel-title">
            <h2>En la agenda</h2>
            <button
              type="button"
              className="icon-button subtle"
              onClick={onOpenNewEvent}
              aria-label="Crear evento"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="agenda-list">
            {upcomingEvents.length === 0 ? (
              <p className="muted padded">Sin eventos programados.</p>
            ) : (
              upcomingEvents.map((event) => {
                const startDate = new Date(event.inicio);
                const day = startDate.toLocaleDateString('es-CL', {
                  timeZone: 'America/Santiago',
                  day: '2-digit',
                });
                const month = startDate.toLocaleDateString('es-CL', {
                  timeZone: 'America/Santiago',
                  month: 'short',
                });
                const time = startDate.toLocaleTimeString('es-CL', {
                  timeZone: 'America/Santiago',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    type="button"
                    className="agenda-row"
                    key={event.id}
                    onClick={() => onNavigate('calendario')}
                  >
                    <div className="date-square">
                      <strong>{day}</strong>
                      <span>{month}</span>
                    </div>
                    <div className="agenda-info">
                      <strong>{event.titulo}</strong>
                      <small>{time} · {event.descripcion || event.responsable}</small>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="people-strip" aria-label="Acceso rápido a personas">
        <div className="strip-heading">
          <h2>Acompañamiento activo</h2>
          <button type="button" className="text-link" onClick={() => onNavigate('usuarios')}>
            Ver todos los usuarios <ArrowRight size={14} />
          </button>
        </div>
        <div className="quick-people">
          {people.slice(0, 4).map((person, index) => (
            <button
              type="button"
              className="quick-person-card"
              key={person.id}
              onClick={() => onSelectPerson(person.id)}
            >
              <span className={`person-avatar avatar-${person.color || AVATAR_COLORS[index % 4]}`}>
                {person.initials || getInitials(person.nombre)}
              </span>
              <div>
                <strong>{person.nombre}</strong>
                <small>{person.total_bitacoras} bitácoras</small>
              </div>
              <ArrowUpRight size={14} className="muted-arrow" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export function UsuariosView({
  people,
  search,
  onSearchChange,
  programFilter,
  onProgramFilterChange,
  onSelectPerson,
  onNewPerson,
}) {
  const programs = Array.from(new Set(people.map((p) => p.program || 'Seguimiento CEMIPRE')));
  const filtered = people.filter((person) => {
    const matchesQuery = `${person.codigo} ${person.nombre} ${person.program || ''}`
      .toLocaleLowerCase('es')
      .includes(search.toLocaleLowerCase('es'));
    const matchesProgram = !programFilter || (person.program || 'Seguimiento CEMIPRE') === programFilter;
    return matchesQuery && matchesProgram;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DIRECTORIO DE USUARIOS</p>
          <h1>Usuarios en seguimiento</h1>
          <p>Selecciona a una persona para acceder a sus bitácoras y resumen integral.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={onNewPerson}>
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={15} />
          <input
            type="search"
            placeholder="Buscar por nombre, código o programa…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <select
          className="filter-select"
          aria-label="Filtrar por programa"
          value={programFilter}
          onChange={(e) => onProgramFilterChange(e.target.value)}
        >
          <option value="">Todos los programas</option>
          {programs.map((prog) => (
            <option key={prog} value={prog}>
              {prog}
            </option>
          ))}
        </select>
        <span className="count-badge">{filtered.length} usuarios</span>
      </div>

      {filtered.length === 0 ? (
        <div className="panel empty-state">
          No se encontraron usuarios con esos filtros.
        </div>
      ) : (
        <div className="people-grid">
          {filtered.map((person, index) => (
            <button
              type="button"
              className="person-card"
              key={person.id}
              onClick={() => onSelectPerson(person.id)}
            >
              <div className="person-card-top">
                <span className={`person-avatar lg avatar-${person.color || AVATAR_COLORS[index % 4]}`}>
                  {person.initials || getInitials(person.nombre)}
                </span>
                <span className="code-pill">{person.codigo}</span>
              </div>
              <small className="person-program">{person.program || 'Programa de acompañamiento'}</small>
              <h3>{person.nombre}</h3>
              <div className="person-card-footer">
                <span className="status-pill">Al día · {person.total_bitacoras} bitácoras</span>
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function UsuarioDetailView({
  person,
  personLogs,
  summary,
  onBack,
  onNewLog,
  onOpenLog,
  onOpenSummary,
  formatShortDate,
}) {
  if (!person) {
    return <div className="panel empty-state">Cargando perfil del usuario…</div>;
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={14} /> Volver a usuarios
      </button>

      <section className="person-hero panel">
        <div className="person-hero-left">
          <span className={`person-avatar xl avatar-${person.color || 'peach'}`}>
            {person.initials || getInitials(person.nombre)}
          </span>
          <div>
            <p className="eyebrow">{person.codigo} · {person.program || 'Seguimiento CEMIPRE'}</p>
            <h1>{person.nombre}</h1>
            <p className="muted">
              {personLogs.length} bitácoras registradas · Ingreso {person.joined || '2026'}
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-secondary" onClick={onNewLog}>
            <Plus size={15} /> Agregar bitácora
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onOpenSummary(person.id)}>
            <Sparkles size={15} /> Ver resumen IA
          </button>
        </div>
      </section>

      <div className="detail-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Bitácoras del usuario</h2>
              <p className="panel-subtitle">Haz clic para configurar el enlace o abrir el Google Doc.</p>
            </div>
            <span className="count-badge">{personLogs.length} fichas</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Bitácora</th>
                  <th>Google Docs</th>
                  <th>Actualizada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="doc-cell">
                        <span className="document-icon">
                          <FileText size={14} />
                        </span>
                        <div>
                          <strong className="cell-title">{log.titulo}</strong>
                          <small className="cell-sub">{log.area || 'Seguimiento'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${log.url_docs ? '' : 'pending'}`}>
                        {log.url_docs ? 'Vinculado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>{formatShortDate(log.actualizada)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-tiny" onClick={() => onOpenLog(log)}>
                          Abrir ficha
                        </button>
                        {log.url_docs && (
                          <a
                            className="btn btn-tiny btn-green-outline"
                            href={log.url_docs}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Docs <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="detail-side">
          <div className="soft-card">
            <div className="soft-card-head">
              <Sparkles size={16} />
              <strong>Síntesis de seguimiento</strong>
            </div>
            <p className="muted">
              {summary
                ? summary.advertencia
                : 'Genera una vista resumida combinando las bitácoras registradas de este usuario.'}
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => onOpenSummary(person.id)}
            >
              Abrir en Resúmenes IA
            </button>
          </div>

          <div className="panel team-panel">
            <div className="panel-title">
              <h2>Equipo a cargo</h2>
            </div>
            <div className="team-list">
              {TEAM_MEMBERS.slice(0, 3).map((member) => (
                <div className="team-row" key={member.id}>
                  <span className="mini-avatar">{member.initials}</span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export function ResumenesIAView({
  people,
  selectedPersonId,
  summary,
  loadingSummary,
  onSelectPerson,
  onGenerateSummary,
  onNavigateToPerson,
}) {
  const currentPerson = people.find((p) => p.id === selectedPersonId) || people[0] || null;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ASISTENTE DE LECTURA</p>
          <h1>Resúmenes integrales</h1>
          <p>Panorama consolidado del historial de bitácoras por persona usuaria.</p>
        </div>
        {currentPerson && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={loadingSummary}
            onClick={() => onGenerateSummary(currentPerson.id)}
          >
            <Sparkles size={15} /> {loadingSummary ? 'Generando…' : 'Generar resumen'}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <label className="select-field-inline">
          <span>Persona usuaria:</span>
          <select
            className="filter-select"
            value={currentPerson?.id || ''}
            onChange={(e) => onSelectPerson(Number(e.target.value))}
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.nombre} ({person.codigo})
              </option>
            ))}
          </select>
        </label>
        {currentPerson && (
          <button
            type="button"
            className="text-link"
            onClick={() => onNavigateToPerson(currentPerson.id)}
          >
            Ver perfil y bitácoras <ArrowRight size={14} />
          </button>
        )}
      </div>

      {!currentPerson ? (
        <div className="panel empty-state">No hay usuarios disponibles.</div>
      ) : (
        <section className="panel ai-summary-panel">
          <div className="ai-hero">
            <span className="spark-box">
              <Sparkles size={20} />
            </span>
            <div>
              <span className="tiny-new inline-tag">IA · DEMO TEMPORAL</span>
              <h2>Resumen integral de {currentPerson.nombre}</h2>
              <p className="muted">
                {summary
                  ? summary.advertencia
                  : 'Presiona "Generar resumen" para revisar la síntesis de demostración desde los registros disponibles.'}
              </p>
            </div>
          </div>

          {summary ? (
            <div className="ai-sections">
              {summary.secciones.map((section, idx) => (
                <article className="ai-section-card" key={`${section.titulo}-${idx}`}>
                  <div className="ai-section-head">
                    <strong>{section.titulo}</strong>
                    <span className="status-pill">Fuente: Bitácora</span>
                  </div>
                  <p>{section.texto}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Selecciona un usuario y haz clic en <strong>Generar resumen</strong> para ver el informe agrupado por bitácora.
            </div>
          )}
        </section>
      )}
    </>
  );
}
