'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Home,
  Clapperboard,
  BookOpen,
  Shapes,
  FolderOpen,
  Settings,
  Plus,
  ChevronRight,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Wallet,
  Activity,
  LoaderCircle,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  api,
  type StudioData,
  type Screen,
  AreaBadge,
  Empty,
  JobsTable,
  Modal,
  money,
} from './shared';
import { Creator } from './Creator';
import { QuestionBank } from './QuestionBank';
import { Templates, Library, Configuration } from './Workspace';
const nav = [
  { id: 'home', name: 'Vista general', Icon: Home },
  { id: 'create', name: 'Crear contenido', Icon: Clapperboard },
  { id: 'questions', name: 'Banco de preguntas', Icon: BookOpen },
  { id: 'templates', name: 'Mis formatos', Icon: Shapes },
  { id: 'library', name: 'Biblioteca', Icon: FolderOpen },
] as const;
export function Studio() {
  const [data, setData] = useState<StudioData | null>(null),
    [screen, setScreen] = useState<Screen>('home'),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [mobile, setMobile] = useState(false),
    [reconcile, setReconcile] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await api('studio'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar.');
    }
  }, []);
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (['home', 'create', 'questions', 'templates', 'library', 'settings'].includes(hash))
      setScreen(hash as Screen);
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const go = (s: Screen) => {
    setScreen(s);
    location.hash = s;
    setMobile(false);
  };
  const notify = (v: string) => setToast(v);
  async function onJobAction(id: string, action: string) {
    if (action === 'reconcile') {
      setReconcile(id);
      return;
    }
    try {
      await api(`jobs/${id}/${action}`, {});
      await refresh();
      notify(action === 'cancel' ? 'Trabajo cancelado.' : 'Trabajo devuelto a la cola.');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo completar.');
    }
  }
  const name = nav.find((n) => n.id === screen)?.name ?? 'Configuración';
  return (
    <div className="studio-layout">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src="/brand/logo.png" alt="Ingresa PE" />
          <span>
            STUDIO <b className="version-badge">0.2</b>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">
            ip<span>↗</span>
          </div>
          <div>
            <strong>Ingresa PE</strong>
            <small>Mi espacio de trabajo</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <div className="nav-heading">ESTUDIO</div>
        <nav>
          {nav.map(({ id, name, Icon }) => (
            <button
              key={id}
              className={`nav-item ${screen === id ? 'active' : ''}`}
              onClick={() => go(id)}
            >
              <Icon size={18} />
              {name}
              {id === 'create' && <span className="nav-plus">+</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-card">
            <ShieldCheck size={17} />
            <strong>Hecho para ti.</strong>
            <p>
              Tu estudio es privado.
              <br />
              Tú decides qué compartir.
            </p>
          </div>
          <button
            className={`nav-item ${screen === 'settings' ? 'active' : ''}`}
            onClick={() => go('settings')}
          >
            <Settings size={18} />
            Configuración
          </button>
          <div className="user-card">
            <span className="user-avatar">IP</span>
            <div>
              <strong>Mi cuenta</strong>
              <small>{data?.user.email ?? 'Cargando…'}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={async () => {
                await api('logout', {});
                location.assign('/login');
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Abrir menú"
            >
              <Menu size={21} />
            </button>
            <span>Mi estudio</span>
            <ChevronRight size={13} />
            <strong>{name}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i className={data?.workerOnline ? 'online' : ''} />
              {data?.workerOnline ? 'Motor activo' : 'Motor desconectado'}
            </span>
            <button className="button primary small" onClick={() => go('create')}>
              <Plus size={16} />
              Crear contenido
            </button>
          </div>
        </header>
        <main className="main-content">
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button className="button small" onClick={refresh}>
                Reintentar
              </button>
            </div>
          )}
          {!data ? (
            <div className="loading">
              <LoaderCircle className="spin" /> Preparando tu estudio…
            </div>
          ) : (
            <>
              {screen === 'home' && <Dashboard data={data} go={go} onJobAction={onJobAction} />}{' '}
              <div hidden={screen !== 'create'}>
                <Creator data={data} refresh={refresh} notify={notify} go={go} />
              </div>{' '}
              {screen === 'questions' && (
                <QuestionBank data={data} refresh={refresh} notify={notify} />
              )}{' '}
              {screen === 'templates' && (
                <Templates data={data} refresh={refresh} notify={notify} />
              )}{' '}
              {screen === 'library' && <Library data={data} refresh={refresh} notify={notify} />}{' '}
              {screen === 'settings' && (
                <Configuration data={data} notify={notify} refresh={refresh} />
              )}
            </>
          )}
        </main>
        <footer className="studio-footer">
          <span>INGRESA PE STUDIO</span>
          <span>Una idea más cerca de publicarse.</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      )}
      {reconcile && (
        <Modal title="Vincular tarea de Runway" onClose={() => setReconcile(null)}>
          <p className="muted">
            Busca la solicitud original en Runway y pega su task ID. Se consultará esa tarea sin
            generar un video nuevo.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await api(`jobs/${reconcile}/reconcile`, { taskId: f.get('taskId') });
                setReconcile(null);
                await refresh();
                notify('Tarea vinculada. Se reanudará la consulta.');
              } catch (err) {
                notify(err instanceof Error ? err.message : 'No se pudo vincular.');
              }
            }}
          >
            <label>
              Task ID
              <input name="taskId" required placeholder="UUID de la tarea original" />
            </label>
            <button className="button primary">Vincular y reanudar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Dashboard({
  data: d,
  go,
  onJobAction,
}: {
  data: StudioData;
  go: (s: Screen) => void;
  onJobAction: (id: string, a: string) => Promise<void>;
}) {
  const [visibleJobs, setVisibleJobs] = useState(8);
  const active = d.stats.active;
  const complete = d.stats.completed;
  const reserved = d.stats.reserved_cents;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EL ESTUDIO DE TU ACADEMIA</div>
          <h1>
            Aquí empieza una buena lección<span className="red-dot">.</span>
          </h1>
          <p>Prepara contenido que enseña, resuelve dudas y acerca a tus estudiantes a la UNSA.</p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
      <section className="hero" data-od-id="production-hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span />
            APRENDER COMIENZA CON UNA PREGUNTA
          </span>
          <h2>
            Una pregunta.
            <br />
            Un mundo de
            <br />
            <em>posibilidades.</em>
          </h2>
          <p>
            Elige una pregunta. Dale tu formato.
            <br />
            Deja que tu personaje haga el resto.
          </p>
          <button className="button light" onClick={() => go('create')}>
            Preparar una lección <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="hero-art">
          <img
            src="/brand/mascot.webp"
            alt="Dinosaurio de Ingresa PE, tu personaje para los videos"
          />
          <div className="hero-caption">
            <span className="live-dot" /> TU MARCA, SIEMPRE EN ESCENA
          </div>
        </div>
        <span className="hero-number">01 / STUDIO</span>
      </section>
      <section className="stats-grid" data-od-id="production-metrics">
        {[
          {
            label: 'Contenido terminado',
            value: complete,
            note: 'Listo para revisar y compartir',
            Icon: CheckCircle2,
          },
          {
            label: 'En producción',
            value: active,
            note: 'Trabajos en cola y en proceso',
            Icon: Activity,
          },
          {
            label: 'Preguntas disponibles',
            value: d.questions.length,
            note: `${d.questions.filter((q) => q.approved).length} con explicación aprobada`,
            Icon: BookOpen,
          },
          {
            label: 'Presupuesto reservado',
            value: money(reserved),
            note: `De ${money(d.runway.monthlyBudgetCents)} para Runway este mes`,
            Icon: Wallet,
          },
        ].map(({ label, value, note, Icon }) => (
          <article className="stat" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <div className="section-heading">
        <div>
          <h2>Cada área, una nueva oportunidad.</h2>
          <p>Elige el camino de tus estudiantes y prepara algo que les ayude a avanzar.</p>
        </div>
        <button className="text-button" onClick={() => go('questions')}>
          Explorar preguntas <ArrowUpRight size={16} />
        </button>
      </div>
      <section className="area-grid">
        {d.areas.map((a, i) => (
          <button
            key={a.id}
            className="area-card"
            style={{ '--area': a.color } as React.CSSProperties}
            onClick={() => go('questions')}
          >
            <span className="area-symbol">{['✳', '⌘', '✺'][i]}</span>
            <div>
              <AreaBadge area={a} />
              <h3>
                {['Entender la vida.', 'Resolver lo imposible.', 'Comprender nuestro mundo.'][i]}
              </h3>
              <span>
                {d.questions.filter((q) => q.areas.some((qa) => qa.id === a.id)).length} preguntas
                en el banco
              </span>
            </div>
            <ArrowUpRight size={20} />
          </button>
        ))}
      </section>
      <section className="content-panel">
        <div className="panel-heading">
          <div>
            <h2>Tu mesa de producción</h2>
            <p>La actividad más reciente de tus producciones.</p>
          </div>
          <span className="counter">{d.stats.total_jobs} trabajos</span>
        </div>
        {d.jobs.length ? (
          <>
            <JobsTable jobs={d.jobs.slice(0, visibleJobs)} onAction={onJobAction} />
            {visibleJobs < d.jobs.length && (
              <div className="jobs-pagination">
                <span>
                  Mostrando {Math.min(visibleJobs, d.jobs.length)} de {d.jobs.length} trabajos
                  recientes
                </span>
                <button className="button small" onClick={() => setVisibleJobs((n) => n + 12)}>
                  Mostrar más trabajos
                </button>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="Tu primera producción empieza aquí"
            text="Elige una pregunta del banco y conviértela en tu próximo video o publicación."
            action={
              <button className="button" onClick={() => go('create')}>
                <Plus size={16} />
                Crear mi primer contenido
              </button>
            }
          />
        )}
      </section>
    </>
  );
}
