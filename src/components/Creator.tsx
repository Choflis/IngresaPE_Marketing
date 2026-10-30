'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  GraduationCap,
  Layers,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { QuestionVideo } from '@/video/QuestionVideo';
import { reviewProduction } from '@/lib/production-review';
import { catalogTemplates } from '@/lib/template-catalog';
import { NarrationSelector } from './NarrationSelector';
import type { VoiceSelection } from '@/lib/voices';
import { api, AreaBadge, KindIcon, money, type StudioData, type Screen } from './shared';
const steps = [
  { name: 'Preguntas', detail: 'Elige qué enseñar' },
  { name: 'Formato', detail: 'Dale una forma' },
  { name: 'Revisión', detail: 'Comprueba la respuesta' },
  { name: 'Producción', detail: 'Hazlo realidad' },
];
export function Creator({
  data: d,
  refresh,
  notify,
  go,
  launch,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  go: (s: Screen) => void;
  launch?: { versionId: number; nonce: number } | null;
}) {
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [area, setArea] = useState(''),
    [search, setSearch] = useState(''),
    [templateId, setTemplateId] = useState(d.templates[0]?.version_id ?? 0),
    [provider, setProvider] = useState<'demo' | 'fal'>('demo'),
    [voiceName, setVoiceName] = useState<VoiceSelection['name'] | ''>(
      d.narration.configured ? 'Puck' : '',
    ),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [script, setScript] = useState(''),
    [drafting, setDrafting] = useState(false),
    [slide, setSlide] = useState(0);
  const requestRef = useRef<{ signature: string; key: string } | null>(null);
  const template = d.templates.find((t) => t.version_id === templateId) ?? d.templates[0];
  useEffect(() => {
    if (!launch) return;
    const next = d.templates.find((t) => t.version_id === launch.versionId);
    if (next) {
      setTemplateId(next.version_id);
      setSlide(0);
      setStep(0);
    }
    // A catalog action starts a new selection of format. Polling must not reset a draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch]);
  const qs = d.questions.filter(
    (q) =>
      q.approved &&
      (!area || q.areas.some((a) => a.slug === area)) &&
      `${q.statement} ${q.course} ${q.topic}`.toLowerCase().includes(search.toLowerCase()),
  );
  const chosen = d.questions.filter((q) => selected.includes(q.id));
  const q = chosen[0] ?? qs[0];
  const configured = d.fal.configured;
  const falBlockReason = 'Conecta tu API key de fal.ai desde Configuración.';
  const review = reviewProduction(
    chosen,
    template?.composition ?? 'dino',
    template?.kind === 'video' ? provider : 'demo',
    template?.duration_seconds ?? 30,
  );
  const cost = review.costCents;
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
            challenge: template.composition === 'challenge',
            composition: template.composition,
          }
        : null,
    [q, template],
  );
  function toggle(id: string) {
    setError('');
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 25 ? [...s, id] : s,
    );
  }
  function move(next: number) {
    setError('');
    setStep(next);
    document.querySelector('.wizard-heading')?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }
  async function generate() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        questionIds: selected,
        templateVersionId: templateId,
        provider,
        voice:
          template.kind === 'video' && voiceName ? { provider: 'gemini', name: voiceName } : null,
        name: `${template.name} · ${chosen.length} ${chosen.length === 1 ? 'pregunta' : 'preguntas'}`,
      };
      const signature = JSON.stringify(payload);
      if (requestRef.current?.signature !== signature)
        requestRef.current = { signature, key: crypto.randomUUID() };
      await api('batches', payload, { 'Idempotency-Key': requestRef.current!.key });
      requestRef.current = null;
      await refresh();
      notify(
        `${chosen.length} ${chosen.length === 1 ? 'trabajo listo' : 'trabajos listos'} en la cola. Puedes seguir su avance aquí.`,
      );
      go('home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el lote.');
    } finally {
      setLoading(false);
    }
  }
  const titles = [
    'Prepara tu próxima clase.',
    'Elige cómo enseñar',
    'Revisa antes de compartir',
    'Todo listo para producir',
  ];
  const descriptions = [
    'Empieza por una buena pregunta. Nosotros te ayudamos con el resto.',
    'Una misma identidad, distintas maneras de explicar.',
    'Comprueba la clave y la explicación que aparecerán en el video.',
    'Confirma el contenido y el modo de producción de este lote.',
  ];
  return (
    <div className="academic-creator">
      <div className="page-heading wizard-heading">
        <div>
          <div className="eyebrow">
            <GraduationCap size={15} /> TALLER DE CONTENIDO
          </div>
          <h1>{titles[step]}</h1>
          <p>{descriptions[step]}</p>
        </div>
        <span className="lesson-counter">
          Lección creativa <strong>{String(step + 1).padStart(2, '0')}</strong>
          <span>/ 04</span>
        </span>
      </div>
      <nav className="wizard-stepper" aria-label="Pasos para crear contenido">
        {steps.map((s, i) => (
          <button
            key={s.name}
            className={`wizard-step ${step === i ? 'current' : ''} ${step > i ? 'done' : ''}`}
            aria-current={step === i ? 'step' : undefined}
            disabled={i > step}
            onClick={() => move(i)}
          >
            <span className="wizard-step-number">{step > i ? <Check size={17} /> : i + 1}</span>
            <span>
              <strong>{s.name}</strong>
              <small>{s.detail}</small>
            </span>
            {i < 3 && <ChevronRight size={16} className="step-chevron" />}
          </button>
        ))}
      </nav>
      <div className="creator-grid">
        <div className="creator-main">
          <section className="content-panel lesson-panel" key={step}>
            {step === 0 && (
              <>
                <div className="lesson-panel-heading">
                  <div>
                    <span className="lesson-label">PRIMERO, EL CONOCIMIENTO</span>
                    <h2>¿A quién vas a ayudar hoy?</h2>
                    <p>Elige un área y selecciona hasta 25 preguntas revisadas.</p>
                  </div>
                  <button className="button small" onClick={() => go('questions')}>
                    <Plus size={16} />
                    Añadir pregunta
                  </button>
                </div>
                <div className="subject-pills">
                  <button className={!area ? 'active' : ''} onClick={() => setArea('')}>
                    <BookOpen size={16} />
                    Todas las áreas
                  </button>
                  {d.areas.map((a, i) => (
                    <button
                      key={a.id}
                      className={area === a.slug ? 'active' : ''}
                      onClick={() => setArea(a.slug)}
                      style={{ '--subject': a.color } as React.CSSProperties}
                    >
                      <span className="subject-dot" />
                      {a.name}
                      <small>
                        {
                          d.questions.filter(
                            (q) => q.approved && q.areas.some((x) => x.id === a.id),
                          ).length
                        }
                      </small>
                    </button>
                  ))}
                </div>
                <div className="filter-row">
                  <div className="search-field">
                    <Search size={18} />
                    <input
                      aria-label="Buscar preguntas para crear"
                      placeholder="Busca un curso, tema o pregunta…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="question-list-heading">
                  <span>{qs.length} preguntas disponibles</span>
                  <button
                    className="text-button"
                    onClick={() => setSelected(qs.slice(0, 25).map((q) => q.id))}
                  >
                    Seleccionar visibles
                  </button>
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
                          {selected.includes(q.id) && <Check size={15} />}
                        </span>
                        <div>
                          <div className="option-meta">
                            <strong>{q.course}</strong>
                            <span>·</span>
                            <span>{q.topic}</span>
                            <span className="reviewed-label">
                              <CheckCircle2 size={12} />
                              Revisada
                            </span>
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
                      <BookOpen size={24} />
                      <h3>Aún no hay preguntas con ese filtro</h3>
                      <p>Prueba otro tema o añade una pregunta desde el banco.</p>
                    </div>
                  )}
                </div>
                <div className="selection-footer">
                  <span>
                    <CheckCircle2 size={15} />
                    <strong>{selected.length}</strong> de 25 preguntas seleccionadas
                  </span>
                  {selected.length > 0 && (
                    <button className="text-button" onClick={() => setSelected([])}>
                      Limpiar selección
                    </button>
                  )}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="lesson-panel-heading">
                  <div>
                    <span className="lesson-label">TU IDENTIDAD, SIEMPRE PRESENTE</span>
                    <h2>Una forma de contar cada idea</h2>
                    <p>El formato fija el diseño. Las preguntas y respuestas cambian.</p>
                  </div>
                </div>
                <div className="template-options wizard-formats">
                  {catalogTemplates(d.templates, templateId).map((t) => (
                    <button
                      key={t.version_id}
                      className={`template-option ${templateId === t.version_id ? 'selected' : ''}`}
                      aria-pressed={templateId === t.version_id}
                      onClick={() => {
                        setTemplateId(t.version_id);
                        setSlide(0);
                      }}
                    >
                      <div className={`format-swatch swatch-${t.kind}`}>
                        <KindIcon kind={t.kind} size={26} />
                        <span>
                          {t.kind === 'video' ? '9:16' : t.kind === 'image' ? '4:5' : '01 / 03'}
                        </span>
                      </div>
                      <strong>{t.name}</strong>
                      <p>{t.description}</p>
                      <small>
                        {t.kind === 'video'
                          ? 'Video con personaje'
                          : t.kind === 'image'
                            ? 'Una imagen por pregunta'
                            : 'Tres imágenes por pregunta'}
                      </small>
                      {templateId === t.version_id && (
                        <span className="template-check">
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="academic-tip">
                  <Sparkles size={19} />
                  <p>
                    <strong>Una idea, varias posibilidades.</strong> Puedes volver a usar estas
                    preguntas con otro formato cuando quieras.
                  </p>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="lesson-panel-heading">
                  <div>
                    <span className="lesson-label">ENSEÑAR TAMBIÉN ES REVISAR</span>
                    <h2>Que cada respuesta aporte algo</h2>
                    <p>Este contenido está aprobado en el banco. Compruébalo una vez más.</p>
                  </div>
                  <span className="review-count">
                    {chosen.length} {chosen.length === 1 ? 'pregunta' : 'preguntas'}
                  </span>
                </div>
                <div className="review-list">
                  {chosen.map((question, i) => (
                    <article className="review-question" key={question.id}>
                      <div className="review-question-top">
                        <span>Pregunta {String(i + 1).padStart(2, '0')}</span>
                        <strong>
                          {question.course} · {question.topic}
                        </strong>
                      </div>
                      <h3>{question.statement}</h3>
                      <div className="review-answer">
                        <CheckCircle2 size={19} />
                        <div>
                          <span>Respuesta correcta</span>
                          <strong>
                            {question.choices.find((c) => c.correct)?.label}.{' '}
                            {question.choices.find((c) => c.correct)?.text}
                          </strong>
                        </div>
                      </div>
                      <div className="review-explanation">
                        <span>Lo que explicará el dinosaurio</span>
                        <p>{question.explanation}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="academic-tip">
                  <ShieldCheck size={19} />
                  <p>
                    Para cambiar una respuesta, revisa su pregunta en el banco antes de generar. Se
                    conserva una versión del contenido usado.
                  </p>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="lesson-panel-heading">
                  <div>
                    <span className="lesson-label">DE TU ESTUDIO A SU APRENDIZAJE</span>
                    <h2>Una última mirada al plan</h2>
                    <p>Tu lote se guardará y podrá procesarse aunque cierres esta página.</p>
                  </div>
                </div>
                <div className="batch-summary">
                  <div>
                    <span>Contenido</span>
                    <strong>
                      {chosen.length}{' '}
                      {chosen.length === 1 ? 'pregunta revisada' : 'preguntas revisadas'}
                    </strong>
                  </div>
                  <div>
                    <span>Formato</span>
                    <strong>
                      <KindIcon kind={template.kind} size={16} />
                      {template.name}
                    </strong>
                  </div>
                  <div>
                    <span>Entrega</span>
                    <strong>
                      {template.kind === 'video'
                        ? `${chosen.length} ${chosen.length === 1 ? 'video' : 'videos'} MP4`
                        : template.kind === 'carousel'
                          ? `${chosen.length * 3} imágenes PNG`
                          : `${chosen.length} ${chosen.length === 1 ? 'imagen' : 'imágenes'} PNG`}
                    </strong>
                  </div>
                </div>
                {template.kind === 'video' ? (
                  <>
                    <h3 className="provider-heading">¿Cómo quieres producirlo?</h3>
                    <NarrationSelector
                      value={voiceName}
                      configured={d.narration.configured}
                      onChange={setVoiceName}
                    />
                    <div className="provider-options">
                      <button
                        className={`provider-option ${provider === 'fal' ? 'selected' : ''}`}
                        onClick={() => setProvider('fal')}
                        disabled={!configured}
                      >
                        <span className="provider-symbol fal">f</span>
                        <div>
                          <strong>
                            fal.ai · Anima tu dinosaurio <span className="mini-tag">IA</span>
                          </strong>
                          <small>
                            {configured
                              ? 'LongCat 480p · 15 fps · $0.005 por segundo de animación.'
                              : falBlockReason}
                          </small>
                        </div>
                        <span className="radio">{provider === 'fal' && <i />}</span>
                      </button>
                      {!configured && (
                        <button className="connect-inline" onClick={() => go('settings')}>
                          {d.fal.configured
                            ? 'Configurar fal.ai'
                            : 'Conectar fal.ai en Configuración'}{' '}
                          <ArrowRight size={16} />
                        </button>
                      )}
                      <button
                        className={`provider-option ${provider === 'demo' ? 'selected' : ''}`}
                        onClick={() => setProvider('demo')}
                      >
                        <span className="provider-symbol">ip</span>
                        <div>
                          <strong>
                            Video local <span className="mini-tag">SIN FAL.AI</span>
                          </strong>
                          <small>
                            Anima la imagen del dinosaurio en tu equipo. Puedes añadir la voz de
                            Gemini seleccionada arriba.
                          </small>
                        </div>
                        <span className="radio">{provider === 'demo' && <i />}</span>
                      </button>
                    </div>
                    {!configured && (
                      <div className="academic-tip">
                        <TriangleAlert size={20} />
                        <p>
                          Para crear un video ahora, elige <strong>Video local</strong> y pulsa{' '}
                          <strong>
                            Generar {selected.length} {selected.length === 1 ? 'video' : 'videos'}
                          </strong>
                          . Para animarlo con IA, conecta tu clave de fal.ai.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="academic-tip">
                    <Layers size={20} />
                    <p>
                      Este formato se compone directamente en tu estudio, sin una API de imágenes
                      pagada.
                    </p>
                  </div>
                )}
                {!d.workerOnline && (
                  <div className="notice">
                    <TriangleAlert size={18} />
                    <span>
                      Los trabajos se guardarán y comenzarán cuando el motor esté conectado.
                    </span>
                  </div>
                )}
                <div className="cost-summary">
                  <div>
                    <span>Reserva estimada de este lote</span>
                    <strong>{money(cost)}</strong>
                  </div>
                  <span>{cost ? '$0.005 por segundo generado' : 'Composición local'}</span>
                </div>
                <p className="fine-print">
                  {cost
                    ? `Cada video dura ${template.duration_seconds} segundos. La animación se genera en 480p a 15 fps. La reserva cubre fal.ai y no incluye el consumo de Gemini ni representa el saldo real de tu cuenta.`
                    : template.kind === 'video' && voiceName
                      ? 'La animación se procesa en tu equipo; la narración usa la cuota de Gemini. La reserva mostrada corresponde solo a fal.ai.'
                      : 'Tu equipo procesa los archivos. La prueba local se identifica como demostración.'}
                </p>
              </>
            )}
          </section>
          {review.errors.length > 0 && (
            <div className="error-message" role="alert">
              <strong>Revisa el contenido seleccionado</strong>
              <ul>
                {review.errors.map((issue) => (
                  <li key={issue.id}>{issue.message}</li>
                ))}
              </ul>
              <span>
                Puedes quitar la pregunta o elegir otro formato. No se enviará una generación
                mientras haya errores.
              </span>
            </div>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <div className="wizard-actions">
            <div>
              {step > 0 ? (
                <button className="button" disabled={loading} onClick={() => move(step - 1)}>
                  <ArrowLeft size={17} />
                  Atrás
                </button>
              ) : (
                <span className="wizard-helper">Una buena pregunta es un gran comienzo.</span>
              )}
            </div>
            {step < 3 ? (
              <button
                className="button primary"
                disabled={step === 0 && !selected.length}
                onClick={() => move(step + 1)}
              >
                {['Continuar a formato', 'Revisar contenido', 'Preparar producción'][step]}
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="button primary"
                disabled={
                  loading ||
                  !selected.length ||
                  review.errors.length > 0 ||
                  (provider === 'fal' && !configured && template.kind === 'video') ||
                  (template.kind === 'video' && Boolean(voiceName) && !d.narration.configured)
                }
                onClick={generate}
              >
                {loading ? <LoaderCircle className="spin" size={18} /> : <Clapperboard size={18} />}
                Generar {selected.length}{' '}
                {template.kind === 'video'
                  ? selected.length === 1
                    ? 'video'
                    : 'videos'
                  : selected.length === 1
                    ? 'publicación'
                    : 'publicaciones'}
              </button>
            )}
          </div>
        </div>
        <aside className="preview-column academic-preview">
          <div className="preview-heading">
            <div>
              <span className="lesson-label">TU PIZARRA CREATIVA</span>
              <h3>Vista previa</h3>
            </div>
            <span className="mini-tag">{template?.kind === 'video' ? '9:16' : '4:5'}</span>
          </div>
          {props && template.kind === 'video' ? (
            <div className="phone-preview">
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
            </div>
          ) : q ? (
            <div className="paper-preview">
              <img src="/brand/logo.png" alt="Ingresa PE" />
              <span className="paper-course">{q.course}</span>
              <h3>
                {slide === 1
                  ? 'Una pista para resolver'
                  : slide === 2
                    ? 'Entiende la respuesta'
                    : q.statement}
              </h3>
              {slide === 0 ? (
                q.choices.map((c) => (
                  <div className="paper-choice" key={c.label}>
                    <strong>{c.label}</strong>
                    {c.text}
                  </div>
                ))
              ) : (
                <p>
                  {slide === 1
                    ? 'Lee con atención, identifica el concepto y compara cada alternativa.'
                    : q.explanation}
                </p>
              )}
              <footer>Practica para la UNSA en ingresa.pe</footer>
            </div>
          ) : (
            <div className="preview-empty">
              <BookOpen />
              Elige una pregunta para verla aquí
            </div>
          )}
          {template?.kind === 'carousel' && (
            <div className="carousel-controls">
              {['Pregunta', 'Pista', 'Explicación'].map((label, i) => (
                <button
                  key={label}
                  className={slide === i ? 'active' : ''}
                  onClick={() => setSlide(i)}
                >
                  {i + 1}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="preview-note">
            <span className="live-dot" />
            {template?.kind === 'video'
              ? 'Muestra del diseño sin narración · la voz se incorpora al generar'
              : 'Maqueta del contenido · el archivo final se compone al generar'}
          </div>
          <div className="preview-selection">
            <CheckCircle2 size={17} />
            <span>
              <strong>{selected.length}</strong> {selected.length === 1 ? 'pregunta' : 'preguntas'}{' '}
              en tu lección
            </span>
            <span>{template?.name}</span>
          </div>
          {step === 2 && (
            <div className="assistant-card">
              <Sparkles size={22} />
              <h3>Una ayuda con las palabras</h3>
              <p>Prepara un borrador a partir de la explicación del banco.</p>
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
                {drafting ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
                Preparar guion
              </button>
              {script && <div className="draft-result">{script}</div>}
              <small>Los videos conservan la explicación aprobada.</small>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
