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
  CheckCircle2,
  LoaderCircle,
  Menu,
  X,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { api, type StudioData, type Screen, Modal } from './shared';
import { Creator } from './Creator';
import { QuestionBank } from './QuestionBank';
import { Templates, Library, Configuration } from './Workspace';
import { Dashboard } from './Dashboard';
import { FormatDetail } from './FormatDetail';
import { Voices } from './Voices';
const nav = [
  { id: 'home', name: 'Inicio', Icon: Home },
  { id: 'create', name: 'Crear contenido', Icon: Clapperboard },
  { id: 'questions', name: 'Banco de preguntas', Icon: BookOpen },
  { id: 'templates', name: 'Formatos', Icon: Shapes },
  { id: 'voices', name: 'Voces', Icon: Volume2 },
  { id: 'library', name: 'Biblioteca', Icon: FolderOpen },
] as const;
export function Studio() {
  const [data, setData] = useState<StudioData | null>(null),
    [screen, setScreen] = useState<Screen>('home'),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [mobile, setMobile] = useState(false),
    [reconcile, setReconcile] = useState<string | null>(null),
    [formatId, setFormatId] = useState<number | null>(null),
    [launch, setLaunch] = useState<{ versionId: number; nonce: number } | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await api('studio'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar.');
    }
  }, []);
  useEffect(() => {
    const readLocation = () => {
      const [view, id] = location.hash.slice(1).split('/');
      const known = [
        'home',
        'create',
        'questions',
        'templates',
        'library',
        'settings',
        'voices',
        'format',
      ];
      setScreen(known.includes(view) ? (view as Screen) : 'home');
      setFormatId(view === 'format' && Number.isSafeInteger(Number(id)) ? Number(id) : null);
    };
    readLocation();
    addEventListener('hashchange', readLocation);
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      clearInterval(id);
      removeEventListener('hashchange', readLocation);
    };
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
  const openFormat = (id: number) => {
    setFormatId(id);
    setScreen('format');
    location.hash = `format/${id}`;
    setMobile(false);
  };
  const useFormat = (id: number) => {
    setLaunch((last) => ({ versionId: id, nonce: (last?.nonce ?? 0) + 1 }));
    go('create');
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
  const name =
    screen === 'format'
      ? (data?.templates.find((t) => t.version_id === formatId)?.name ?? 'Formato')
      : (nav.find((n) => n.id === screen)?.name ?? 'Configuración');
  return (
    <div className="studio-layout">
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src="/brand/logo.png" alt="Ingresa PE" />
          <span>STUDIO</span>
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
              aria-current={screen === id ? 'page' : undefined}
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
              {screen === 'home' && (
                <Dashboard
                  data={data}
                  go={go}
                  onOpen={openFormat}
                  onUse={useFormat}
                  onJobAction={onJobAction}
                />
              )}{' '}
              <div hidden={screen !== 'create'}>
                <Creator data={data} refresh={refresh} notify={notify} go={go} launch={launch} />
              </div>{' '}
              {screen === 'questions' && (
                <QuestionBank data={data} refresh={refresh} notify={notify} />
              )}{' '}
              {screen === 'templates' && (
                <Templates
                  data={data}
                  refresh={refresh}
                  notify={notify}
                  onOpen={openFormat}
                  onUse={useFormat}
                />
              )}{' '}
              {screen === 'format' && (
                <FormatDetail
                  data={data}
                  versionId={formatId}
                  onBack={() => go('home')}
                  onUse={useFormat}
                  onVoices={() => go('voices')}
                />
              )}
              {screen === 'voices' && <Voices onBack={() => go('create')} />}
              {screen === 'library' && (
                <Library data={data} refresh={refresh} notify={notify} />
              )}{' '}
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
        <Modal title="Vincular solicitud de fal.ai" onClose={() => setReconcile(null)}>
          <p className="muted">
            Busca la solicitud original en fal.ai y pega su request ID. Se consultará esa tarea sin
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
              Request ID
              <input name="taskId" required placeholder="UUID de la tarea original" />
            </label>
            <button className="button primary">Vincular y reanudar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
