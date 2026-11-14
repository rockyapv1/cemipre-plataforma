import { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Folder,
  Mail,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import { TEAM_MEMBERS } from '../demoData.js';

export function Modal({ title, subtitle, onClose, wide = false, children }) {
  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-card ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function FormActions({ onCancel, saving, action = 'Guardar' }) {
  return (
    <div className="form-actions">
      <button className="btn btn-ghost" type="button" onClick={onCancel}>
        Cancelar
      </button>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Guardando…' : action}
      </button>
    </div>
  );
}

export function LogEditorModal({
  log,
  people = [],
  personId,
  personName,
  saving,
  error,
  onClose,
  onSave,
  onAddComment,
  formatDateTime,
  activeMemberName,
}) {
  const [innerTab, setInnerTab] = useState('documento');
  const [selectedPersonId, setSelectedPersonId] = useState(log.persona_id || personId || people[0]?.id || '');
  const [titulo, setTitulo] = useState(log.titulo || '');
  const [urlDocs, setUrlDocs] = useState(log.url_docs || '');
  const [contenido, setContenido] = useState(log.contenido || log.extracto_demo || '');
  const [notifyTeam, setNotifyTeam] = useState(true);
  const [commentText, setCommentText] = useState('');

  const resolvedPersonName =
    people.find((p) => String(p.id) === String(selectedPersonId))?.nombre || personName;

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave({
      id: log.id,
      persona_id: Number(selectedPersonId),
      titulo: titulo.trim(),
      url_docs: urlDocs.trim(),
      contenido,
      notifyTeam,
    });
  }

  function handleCommentSubmit(event) {
    event.preventDefault();
    const clean = commentText.trim();
    if (!clean) return;
    onAddComment(log.id, clean, activeMemberName);
    setCommentText('');
  }

  return (
    <Modal
      title={log.id ? log.titulo : 'Agregar bitácora'}
      subtitle={`${resolvedPersonName} · ${log.area || 'Seguimiento'}`}
      onClose={onClose}
      wide
    >
      <div className="editor-layout">
        <div className="editor-main">
          {log.id && (
            <div className="editor-tabs" role="tablist" aria-label="Vistas de la bitácora">
              <button
                type="button"
                role="tab"
                aria-selected={innerTab === 'documento'}
                className={`editor-tab ${innerTab === 'documento' ? 'active' : ''}`}
                onClick={() => setInnerTab('documento')}
              >
                <BookOpen size={14} /> Documento
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={innerTab === 'historial'}
                className={`editor-tab ${innerTab === 'historial' ? 'active' : ''}`}
                onClick={() => setInnerTab('historial')}
              >
                Historial ({log.history?.length || 1})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={innerTab === 'comentarios'}
                className={`editor-tab ${innerTab === 'comentarios' ? 'active' : ''}`}
                onClick={() => setInnerTab('comentarios')}
              >
                <MessageSquare size={14} /> Comentarios ({log.comments?.length || 0})
              </button>
            </div>
          )}

          {innerTab === 'documento' && (
            <form onSubmit={handleSubmit} className="form-grid">
              {error && <div className="notice notice-error">{error}</div>}
              {!log.id && people.length > 0 && (
                <label>
                  Persona usuaria
                  <select
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    required
                  >
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.nombre} ({person.codigo})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Nombre de la bitácora
                <input
                  autoFocus
                  maxLength={160}
                  required
                  placeholder="Ej.: Seguimiento individual"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </label>
              <label>
                Enlace de Google Docs (opcional)
                <input
                  type="url"
                  placeholder="https://docs.google.com/document/d/.../edit"
                  value={urlDocs}
                  onChange={(e) => setUrlDocs(e.target.value)}
                />
              </label>

              {log.id && (
                <div className="paper">
                  <div className="paper-meta">
                    <span>Vista de documento (demo local)</span>
                    {log.actualizada && <small>Última ficha: {formatDateTime(log.actualizada)}</small>}
                  </div>
                  <h3>{titulo || 'Bitácora'}</h3>
                  <textarea
                    rows={8}
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Notas de demostración. En producción este contenido se edita directo en Google Docs."
                  />
                </div>
              )}

              <p className="form-hint">
                En operación real, el contenido clínico se edita en Google Docs y la plataforma guarda el enlace seguro para indexarlo y resumirlo.
              </p>
              <FormActions onCancel={onClose} saving={saving} action="Guardar cambios" />
            </form>
          )}

          {innerTab === 'historial' && (
            <div className="inner-list">
              {(log.history && log.history.length > 0 ? log.history : [
                { id: 'curr', author: log.author || 'Equipo CEMIPRE', date: log.actualizada, note: 'Última actualización registrada' },
              ]).map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{item.note}</strong>
                    <small>{item.author} · {item.date ? formatDateTime(item.date) : 'Reciente'}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {innerTab === 'comentarios' && (
            <div className="comments-section">
              <div className="inner-list">
                {(!log.comments || log.comments.length === 0) ? (
                  <p className="muted">Todavía no hay comentarios internos en esta bitácora.</p>
                ) : (
                  log.comments.map((comment) => (
                    <div className="comment-card" key={comment.id}>
                      <div className="comment-head">
                        <strong>{comment.author}</strong>
                        <small>{formatDateTime(comment.date)}</small>
                      </div>
                      <p>{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <input
                  type="text"
                  placeholder="Agregar nota interna para el equipo…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button className="btn btn-secondary" type="submit">
                  Comentar
                </button>
              </form>
            </div>
          )}
        </div>

        <aside className="editor-aside">
          <div className="aside-card">
            <div className="aside-title">
              <Mail size={15} />
              <strong>Aviso por correo</strong>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={notifyTeam}
                onChange={(e) => setNotifyTeam(e.target.checked)}
              />
              <span>Preparar aviso al equipo al guardar</span>
            </label>
            <div className="aside-recipients">
              {TEAM_MEMBERS.slice(0, 3).map((member) => (
                <span className="recipient-pill" key={member.id}>
                  {member.initials} · {member.name.split(' ')[0]}
                </span>
              ))}
            </div>
            <small className="muted">
              Simulación visual: el envío real se conectará en la siguiente etapa.
            </small>
          </div>

          <div className="aside-card">
            <div className="aside-title">
              <Folder size={15} />
              <strong>Ubicación en Drive</strong>
            </div>
            <p className="drive-path">
              CEMIPRE / {resolvedPersonName} / {log.titulo || 'Nueva bitácora'}
            </p>
            {urlDocs ? (
              <a
                className="btn btn-secondary btn-full"
                href={urlDocs}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en Google Docs <ExternalLink size={13} />
              </a>
            ) : (
              <p className="muted">Sin enlace de Google Docs agregado todavía.</p>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  );
}

export function EmailPreviewModal({ notice, onClose, formatDateTime }) {
  return (
    <Modal
      title="Vista previa del aviso por correo"
      subtitle="Simulación de notificación automática (sin envío real en demo)"
      onClose={onClose}
    >
      <div className="email-preview">
        <div className="email-meta-row">
          <span>De:</span>
          <strong>CEMIPRE Notificaciones &lt;avisos@cemipre-demo.org&gt;</strong>
        </div>
        <div className="email-meta-row">
          <span>Para:</span>
          <strong>{notice.recipients.join(', ')}</strong>
        </div>
        <div className="email-meta-row">
          <span>Asunto:</span>
          <strong>{notice.subject}</strong>
        </div>
        <div className="email-meta-row">
          <span>Fecha:</span>
          <strong>{formatDateTime(notice.fecha)}</strong>
        </div>
        <div className="email-body-box">
          <p>Hola equipo,</p>
          <p>{notice.preview}</p>
          <div className="email-cta-mock">
            <span>Bitácora: <strong>{notice.logTitle}</strong> ({notice.personName})</span>
            <span>Autor: {notice.author}</span>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="button" onClick={onClose}>
          Cerrar vista previa
        </button>
      </div>
    </Modal>
  );
}

export function AboutModal({ isSupabaseConfigured, onClose }) {
  return (
    <Modal
      title="Acerca del prototipo CEMIPRE"
      subtitle="Espacio centralizado de bitácoras, agenda y resúmenes"
      onClose={onClose}
    >
      <div className="about-grid">
        <div className="about-item">
          <BookOpen size={18} />
          <div>
            <strong>Bitácoras conectadas a Google Docs</strong>
            <p>Organiza los documentos por persona usuaria sin perderse en carpetas anidadas.</p>
          </div>
        </div>
        <div className="about-item">
          <Sparkles size={18} />
          <div>
            <strong>Resúmenes IA (fase siguiente)</strong>
            <p>Actualmente muestra extractos de demostración hasta conectar la lectura autorizada de Google Docs.</p>
          </div>
        </div>
        <div className="about-item">
          <Mail size={18} />
          <div>
            <strong>Avisos por correo (fase siguiente)</strong>
            <p>Las notificaciones se simulan en vista previa hasta integrar el envío real.</p>
          </div>
        </div>
        <div className="about-item">
          <CalendarDays size={18} />
          <div>
            <strong>Agenda del equipo</strong>
            <p>
              {isSupabaseConfigured
                ? 'Conectado actualmente a Supabase en modo temporal sin login.'
                : 'Ejecutándose con datos ficticios locales; configura frontend/.env.local para persistir en Supabase.'}
            </p>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" type="button" onClick={onClose}>
          Entendido
        </button>
      </div>
    </Modal>
  );
}
