import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  Mail,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { GoogleDriveIcon } from './Icons.jsx';

export function BitacorasView({
  logs,
  people,
  favorites,
  onlyFavorites = false,
  onToggleFavorite,
  onOpenLog,
  onNewLog,
  formatShortDate,
}) {
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [favFilter, setFavFilter] = useState(onlyFavorites);

  const areas = Array.from(new Set(logs.map((l) => l.area || 'Seguimiento')));

  const filtered = logs.filter((log) => {
    const matchesSearch = `${log.titulo} ${log.persona_nombre} ${log.area || ''}`
      .toLocaleLowerCase('es')
      .includes(search.toLocaleLowerCase('es'));
    const matchesPerson = !personFilter || String(log.persona_id) === String(personFilter);
    const matchesArea = !areaFilter || (log.area || 'Seguimiento') === areaFilter;
    const matchesFav = !(onlyFavorites || favFilter) || favorites.has(log.id);
    return matchesSearch && matchesPerson && matchesArea && matchesFav;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{onlyFavorites ? 'ACCESO RÁPIDO' : 'REPOSITORIO CENTRAL'}</p>
          <h1>{onlyFavorites ? 'Mis favoritos' : 'Bitácoras del equipo'}</h1>
          <p>
            {onlyFavorites
              ? 'Bitácoras marcadas para seguimiento prioritario.'
              : 'Todas las bitácoras organizadas por usuario y vinculadas a Google Docs.'}
          </p>
        </div>
        {!onlyFavorites && (
          <button type="button" className="btn btn-primary" onClick={onNewLog}>
            <Plus size={15} /> Agregar bitácora
          </button>
        )}
      </div>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={15} />
          <input
            type="search"
            placeholder="Buscar bitácora o persona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="filter-select"
          aria-label="Filtrar por usuario"
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
        >
          <option value="">Todos los usuarios</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.nombre}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label="Filtrar por área"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
        >
          <option value="">Todas las áreas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        {!onlyFavorites && (
          <button
            type="button"
            className={`btn btn-filter ${favFilter ? 'active' : ''}`}
            onClick={() => setFavFilter((prev) => !prev)}
          >
            <Star size={14} /> Favoritos
          </button>
        )}
        <span className="count-badge">{filtered.length} bitácoras</span>
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bitácora</th>
                <th>Usuario</th>
                <th>Última actualización</th>
                <th>Estado Docs</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No hay bitácoras que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isFav = favorites.has(log.id);
                  return (
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
                      <td>{log.persona_nombre || `Usuario ${log.persona_id}`}</td>
                      <td>
                        <div>{formatShortDate(log.actualizada)}</div>
                        <small className="cell-sub">por {log.author || 'Equipo'}</small>
                      </td>
                      <td>
                        <span className={`status-pill ${log.url_docs ? '' : 'pending'}`}>
                          {log.url_docs ? 'Al día · Docs' : 'Sin enlace'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className={`star-button ${isFav ? 'starred' : ''}`}
                            aria-label={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                            onClick={() => onToggleFavorite(log.id)}
                          >
                            <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                          </button>
                          <button type="button" className="btn btn-tiny" onClick={() => onOpenLog(log)}>
                            Ficha
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function CalendarioView({
  events,
  isSupabaseConfigured,
  onNewEvent,
  onDeleteEvent,
  formatDateTime,
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const eventsByDay = events.reduce((acc, event) => {
    const d = new Date(event.inicio);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      acc[dayNum] = [...(acc[dayNum] || []), event];
    }
    return acc;
  }, {});

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">AGENDA COMPARTIDA</p>
          <h1>Calendario del equipo</h1>
          <p>
            {isSupabaseConfigured
              ? 'Eventos guardados en Supabase. Todavía no se sincronizan con Google Calendar.'
              : 'Agenda de demostración local.'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNewEvent}>
          <Plus size={15} /> Crear evento
        </button>
      </div>

      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-header">
            <h2 className="capitalize">{monthName}</h2>
            <div className="calendar-nav">
              <button
                type="button"
                className="icon-button subtle"
                aria-label="Mes anterior"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn btn-tiny"
                onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Hoy
              </button>
              <button
                type="button"
                className="icon-button subtle"
                aria-label="Mes siguiente"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="calendar-cell empty" />;
              const isToday =
                day === today.getDate()
                && month === today.getMonth()
                && year === today.getFullYear();
              const dayEvents = eventsByDay[day] || [];

              return (
                <div key={day} className={`calendar-cell ${isToday ? 'today' : ''}`}>
                  <span className="day-number">{day}</span>
                  <div className="day-events">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <span className="event-chip" key={ev.id} title={ev.titulo}>
                        {ev.titulo}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <small className="more-events">+{dayEvents.length - 2} más</small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Próximos eventos</h2>
            <span className="count-badge">{events.length}</span>
          </div>
          {events.length === 0 ? (
            <div className="empty-state">No hay eventos programados.</div>
          ) : (
            <div className="event-cards">
              {events.map((event) => (
                <article className="event-list-card" key={event.id}>
                  <div className="event-list-top">
                    <span className="status-pill">{event.tipo || 'Agenda'}</span>
                    <button
                      type="button"
                      className="icon-button subtle"
                      aria-label={`Eliminar ${event.titulo}`}
                      onClick={() => onDeleteEvent(event)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3>{event.titulo}</h3>
                  <p className="muted">
                    <CalendarDays size={13} /> {formatDateTime(event.inicio)}
                  </p>
                  <p className="muted">
                    {event.responsable}
                    {event.descripcion ? ` · ${event.descripcion}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function ActividadView({ changes, formatDateTime }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRAZABILIDAD</p>
          <h1>Actividad reciente</h1>
          <p>Historial de cambios registrados dentro de esta plataforma.</p>
        </div>
      </div>

      <div className="notice notice-info">
        Este registro muestra cambios de usuarios, enlaces de bitácoras y eventos hechos aquí.{' '}
        <strong>Todavía no detecta ediciones realizadas directamente dentro de Google Docs.</strong>
      </div>

      <section className="panel">
        {changes.length === 0 ? (
          <div className="empty-state">Todavía no hay movimientos registrados.</div>
        ) : (
          <div className="activity-timeline">
            {changes.map((item) => (
              <div className="timeline-item" key={item.id}>
                <span className="timeline-dot" aria-hidden="true" />
                <div>
                  <strong>{item.descripcion}</strong>
                  <small>{formatDateTime(item.fecha)}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function AvisosCorreoView({ notices, onPreviewNotice, formatDateTime }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">NOTIFICACIONES</p>
          <h1>Avisos por correo</h1>
          <p>Vista de demostración de los correos automáticos al actualizar bitácoras.</p>
        </div>
      </div>

      <div className="notice notice-info">
        Vista previa sin envío real de correos. En la siguiente etapa se conectará con Google Drive Changes API y Resend/SMTP.
      </div>

      <section className="panel">
        {notices.length === 0 ? (
          <div className="empty-state">No hay avisos preparados todavía.</div>
        ) : (
          <div className="notices-list">
            {notices.map((notice) => (
              <article className="notice-email-row" key={notice.id}>
                <span className="stat-icon stat-green">
                  <Mail size={16} />
                </span>
                <div className="notice-email-body">
                  <strong>{notice.subject}</strong>
                  <small>
                    Para: {notice.recipients.join(', ')} · {formatDateTime(notice.fecha)}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onPreviewNotice(notice)}
                >
                  Ver aviso
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function CarpetasDriveView({
  people,
  logs,
  selectedPersonId,
  onSelectPerson,
  onOpenLog,
}) {
  const activePerson = people.find((p) => p.id === selectedPersonId) || people[0] || null;
  const folderLogs = activePerson
    ? logs.filter((l) => l.persona_id === activePerson.id)
    : [];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LA ESTRUCTURA QUE YA CONOCES</p>
          <h1>Carpetas de Drive</h1>
          <p>Del usuario al documento, sin perderte entre carpetas.</p>
        </div>
        <span className="drive-status-chip">
          <GoogleDriveIcon size={15} /> Sin conectar · Demo
        </span>
      </div>

      <div className="notice notice-info">
        Esta vista reproduce la organización en carpetas por persona usuaria y sus enlaces directos a Google Docs.
      </div>

      {!activePerson ? (
        <div className="panel empty-state">Crea un usuario para visualizar su carpeta de bitácoras.</div>
      ) : (
        <section className="panel drive-explorer">
          <div className="drive-tree">
            <div className="drive-tree-header">
              <GoogleDriveIcon size={16} />
              <strong>CEMIPRE / Usuarios</strong>
            </div>
            <div className="drive-folder-list">
              {people.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={`drive-folder-btn ${person.id === activePerson.id ? 'active' : ''}`}
                  onClick={() => onSelectPerson(person.id)}
                >
                  <Folder size={15} />
                  <span>{person.nombre}</span>
                  <ChevronRight size={14} className="folder-chevron" />
                </button>
              ))}
            </div>
          </div>

          <div className="drive-contents">
            <div className="drive-contents-head">
              <div>
                <h2>{activePerson.nombre}</h2>
                <small className="muted">
                  Carpeta de usuario / {folderLogs.length} bitácoras registradas
                </small>
              </div>
              <Folder size={18} className="muted-icon" />
            </div>

            {folderLogs.length === 0 ? (
              <div className="empty-state">Esta carpeta aún no tiene bitácoras vinculadas.</div>
            ) : (
              <div className="drive-doc-list">
                {folderLogs.map((log) => (
                  <div className="drive-doc-row" key={log.id}>
                    <span className="drive-doc-icon">
                      <Folder size={16} />
                    </span>
                    <div className="drive-doc-info">
                      <strong>{log.titulo}</strong>
                      <small>
                        <FileText size={12} />{' '}
                        {log.url_docs ? 'Documento Google Docs vinculado' : 'Sin enlace configurado'} ·{' '}
                        {log.area || 'Seguimiento'}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn btn-tiny" onClick={() => onOpenLog(log)}>
                        Configurar
                      </button>
                      {log.url_docs ? (
                        <a
                          className="icon-link"
                          href={log.url_docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir ${log.titulo} en Google Docs`}
                        >
                          <ArrowUpRight size={15} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="icon-link"
                          onClick={() => onOpenLog(log)}
                          aria-label={`Configurar ${log.titulo}`}
                        >
                          <ArrowUpRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
