'use client';
import { useState, useMemo, useRef } from 'react';
import { Player } from '@remotion/player';
import {
  Search,
  Check,
  ArrowRight,
  Plus,
  Clapperboard,
  Sparkles,
  LoaderCircle,
  BookOpen,
  TriangleAlert,
} from 'lucide-react';
import { QuestionVideo } from '@/video/QuestionVideo';
import { estimateCostCents, narrationFor } from '@/lib/validation';
import { api, AreaBadge, KindIcon, money, type StudioData, type Screen } from './shared';
export function Creator({
  data: d,
  refresh,
  notify,
  go,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  go: (s: Screen) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [area, setArea] = useState(''),
    [search, setSearch] = useState(''),
    [templateId, setTemplateId] = useState(d.templates[0]?.version_id ?? 0),
    [provider, setProvider] = useState<'demo' | 'runway'>('demo'),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [script, setScript] = useState(''),
    [drafting, setDrafting] = useState(false);
  const requestRef = useRef<{ signature: string; key: string } | null>(null);
  const template = d.templates.find((t) => t.version_id === templateId) ?? d.templates[0];
  const qs = d.questions.filter(
    (q) =>
      q.approved &&
      (!area || q.areas.some((a) => a.slug === area)) &&
      `${q.statement} ${q.course} ${q.topic}`.toLowerCase().includes(search.toLowerCase()),
  );
  const q = d.questions.find((q) => q.id === selected[0]) ?? qs[0];
  const chosen = d.questions.filter((q) => selected.includes(q.id));
  const cost =
    template?.kind === 'video' && provider === 'runway'
      ? chosen.reduce((n, q) => n + estimateCostCents(narrationFor(q)), 0)
      : 0;
  const props = useMemo(
    () =>
      q && template
        ? {
            statement: q.statement,
            explanation: q.explanation,
            choices: q.choices,
            course: q.course,
            area: q.areas.map((a) => a.name).join(' / '),
            accent: template.accent.trim(),
            demo: true,
            durationSeconds: template.duration_seconds,
            challenge: template.name === 'Reto de admisión',
          }
        : null,
    [q, template],
  );
  const configured = d.runway.configured && d.runway.avatarConfigured;
  function toggle(id: string) {
    setError('');
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 25 ? [...s, id] : s,
    );
  }
  async function generate() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        questionIds: selected,
        templateVersionId: templateId,
        provider,
        name: `${template.name} · ${chosen.length} ${chosen.length === 1 ? 'pregunta' : 'preguntas'}`,
      };
      const signature = JSON.stringify(payload);
      if (requestRef.current?.signature !== signature)
        requestRef.current = { signature, key: crypto.randomUUID() };
      await api('batches', payload, { 'Idempotency-Key': requestRef.current!.key });
      requestRef.current = null;
      setSelected([]);
      await refresh();
      notify(`${chosen.length} trabajos añadidos a la cola.`);
      go('home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el lote.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DE LA IDEA A LA PUBLICACIÓN</div>
          <h1>
            Vamos a crear<span className="red-dot">.</span>
          </h1>
          <p>Una pregunta o un lote completo. Tú eliges el siguiente paso.</p>
        </div>
        <span className="private-label">
          <Clapperboard size={15} />
          MESA DE PRODUCCIÓN
        </span>
      </div>
      <div className="creator-grid">
        <div className="creator-main">
          <section className="content-panel creator-section">
            <div className="step-heading">
              <span>01</span>
              <div>
                <h2>El contenido empieza con una pregunta</h2>
                <p>Selecciona hasta 25 preguntas aprobadas de tu banco.</p>
              </div>
              <button
                className="icon-button"
                title="Añadir pregunta"
                onClick={() => go('questions')}
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="filter-row">
              <div className="search-field">
                <Search size={16} />
                <input
                  aria-label="Buscar preguntas para crear"
                  placeholder="Busca una pregunta, curso o tema…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por área"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {d.areas.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="question-options">
              {qs.length ? (
                qs.map((q) => (
                  <button
                    key={q.id}
                    className={`question-option ${selected.includes(q.id) ? 'selected' : ''}`}
                    onClick={() => toggle(q.id)}
                    aria-pressed={selected.includes(q.id)}
                  >
                    <span className="checkbox">
                      {selected.includes(q.id) && <Check size={13} />}
                    </span>
                    <div>
                      <div className="option-meta">
                        <strong>{q.course}</strong>
                        <span>·</span>
                        <span>{q.topic}</span>
                      </div>
                      <p>{q.statement}</p>
                      <div className="badge-stack">
                        {q.areas.map((a) => (
                          <AreaBadge key={a.id} area={a} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="inline-empty">
                  No hay preguntas aprobadas con ese filtro. Puedes añadirlas en el banco.
                </div>
              )}
            </div>
            <div className="selection-footer">
              <span>
                <strong>{selected.length}</strong> preguntas seleccionadas
              </span>
              <button
                className="text-button"
                onClick={() => setSelected(qs.slice(0, 25).map((q) => q.id))}
              >
                Seleccionar visibles
              </button>
            </div>
          </section>
          <section className="content-panel creator-section">
            <div className="step-heading">
              <span>02</span>
              <div>
                <h2>Un formato que se siente tuyo</h2>
                <p>El diseño se conserva en cada publicación.</p>
              </div>
            </div>
            <div className="template-options">
              {d.templates.map((t) => (
                <button
                  key={t.version_id}
                  className={`template-option ${templateId === t.version_id ? 'selected' : ''}`}
                  onClick={() => setTemplateId(t.version_id)}
                >
                  <KindIcon kind={t.kind} size={23} />
                  <strong>{t.name}</strong>
                  <small>
                    {t.kind === 'video'
                      ? `Video · ${t.duration_seconds}s en demo`
                      : t.kind === 'image'
                        ? 'Publicación · PNG'
                        : 'Carrusel · 3 PNG'}
                  </small>
                  {templateId === t.version_id && (
                    <span className="template-check">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
          <section className="content-panel creator-section">
            <div className="step-heading">
              <span>03</span>
              <div>
                <h2>Luces, dinosaurio, acción</h2>
                <p>
                  {template?.kind === 'video'
                    ? 'Elige cómo producir este lote.'
                    : 'Este formato se compone localmente, sin generación visual pagada.'}
                </p>
              </div>
            </div>
            {template?.kind === 'video' && (
              <div className="provider-options">
                <button
                  className={`provider-option ${provider === 'demo' ? 'selected' : ''}`}
                  onClick={() => setProvider('demo')}
                >
                  <span className="provider-symbol">ip</span>
                  <div>
                    <strong>
                      Demostración local <span className="mini-tag">SIN API</span>
                    </strong>
                    <small>
                      Mascota con movimiento de prueba, sin voz ni sincronización labial.
                    </small>
                  </div>
                  <span className="radio">{provider === 'demo' && <i />}</span>
                </button>
                <button
                  className={`provider-option ${provider === 'runway' ? 'selected' : ''}`}
                  onClick={() => setProvider('runway')}
                  disabled={!configured}
                >
                  <span className="provider-symbol runway">R</span>
                  <div>
                    <strong>
                      Runway <span className="mini-tag">DINO HABLANDO</span>
                    </strong>
                    <small>
                      {configured
                        ? 'Actuación y voz generadas para cada respuesta.'
                        : 'Conecta tu API key y avatar para activar la generación real.'}
                    </small>
                  </div>
                  <span className="radio">{provider === 'runway' && <i />}</span>
                </button>
              </div>
            )}
            {!d.workerOnline && (
              <div className="notice">
                <TriangleAlert size={17} />
                <span>
                  El motor está desconectado. Los trabajos se guardarán y comenzarán al ejecutar el
                  worker.
                </span>
              </div>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <div className="production-footer">
              <div>
                <span>Reserva estimada del lote</span>
                <strong>
                  {money(cost)} <small>USD</small>
                </strong>
              </div>
              <button
                className="button primary"
                onClick={generate}
                disabled={!selected.length || loading}
              >
                {loading ? <LoaderCircle className="spin" size={17} /> : <Clapperboard size={17} />}
                Producir {selected.length || ''}{' '}
                {template?.kind === 'video' ? 'videos' : 'publicaciones'}
                <ArrowRight size={16} />
              </button>
            </div>
            <p className="fine-print">
              {provider === 'runway' && template?.kind === 'video'
                ? 'La reserva es una estimación conservadora, no el cobro final. El audio determina la duración del video.'
                : 'La producción local usa recursos de tu equipo. El modo demo sirve para verificar el formato.'}
            </p>
          </section>
        </div>
        <aside className="preview-column">
          <div className="preview-heading">
            <span className="eyebrow">ASÍ SE VERÁ TU FORMATO</span>
            <span className="mini-tag">9:16</span>
          </div>
          <div className="phone-preview">
            {props ? (
              <Player
                component={QuestionVideo}
                inputProps={props}
                durationInFrames={template.duration_seconds * 30}
                compositionWidth={720}
                compositionHeight={1280}
                fps={30}
                controls
                style={{ width: '100%' }}
              />
            ) : (
              <div className="preview-empty">
                <BookOpen />
                Selecciona una pregunta
              </div>
            )}
          </div>
          <div className="preview-note">
            <span className="live-dot" />
            Vista previa local · personaje de demostración
          </div>
          <div className="assistant-card">
            <Sparkles size={19} />
            <h3>Dale forma a la explicación.</h3>
            <p>Prepara un borrador a partir de la respuesta del banco.</p>
            <button
              className="button full"
              disabled={!q || drafting}
              onClick={async () => {
                if (!q) return;
                setDrafting(true);
                try {
                  const r = await api('assistant/draft', { questionId: q.id });
                  setScript(`${r.script}\n\n${r.source}`);
                } catch (e) {
                  notify(e instanceof Error ? e.message : 'No se pudo preparar.');
                } finally {
                  setDrafting(false);
                }
              }}
            >
              {drafting ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}
              Preparar guion
            </button>
            {script && <div className="draft-result">{script}</div>}
            <small>Los videos usan la explicación aprobada del banco.</small>
          </div>
        </aside>
      </div>
    </>
  );
}
