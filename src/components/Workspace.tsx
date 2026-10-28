'use client';
import { useState } from 'react';
import { RunwayConnection } from './RunwayConnection';
import {
  Plus,
  ArrowUpRight,
  Download,
  Upload,
  CheckCircle2,
  LoaderCircle,
  KeyRound,
  ShieldCheck,
  Database,
  ExternalLink,
  FolderOpen,
  Film,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { api, KindIcon, Modal, Empty, money, type StudioData } from './shared';
import type { Asset } from '@/lib/types';
export function Templates({
  data: d,
  refresh,
  notify,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [adding, setAdding] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSISTENCIA QUE SE RECONOCE</div>
          <h1>
            Mis formatos<span className="red-dot">.</span>
          </h1>
          <p>Una identidad compartida. Distintas maneras de contar algo bueno.</p>
        </div>
        <button className="button primary" onClick={() => setAdding(true)}>
          <Plus size={17} />
          Nuevo formato
        </button>
      </div>
      <div className="formats-grid">
        {d.templates.map((t, i) => (
          <article className="format-card" key={t.version_id}>
            <div
              className={`format-art art-${t.kind}`}
              style={{ '--format-accent': t.accent.trim() } as React.CSSProperties}
            >
              <span className="mini-tag">{t.kind === 'video' ? '9:16 · MP4' : '4:5 · PNG'}</span>
              {t.kind === 'video' ? (
                <>
                  <div className="mini-question">
                    <span />
                    {i % 2 ? '¿Te atreves con este reto?' : 'Una pregunta. Una buena explicación.'}
                    <div>
                      <i>A</i>
                      <i>B</i>
                    </div>
                  </div>
                  <img src="/brand/mascot.webp" alt="Vista del formato con el dinosaurio" />
                </>
              ) : (
                <div className="mini-post">
                  <img src="/brand/logo.png" alt="Ingresa PE" />
                  <strong>
                    {t.kind === 'carousel' ? (
                      <>
                        Aprende.
                        <br />
                        Entiende.
                        <br />
                        Recuerda.
                      </>
                    ) : (
                      <>
                        Tu pregunta
                        <br />
                        del día.
                      </>
                    )}
                  </strong>
                  <span>PREPÁRATE PARA LA UNSA ↗</span>
                  {t.kind === 'carousel' && <div className="slide-dots">● ○ ○</div>}
                </div>
              )}
              <span className="format-version">V{t.version}</span>
            </div>
            <div className="format-content">
              <KindIcon kind={t.kind} />
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div>
                <span>
                  {t.kind === 'video'
                    ? `Demo ${t.duration_seconds}s · audio real variable`
                    : t.kind === 'carousel'
                      ? '3 imágenes por pregunta'
                      : '1 imagen por pregunta'}
                </span>
                <span className="color-dot" style={{ background: t.accent.trim() }} />
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Cada trabajo conserva la versión del formato con la que se creó. Los videos de Runway
          mantienen la duración de la respuesta hablada.
        </span>
      </div>
      {adding && (
        <Modal title="Crear un formato" onClose={() => setAdding(false)}>
          <p className="muted">
            Crea una variante del diseño de Ingresa PE. La estructura conserva pregunta,
            alternativas, personaje y cierre.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                await api('templates', {
                  name: f.get('name'),
                  description: f.get('description'),
                  kind: f.get('kind'),
                  accent: f.get('accent'),
                  durationSeconds: Number(f.get('duration')),
                });
                setAdding(false);
                await refresh();
                notify('Formato creado. Ya puedes seleccionarlo al producir.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo guardar.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nombre
              <input
                name="name"
                required
                minLength={3}
                maxLength={80}
                placeholder="Ej. Reto de biología"
              />
            </label>
            <label>
              Descripción
              <textarea
                name="description"
                maxLength={300}
                rows={2}
                placeholder="Qué hace especial a este formato"
              />
            </label>
            <div className="form-grid">
              <label>
                Tipo
                <select name="kind">
                  <option value="video">Video</option>
                  <option value="image">Imagen</option>
                  <option value="carousel">Carrusel</option>
                </select>
              </label>
              <label>
                Duración de demo (segundos)
                <input name="duration" type="number" min={6} max={60} defaultValue={15} />
              </label>
            </div>
            <label>
              Color principal
              <input name="accent" type="color" defaultValue="#C80727" />
            </label>
            {error && <div className="error-message">{error}</div>}
            <button className="button primary full" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Guardar
              formato
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Library({
  data: d,
  refresh,
  notify,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState(''),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<Asset | null>(null);
  const files = d.assets.filter(
    (a) =>
      (!filter || a.mime_type.startsWith(filter)) &&
      a.original_name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TODO LO QUE HAS CREADO, A MANO</div>
          <h1>
            Biblioteca<span className="red-dot">.</span>
          </h1>
          <p>Tus producciones y recursos, en un solo lugar.</p>
        </div>
        <label className={`button primary upload-button ${busy ? 'disabled' : ''}`}>
          <Upload size={17} />
          {busy ? 'Subiendo…' : 'Subir imagen'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                const data = new FormData();
                data.set('file', f);
                const r = await fetch('/api/upload', { method: 'POST', body: data });
                const v = await r.json();
                if (!r.ok) throw new Error(v.error);
                await refresh();
                notify('Imagen guardada en tu biblioteca.');
              } catch (err) {
                notify(err instanceof Error ? err.message : 'No se pudo subir.');
              } finally {
                setBusy(false);
                e.target.value = '';
              }
            }}
          />
        </label>
      </div>
      <div className="library-toolbar">
        <div className="area-tabs compact">
          {[
            ['', 'Todos'],
            ['video/', 'Videos'],
            ['image/', 'Imágenes'],
          ].map(([value, label]) => (
            <button
              key={label}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={15} />
          <input
            aria-label="Buscar archivos"
            placeholder="Buscar en biblioteca…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {files.length ? (
        <div className="assets-grid">
          {files.map((a) => (
            <article className="asset-card" key={a.id}>
              <button className="asset-preview" onClick={() => setPreview(a)}>
                {a.mime_type.startsWith('video/') ? (
                  <video src={`/api/media/${a.id}#t=1`} preload="metadata" muted />
                ) : (
                  <img src={`/api/media/${a.id}`} alt={a.original_name} loading="lazy" />
                )}
                <span className="asset-kind">
                  {a.mime_type.startsWith('video/') ? <Film size={14} /> : <ImageIcon size={14} />}
                </span>
              </button>
              <div className="asset-info">
                <div>
                  <strong>{a.original_name}</strong>
                  <small>
                    {(Number(a.byte_size) / 1024 / 1024).toFixed(2)} MB ·{' '}
                    {new Date(a.created_at).toLocaleDateString('es-PE')}
                  </small>
                </div>
                <a className="icon-button" href={`/api/media/${a.id}?download=1`} title="Descargar">
                  <Download size={17} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="content-panel">
          <Empty
            title="Aquí vivirán tus próximas creaciones"
            text="Genera contenido desde el creador o sube una imagen para guardarla en tu biblioteca."
          />
        </section>
      )}
      {preview && (
        <Modal title={preview.original_name} onClose={() => setPreview(null)}>
          {preview.mime_type.startsWith('video/') ? (
            <video className="media-modal" src={`/api/media/${preview.id}`} controls autoPlay />
          ) : (
            <img
              className="media-modal"
              src={`/api/media/${preview.id}`}
              alt={preview.original_name}
            />
          )}
          <a className="button primary full" href={`/api/media/${preview.id}?download=1`}>
            <Download size={16} />
            Descargar archivo
          </a>
        </Modal>
      )}
    </>
  );
}
export function Configuration({
  data: d,
  notify,
  refresh,
}: {
  data: StudioData;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LOS DETALLES DETRÁS DE CADA IDEA</div>
          <h1>
            Configuración<span className="red-dot">.</span>
          </h1>
          <p>Tu marca, tus conexiones y el control de tu producción.</p>
        </div>
        <span className="private-label">
          <ShieldCheck size={15} />
          SOLO TÚ
        </span>
      </div>
      <div className="settings-grid">
        <RunwayConnection data={d} refresh={refresh} notify={notify} />
        <div className="settings-stack">
          <section className="content-panel settings-panel">
            <div className="settings-title">
              <span className="settings-icon">
                <Database size={21} />
              </span>
              <div>
                <h2>Motor de producción</h2>
                <p>Cola persistente en PostgreSQL.</p>
              </div>
            </div>
            <div className="setting-row">
              <span>Estado del worker</span>
              <strong className={d.workerOnline ? 'green' : 'amber'}>
                {d.workerOnline ? 'Conectado' : 'Desconectado'}
              </strong>
            </div>
            <p className="muted">
              Los lotes se conservan aunque cierres el navegador. El worker los procesa con la
              concurrencia que configures.
            </p>
            <code className="code-line">npm run worker</code>
          </section>
          <section className="content-panel settings-panel">
            <div className="settings-title">
              <span className="settings-icon">
                <ShieldCheck size={21} />
              </span>
              <div>
                <h2>Tu espacio privado</h2>
                <p>{d.user.email}</p>
              </div>
            </div>
            <p className="muted">
              Sesiones privadas y archivos protegidos. Las claves permanecen en el servidor.
            </p>
            <div className="brand-swatches">
              <span style={{ background: '#C80727' }} />
              <span style={{ background: '#090D16' }} />
              <span style={{ background: '#F5F6FA' }} />
              <div>
                <strong>Identidad Ingresa PE</strong>
                <small>Diseño basado en Open Design</small>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
