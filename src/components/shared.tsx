'use client';
import {
  X,
  LoaderCircle,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Check,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import type { Area, Job, Question, Template, Asset } from '@/lib/types';
export type StudioData = {
  user: { id: string; email: string };
  areas: Area[];
  courses: { id: number; name: string }[];
  questions: Question[];
  templates: Template[];
  jobs: Job[];
  assets: Asset[];
  workerOnline: boolean;
  stats: { total_jobs: number; completed: number; active: number; reserved_cents: number };
  runway: {
    configured: boolean;
    avatarStatus?: string;
    verifiedAt?: string | null;
    credits?: number | null;
    avatarConfigured: boolean;
    monthlyBudgetCents: number;
  };
};
export type Screen = 'home' | 'create' | 'questions' | 'templates' | 'library' | 'settings';
export async function api(path: string, data?: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(`/api/${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error ?? 'No se pudo completar la operación.');
  return v;
}
export function AreaBadge({ area }: { area: Area }) {
  return (
    <span className="area-badge" style={{ '--area': area.color } as React.CSSProperties}>
      <i />
      {area.name}
    </span>
  );
}
const labels: Record<string, string> = {
  queued: 'En cola',
  generating: 'Animando dinosaurio',
  rendering: 'Montando',
  completed: 'Completado',
  failed: 'Error',
  needs_attention: 'Revisar Runway',
  cancelled: 'Cancelado',
};
export function Status({ status }: { status: string }) {
  const Icon =
    status === 'completed'
      ? Check
      : status === 'queued'
        ? Clock
        : ['failed', 'needs_attention'].includes(status)
          ? AlertCircle
          : ['generating', 'rendering'].includes(status)
            ? LoaderCircle
            : Square;
  return (
    <span className={`status status-${status}`}>
      <Icon size={12} className={['generating', 'rendering'].includes(status) ? 'spin' : ''} />
      {labels[status] ?? status}
    </span>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Film size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function KindIcon({ kind, size = 19 }: { kind: string; size?: number }) {
  return kind === 'video' ? (
    <Film size={size} />
  ) : kind === 'carousel' ? (
    <Layers size={size} />
  ) : (
    <ImageIcon size={size} />
  );
}
export const money = (cents: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function JobsTable({
  jobs,
  onAction,
}: {
  jobs: Job[];
  onAction: (id: string, action: string) => Promise<void>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CONTENIDO</th>
            <th>ÁREA</th>
            <th>FORMATO</th>
            <th>ESTADO</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td>
                <div className="table-title">
                  <span className={`file-icon ${j.kind}`}>
                    <KindIcon kind={j.kind} />
                  </span>
                  <div>
                    <strong>{j.statement}</strong>
                    <small>
                      {j.provider === 'demo' ? 'Producción local' : 'Runway'} ·{' '}
                      {new Date(j.created_at).toLocaleDateString('es-PE')}
                    </small>
                    {j.error_message && <span className="row-error">{j.error_message}</span>}
                  </div>
                </div>
              </td>
              <td>
                <div className="badge-stack">
                  {j.areas.map((a) => (
                    <AreaBadge key={a.id} area={a} />
                  ))}
                </div>
              </td>
              <td>
                <span className="muted">{j.template_name}</span>
              </td>
              <td>
                <Status status={j.status} />
              </td>
              <td>
                <div className="row-actions">
                  {j.output_asset_id && j.status === 'completed' && (
                    <>
                      <a
                        className="icon-button"
                        href={`/api/media/${j.output_asset_id}`}
                        target="_blank"
                        title="Abrir archivo"
                        rel="noreferrer"
                      >
                        <Play size={16} />
                      </a>
                      <a
                        className="icon-button"
                        href={`/api/media/${j.output_asset_id}?download=1`}
                        title="Descargar"
                      >
                        <Download size={16} />
                      </a>
                    </>
                  )}
                  {j.status === 'failed' && (
                    <button
                      className="icon-button"
                      title="Reintentar sin nueva generación"
                      onClick={() => onAction(j.id, 'retry')}
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  {['queued', 'generating', 'rendering'].includes(j.status) && (
                    <button
                      className="icon-button"
                      title="Cancelar trabajo"
                      onClick={() => onAction(j.id, 'cancel')}
                    >
                      <X size={16} />
                    </button>
                  )}
                  {j.status === 'needs_attention' && (
                    <button
                      className="button subtle small"
                      onClick={() => onAction(j.id, 'reconcile')}
                    >
                      Vincular tarea
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
