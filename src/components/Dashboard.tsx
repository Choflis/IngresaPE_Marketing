'use client';
import { ArrowUpRight, CheckCircle2, Activity, Wallet, Shapes, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { FormatCatalog } from './FormatCatalog';
import { catalogTemplates } from '@/lib/template-catalog';
import { Empty, JobsTable, money, type Screen, type StudioData } from './shared';

export function Dashboard({
  data: d,
  go,
  onOpen,
  onUse,
  onJobAction,
}: {
  data: StudioData;
  go: (s: Screen) => void;
  onOpen: (id: number) => void;
  onUse: (id: number) => void;
  onJobAction: (id: string, action: string) => Promise<void>;
}) {
  const [visibleJobs, setVisibleJobs] = useState(8);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">TU ESTUDIO DE CONTENIDO EDUCATIVO</div>
          <h1>Una idea. Muchos formatos.</h1>
          <p>Elige cómo contar tu próxima lección. Tu dinosaurio, tus preguntas y tu voz.</p>
        </div>
        <button className="button" onClick={() => go('voices')}>
          <Volume2 size={17} />
          Explorar voces
        </button>
      </div>
      <div className="section-heading catalog-heading">
        <div>
          <h2>¿Qué vamos a crear hoy?</h2>
          <p>{catalogTemplates(d.templates).length} formatos para enseñar a tu manera.</p>
        </div>
        <button className="text-button" onClick={() => go('templates')}>
          Gestionar formatos <ArrowUpRight size={15} />
        </button>
      </div>
      <FormatCatalog templates={d.templates} onOpen={onOpen} onUse={onUse} />
      <section className="studio-metrics" aria-label="Resumen de producción">
        {[
          {
            label: 'Formatos disponibles',
            value: catalogTemplates(d.templates).length,
            Icon: Shapes,
          },
          { label: 'Contenido terminado', value: d.stats.completed, Icon: CheckCircle2 },
          { label: 'En producción', value: d.stats.active, Icon: Activity },
          { label: 'Reserva de este mes', value: money(d.stats.reserved_cents), Icon: Wallet },
        ].map(({ label, value, Icon }) => (
          <div key={label}>
            <Icon size={18} />
            <span>
              {label}
              <strong>{value}</strong>
            </span>
          </div>
        ))}
      </section>
      <section className="content-panel recent-productions">
        <div className="panel-heading">
          <div>
            <h2>En tu mesa de producción</h2>
            <p>Tus últimos videos y publicaciones.</p>
          </div>
          <span className="counter">{d.stats.total_jobs} trabajos</span>
        </div>
        {d.jobs.length ? (
          <>
            <JobsTable jobs={d.jobs.slice(0, visibleJobs)} onAction={onJobAction} />
            {visibleJobs < d.jobs.length && (
              <div className="jobs-pagination">
                <span>
                  {Math.min(visibleJobs, d.jobs.length)} de {d.jobs.length} trabajos recientes
                </span>
                <button className="button small" onClick={() => setVisibleJobs((n) => n + 12)}>
                  Mostrar más trabajos
                </button>
              </div>
            )}
          </>
        ) : (
          <Empty
            title="Aquí aparecerán tus producciones"
            text="Elige un formato del catálogo para preparar tu primer contenido."
          />
        )}
      </section>
    </>
  );
}
