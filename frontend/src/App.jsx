import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Home,
  Info,
  Leaf,
  Mail,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { api } from './api.js';
import { isSupabaseConfigured } from './supabase.js';
import {
  AVATAR_COLORS,
  TEAM_MEMBERS,
  buildDemoState,
  getInitials,
} from './demoData.js';
import { GoogleDriveIcon } from './components/Icons.jsx';
import {
  AboutModal,
  EmailPreviewModal,
  FormActions,
  LogEditorModal,
  Modal,
} from './components/Modals.jsx';
import {
  InicioView,
  ResumenesIAView,
  UsuarioDetailView,
  UsuariosView,
} from './components/DashboardViews.jsx';
import {
  ActividadView,
  AvisosCorreoView,
  BitacorasView,
  CalendarioView,
  CarpetasDriveView,
} from './components/WorkspaceViews.jsx';

const NAV_TITLES = {
  inicio: 'Inicio',
  usuarios: 'Usuarios',
  'usuario-detalle': 'Perfil de usuario',
  bitacoras: 'Bitácoras',
  resumenes: 'Resúmenes IA',
  calendario: 'Calendario',
  actividad: 'Actividad',
  favoritos: 'Mis favoritos',
  avisos: 'Avisos por correo',
  drive: 'Carpetas de Drive',
};

const formatShortDate = (iso) => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
}).format(new Date(iso));

const formatDateTime = (iso) => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(iso));

const formatTodayHeader = () => new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date()).toUpperCase();

function loadStoredFavorites(defaultIds) {
  try {
    const raw = window.localStorage.getItem('cemipre_favorites_v1');
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // Ignorar errores de acceso a localStorage.
  }
  return new Set(defaultIds);
}

export default function App() {
  const [view, setView] = useState('inicio');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState(TEAM_MEMBERS[0].id);

  const [people, setPeople] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [changes, setChanges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [favorites, setFavorites] = useState(() => new Set());

  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [selectedPersonDetail, setSelectedPersonDetail] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');

  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activeMember = useMemo(
    () => TEAM_MEMBERS.find((m) => m.id === activeMemberId) || TEAM_MEMBERS[0],
    [activeMemberId],
  );

  const todayLabel = useMemo(() => formatTodayHeader(), []);
  const unreadNotices = notices.filter((n) => n.unread).length;

  async function refreshSupabaseData() {
    const [peopleData, logsData, eventsData, activityData] = await Promise.all([
      api.users(),
      api.logs(),
      api.events(),
      api.activity(),
    ]);
    const decoratedPeople = peopleData.personas.map((p, index) => ({
      ...p,
      initials: getInitials(p.nombre),
      color: AVATAR_COLORS[index % AVATAR_COLORS.length],
      program: 'Seguimiento CEMIPRE',
    }));
    setPeople(decoratedPeople);
    setAllLogs(logsData.bitacoras);
    setEvents(eventsData.eventos);
    setChanges(activityData.actividad);
    setSelectedPersonId((prev) => prev ?? decoratedPeople[0]?.id ?? null);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (isSupabaseConfigured) {
          await refreshSupabaseData();
          if (!ignore) setFavorites(loadStoredFavorites([]));
        } else {
          const demo = buildDemoState();
          if (ignore) return;
          setPeople(demo.people);
          setAllLogs(demo.logs);
          setEvents(demo.events);
          setChanges(demo.activity);
          setNotices(demo.notices);
          setSelectedPersonId(demo.people[0]?.id ?? null);
          setFavorites(loadStoredFavorites(demo.logs.filter((l) => l.favorite).map((l) => l.id)));
        }
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setBusy(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (selectedPersonId === null) {
      setSelectedPersonDetail(null);
      return;
    }
    if (!isSupabaseConfigured) {
      const person = people.find((p) => p.id === selectedPersonId) || null;
      setSelectedPersonDetail(person);
      return;
    }
    let ignore = false;
    api
      .user(selectedPersonId)
      .then((data) => {
        if (!ignore) {
          const matching = people.find((p) => p.id === selectedPersonId);
          setSelectedPersonDetail({
            ...data,
            color: matching?.color || 'peach',
            program: matching?.program || 'Seguimiento CEMIPRE',
            initials: getInitials(data.nombre),
          });
        }
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [selectedPersonId, people]);

  function navigate(targetView) {
    setView(targetView);
    setMobileNavOpen(false);
    setError('');
  }

  function handleSelectPerson(personId) {
    setSelectedPersonId(personId);
    setSummary(null);
    navigate('usuario-detalle');
  }

  function toggleFavorite(logId) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      try {
        window.localStorage.setItem('cemipre_favorites_v1', JSON.stringify([...next]));
      } catch {
        // Ignorar errores de almacenamiento local.
      }
      return next;
    });
  }

  function openNewPersonModal() {
    setError('');
    setForm({ codigo: '', nombre: '' });
    setModal('new-person');
  }

  function openNewEventModal() {
    setError('');
    setForm({ titulo: '', inicio: '', fin: '', responsable: activeMember.name, descripcion: '', tipo: 'Reunión' });
    setModal('new-event');
  }

  function openLogModal(log = null) {
    setError('');
    setModalData(log || {});
    setModal('log-editor');
  }

  async function handleCreatePerson(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const codigo = (form.codigo || '').trim();
      const nombre = (form.nombre || '').trim();
      if (!codigo || !nombre) {
        throw new Error('Código y nombre son obligatorios.');
      }

      if (isSupabaseConfigured) {
        const created = await api.createUser({ codigo, nombre });
        await refreshSupabaseData();
        setSelectedPersonId(created.id);
      } else {
        if (people.some((p) => p.codigo.toLowerCase() === codigo.toLowerCase())) {
          throw new Error('Ya existe un usuario con ese código.');
        }
        const nextId = Math.max(0, ...people.map((p) => p.id)) + 1;
        const created = {
          id: nextId,
          codigo,
          nombre,
          initials: getInitials(nombre),
          color: AVATAR_COLORS[people.length % AVATAR_COLORS.length],
          program: 'Programa de acompañamiento',
          joined: '2026',
          total_bitacoras: 0,
        };
        setPeople((prev) => [...prev, created]);
        setChanges((prev) => [
          { id: Date.now(), descripcion: `Se creó el registro ${codigo} (${nombre}).`, fecha: new Date().toISOString() },
          ...prev,
        ]);
        setSelectedPersonId(nextId);
      }
      setMessage('Usuario agregado correctamente.');
      setModal(null);
      navigate('usuario-detalle');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLog(payload) {
    setSaving(true);
    setError('');
    try {
      const targetPersonId = payload.persona_id || selectedPersonId || people[0]?.id;
      const targetPerson = people.find((p) => p.id === targetPersonId);

      if (isSupabaseConfigured) {
        if (payload.id) {
          await api.updateLog(payload.id, {
            titulo: payload.titulo,
            url_docs: payload.url_docs,
          });
        } else {
          await api.createLog({
            persona_id: targetPersonId,
            titulo: payload.titulo,
            url_docs: payload.url_docs,
          });
        }
        await refreshSupabaseData();
      } else {
        const nowIso = new Date().toISOString();
        const authorShort = activeMember.name.split(' ')[0];
        if (payload.id) {
          setAllLogs((prev) => prev.map((item) => (item.id === payload.id ? {
            ...item,
            titulo: payload.titulo,
            url_docs: payload.url_docs,
            contenido: payload.contenido,
            author: authorShort,
            actualizada: nowIso,
            history: [
              { id: `${Date.now()}-h`, author: activeMember.name, date: nowIso, note: 'Actualización de ficha y contenido' },
              ...(item.history || []),
            ],
          } : item)));
          setChanges((prev) => [
            { id: Date.now(), descripcion: `${authorShort} actualizó "${payload.titulo}".`, fecha: nowIso },
            ...prev,
          ]);
        } else {
          const nextId = Math.max(0, ...allLogs.map((l) => l.id)) + 1;
          const created = {
            id: nextId,
            persona_id: targetPersonId,
            persona_nombre: targetPerson?.nombre || 'Usuario',
            persona_codigo: targetPerson?.codigo || '',
            titulo: payload.titulo,
            area: 'Seguimiento',
            author: authorShort,
            url_docs: payload.url_docs,
            contenido: payload.contenido || '',
            extracto_demo: 'Bitácora recién registrada.',
            actualizada: nowIso,
            history: [{ id: `${Date.now()}-h`, author: activeMember.name, date: nowIso, note: 'Creación de bitácora' }],
            comments: [],
          };
          setAllLogs((prev) => [created, ...prev]);
          setPeople((prev) => prev.map((p) => (p.id === targetPersonId
            ? { ...p, total_bitacoras: (p.total_bitacoras || 0) + 1 }
            : p)));
          setChanges((prev) => [
            { id: Date.now(), descripcion: `${authorShort} agregó "${payload.titulo}" a ${targetPerson?.nombre || ''}.`, fecha: nowIso },
            ...prev,
          ]);
        }

        if (payload.notifyTeam) {
          setNotices((prev) => [
            {
              id: Date.now(),
              subject: `Actualización en bitácora: ${payload.titulo} · ${targetPerson?.nombre || ''}`,
              recipients: TEAM_MEMBERS.filter((m) => m.id !== activeMember.id).map(
                (m) => `${m.id}@cemipre-demo.org`,
              ),
              author: activeMember.name,
              fecha: nowIso,
              logTitle: payload.titulo,
              personName: targetPerson?.nombre || '',
              preview: `Se actualizó la bitácora "${payload.titulo}". Por privacidad, revisa los detalles dentro de la plataforma o en Google Docs.`,
              unread: true,
            },
            ...prev,
          ]);
        }
      }

      setMessage(payload.id ? 'Bitácora actualizada.' : 'Bitácora registrada.');
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleAddComment(logId, text, authorName) {
    const nowIso = new Date().toISOString();
    setAllLogs((prev) => prev.map((item) => (item.id === logId ? {
      ...item,
      comments: [...(item.comments || []), { id: `${Date.now()}-c`, author: authorName, date: nowIso, text }],
    } : item)));
    setModalData((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), { id: `${Date.now()}-c`, author: authorName, date: nowIso, text }],
    }));
  }

  async function handleCreateEvent(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!form.inicio || !form.fin) {
        throw new Error('Debes indicar fecha y hora de inicio y fin.');
      }
      const start = new Date(form.inicio);
      const end = new Date(form.fin);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        throw new Error('Las fechas deben ser válidas y el fin posterior al inicio.');
      }

      if (isSupabaseConfigured) {
        await api.createEvent({
          titulo: form.titulo || '',
          descripcion: form.descripcion || '',
          responsable: form.responsable || activeMember.name,
          inicio: start.toISOString(),
          fin: end.toISOString(),
        });
        await refreshSupabaseData();
      } else {
        const created = {
          id: Date.now(),
          titulo: (form.titulo || '').trim(),
          descripcion: form.descripcion || '',
          responsable: form.responsable || activeMember.name,
          tipo: form.tipo || 'Agenda',
          inicio: start.toISOString(),
          fin: end.toISOString(),
        };
        setEvents((prev) => [...prev, created]);
        setChanges((prev) => [
          { id: Date.now(), descripcion: `Se creó el evento "${created.titulo}".`, fecha: new Date().toISOString() },
          ...prev,
        ]);
      }
      setMessage('Evento agregado a la agenda.');
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(event) {
    if (!window.confirm(`¿Eliminar el evento «${event.titulo}»?`)) return;
    try {
      if (isSupabaseConfigured) {
        await api.deleteEvent(event.id);
        await refreshSupabaseData();
      } else {
        setEvents((prev) => prev.filter((item) => item.id !== event.id));
        setChanges((prev) => [
          { id: Date.now(), descripcion: `Se eliminó el evento "${event.titulo}".`, fecha: new Date().toISOString() },
          ...prev,
        ]);
      }
      setMessage('Evento eliminado.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleGenerateSummary(personId) {
    setSelectedPersonId(personId);
    setLoadingSummary(true);
    setError('');
    try {
      if (isSupabaseConfigured) {
        setSummary(await api.summary(personId));
      } else {
        const person = people.find((p) => p.id === personId);
        const personLogs = allLogs.filter((l) => l.persona_id === personId);
        setSummary({
          es_demo: true,
          nombre: person?.nombre || 'Usuario',
          cantidad_bitacoras: personLogs.length,
          advertencia: 'Resumen de demostración con datos ficticios. En producción leerá los Google Docs reales mediante IA.',
          secciones: personLogs.map((b) => ({
            titulo: `${b.titulo} (${b.area || 'Seguimiento'})`,
            texto: b.extracto_demo || 'Sin extracto disponible.',
          })),
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  const selectedPersonLogs = useMemo(() => {
    if (selectedPersonId === null) return [];
    if (isSupabaseConfigured && selectedPersonDetail?.bitacoras) {
      return selectedPersonDetail.bitacoras;
    }
    return allLogs.filter((l) => l.persona_id === selectedPersonId);
  }, [selectedPersonId, selectedPersonDetail, allLogs]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-top-row">
          <button type="button" className="brand" onClick={() => navigate('inicio')}>
            <span className="brand-mark" aria-hidden="true">
              <Leaf size={21} />
            </span>
            <span>
              CEMIPRE
              <small>ESPACIO DE EQUIPO</small>
            </span>
          </button>
          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">
          <span className="workspace-dot" aria-hidden="true" />
          <span>Centro CEMIPRE</span>
          <ChevronDown size={14} />
        </div>

        <p className="nav-label">TU ESPACIO</p>
        <nav aria-label="Secciones principales">
          <button
            type="button"
            className={view === 'inicio' ? 'active' : ''}
            onClick={() => navigate('inicio')}
          >
            <Home size={15} /> Inicio
          </button>
          <button
            type="button"
            className={view === 'usuarios' || view === 'usuario-detalle' ? 'active' : ''}
            onClick={() => navigate('usuarios')}
          >
            <Users size={15} /> Usuarios
            <span className="nav-count">{people.length}</span>
          </button>
          <button
            type="button"
            className={view === 'bitacoras' ? 'active' : ''}
            onClick={() => navigate('bitacoras')}
          >
            <BookOpen size={15} /> Bitácoras
          </button>
          <button
            type="button"
            className={view === 'resumenes' ? 'active' : ''}
            onClick={() => navigate('resumenes')}
          >
            <Sparkles size={15} /> Resúmenes IA
            <span className="tiny-new">IA</span>
          </button>
          <button
            type="button"
            className={view === 'calendario' ? 'active' : ''}
            onClick={() => navigate('calendario')}
          >
            <CalendarDays size={15} /> Calendario
          </button>
          <button
            type="button"
            className={view === 'actividad' ? 'active' : ''}
            onClick={() => navigate('actividad')}
          >
            <Activity size={15} /> Actividad
          </button>
        </nav>

        <div className="sidebar-separator" />

        <p className="nav-label">ACCESOS RÁPIDOS</p>
        <nav aria-label="Accesos rápidos">
          <button
            type="button"
            className={view === 'favoritos' ? 'active' : ''}
            onClick={() => navigate('favoritos')}
          >
            <Star size={15} /> Mis favoritos
            <span className="nav-count">{favorites.size}</span>
          </button>
          <button
            type="button"
            className={view === 'avisos' ? 'active' : ''}
            onClick={() => navigate('avisos')}
          >
            <Mail size={15} /> Avisos por correo
            {unreadNotices > 0 && <span className="nav-count">{unreadNotices}</span>}
          </button>
          <button
            type="button"
            className={`side-link ${view === 'drive' ? 'active' : ''}`}
            onClick={() => navigate('drive')}
          >
            <GoogleDriveIcon size={16} /> Carpetas de Drive
            <ArrowUpRight size={13} className="nav-count" />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="private-box">
            <ShieldCheck size={16} />
            <div>
              <strong>{isSupabaseConfigured ? 'Supabase temporal' : 'Un espacio privado'}</strong>
              <small>{isSupabaseConfigured ? 'Sin login activo aún' : 'Datos de demostración'}</small>
            </div>
          </div>
          <button type="button" className="help-link" onClick={() => setModal('about')}>
            <Info size={13} /> Acerca del prototipo
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <span>Espacio de trabajo</span>
            <span aria-hidden="true">&gt;</span>
            <b>{NAV_TITLES[view] || 'Inicio'}</b>
          </div>

          <div className="topbar-right">
            <span className="private-label">
              <ShieldCheck size={13} />
              {isSupabaseConfigured ? 'Supabase (demo)' : 'Privado (demo)'}
            </span>
            <button
              type="button"
              className="notification-button"
              aria-label="Ver avisos por correo"
              onClick={() => navigate('avisos')}
            >
              <Bell size={16} />
              {unreadNotices > 0 && <i aria-hidden="true" />}
            </button>
            <div className="profile">
              <span className="profile-avatar">{activeMember.initials}</span>
              <div>
                <label>
                  <span className="sr-only">Cambiar perfil de demostración</span>
                  <select
                    value={activeMemberId}
                    onChange={(e) => setActiveMemberId(e.target.value)}
                  >
                    {TEAM_MEMBERS.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <small>Perfil de demostración</small>
              </div>
            </div>
          </div>
        </header>

        <main id="contenido" className="main-content">
          {!isSupabaseConfigured && (
            <div className="notice notice-info">
              <strong>Vista previa local activa.</strong> Estás viendo datos ficticios de demostración. Para guardar datos reales de prueba en tu proyecto Supabase, copia <code>frontend/.env.example</code> a <code>frontend/.env.local</code> y ejecuta <code>supabase/schema.sql</code>.
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              {error}{' '}
              <button type="button" className="inline-button" onClick={() => setError('')}>
                Cerrar
              </button>
            </div>
          )}

          {message && (
            <div className="notice notice-success" role="status">
              {message}{' '}
              <button type="button" className="inline-button" onClick={() => setMessage('')}>
                Cerrar
              </button>
            </div>
          )}

          {busy ? (
            <div className="panel empty-state">Cargando espacio de trabajo…</div>
          ) : (
            <>
              {view === 'inicio' && (
                <InicioView
                  activeMember={activeMember}
                  people={people}
                  logs={allLogs}
                  events={events}
                  todayLabel={todayLabel}
                  onNavigate={navigate}
                  onSelectPerson={handleSelectPerson}
                  onOpenLog={openLogModal}
                  onOpenNewEvent={openNewEventModal}
                  formatShortDate={formatShortDate}
                />
              )}

              {view === 'usuarios' && (
                <UsuariosView
                  people={people}
                  search={userSearch}
                  onSearchChange={setUserSearch}
                  programFilter={programFilter}
                  onProgramFilterChange={setProgramFilter}
                  onSelectPerson={handleSelectPerson}
                  onNewPerson={openNewPersonModal}
                />
              )}

              {view === 'usuario-detalle' && (
                <UsuarioDetailView
                  person={selectedPersonDetail}
                  personLogs={selectedPersonLogs}
                  summary={summary}
                  onBack={() => navigate('usuarios')}
                  onNewLog={() => openLogModal(null)}
                  onOpenLog={openLogModal}
                  onOpenSummary={(id) => {
                    navigate('resumenes');
                    handleGenerateSummary(id);
                  }}
                  formatShortDate={formatShortDate}
                />
              )}

              {view === 'bitacoras' && (
                <BitacorasView
                  logs={allLogs}
                  people={people}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onOpenLog={openLogModal}
                  onNewLog={() => openLogModal(null)}
                  formatShortDate={formatShortDate}
                />
              )}

              {view === 'favoritos' && (
                <BitacorasView
                  logs={allLogs}
                  people={people}
                  favorites={favorites}
                  onlyFavorites
                  onToggleFavorite={toggleFavorite}
                  onOpenLog={openLogModal}
                  onNewLog={() => openLogModal(null)}
                  formatShortDate={formatShortDate}
                />
              )}

              {view === 'resumenes' && (
                <ResumenesIAView
                  people={people}
                  selectedPersonId={selectedPersonId}
                  summary={summary}
                  loadingSummary={loadingSummary}
                  onSelectPerson={(id) => {
                    setSelectedPersonId(id);
                    setSummary(null);
                  }}
                  onGenerateSummary={handleGenerateSummary}
                  onNavigateToPerson={handleSelectPerson}
                />
              )}

              {view === 'calendario' && (
                <CalendarioView
                  events={events}
                  isSupabaseConfigured={isSupabaseConfigured}
                  onNewEvent={openNewEventModal}
                  onDeleteEvent={handleDeleteEvent}
                  formatDateTime={formatDateTime}
                />
              )}

              {view === 'actividad' && (
                <ActividadView changes={changes} formatDateTime={formatDateTime} />
              )}

              {view === 'avisos' && (
                <AvisosCorreoView
                  notices={notices}
                  onPreviewNotice={(notice) => {
                    setModalData(notice);
                    setModal('email-preview');
                  }}
                  formatDateTime={formatDateTime}
                />
              )}

              {view === 'drive' && (
                <CarpetasDriveView
                  people={people}
                  logs={allLogs}
                  selectedPersonId={selectedPersonId}
                  onSelectPerson={setSelectedPersonId}
                  onOpenLog={openLogModal}
                />
              )}
            </>
          )}

          <footer className="page-footer">
            CEMIPRE · Prototipo colaborativo con datos ficticios · Enlace directo a Google Docs
          </footer>
        </main>
      </div>

      {modal === 'new-person' && (
        <Modal
          title="Registrar usuario"
          subtitle="Usa identidades ficticias mientras el sistema no tenga autenticación."
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleCreatePerson} className="form-grid">
            {error && <div className="notice notice-error">{error}</div>}
            <label>
              Código de usuario
              <input
                autoFocus
                maxLength={32}
                required
                placeholder="Ej.: USR-009"
                value={form.codigo || ''}
                onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value }))}
              />
            </label>
            <label>
              Nombre identificador
              <input
                maxLength={120}
                required
                placeholder="Ej.: Usuario 009"
                value={form.nombre || ''}
                onChange={(e) => setForm((c) => ({ ...c, nombre: e.target.value }))}
              />
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} action="Guardar usuario" />
          </form>
        </Modal>
      )}

      {modal === 'log-editor' && (
        <LogEditorModal
          log={modalData}
          people={people}
          personId={selectedPersonId}
          personName={
            people.find((p) => p.id === (modalData.persona_id || selectedPersonId))?.nombre || 'Usuario'
          }
          saving={saving}
          error={error}
          onClose={() => setModal(null)}
          onSave={handleSaveLog}
          onAddComment={handleAddComment}
          formatDateTime={formatDateTime}
          activeMemberName={activeMember.name}
        />
      )}

      {modal === 'new-event' && (
        <Modal
          title="Crear evento"
          subtitle="Programa una reunión, sesión o taller en la agenda del equipo."
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleCreateEvent} className="form-grid">
            {error && <div className="notice notice-error">{error}</div>}
            <label>
              Nombre del evento
              <input
                autoFocus
                maxLength={160}
                required
                placeholder="Ej.: Reunión de coordinación"
                value={form.titulo || ''}
                onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))}
              />
            </label>
            <div className="two-fields">
              <label>
                Inicio
                <input
                  required
                  type="datetime-local"
                  value={form.inicio || ''}
                  onChange={(e) => setForm((c) => ({ ...c, inicio: e.target.value }))}
                />
              </label>
              <label>
                Fin
                <input
                  required
                  type="datetime-local"
                  value={form.fin || ''}
                  onChange={(e) => setForm((c) => ({ ...c, fin: e.target.value }))}
                />
              </label>
            </div>
            <label>
              Responsable
              <input
                maxLength={120}
                value={form.responsable || ''}
                onChange={(e) => setForm((c) => ({ ...c, responsable: e.target.value }))}
              />
            </label>
            <label>
              Descripción / Lugar (opcional)
              <textarea
                maxLength={2000}
                rows={3}
                value={form.descripcion || ''}
                onChange={(e) => setForm((c) => ({ ...c, descripcion: e.target.value }))}
              />
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} action="Crear evento" />
          </form>
        </Modal>
      )}

      {modal === 'email-preview' && (
        <EmailPreviewModal
          notice={modalData}
          onClose={() => setModal(null)}
          formatDateTime={formatDateTime}
        />
      )}

      {modal === 'about' && (
        <AboutModal
          isSupabaseConfigured={isSupabaseConfigured}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
