'use client';
import { useState } from 'react';
import { Plus, Search, BookOpen, CheckCircle2, LoaderCircle, ArrowUpRight } from 'lucide-react';
import { api, AreaBadge, Modal, Empty, type StudioData } from './shared';
import type { Question } from '@/lib/types';
export function QuestionBank({
  data: d,
  refresh,
  notify,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [search, setSearch] = useState(''),
    [area, setArea] = useState(''),
    [adding, setAdding] = useState(false),
    [detail, setDetail] = useState<Question | null>(null);
  const qs = d.questions.filter(
    (q) =>
      (!area || q.areas.some((a) => a.slug === area)) &&
      `${q.statement} ${q.course} ${q.topic}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EL CONOCIMIENTO ES EL PUNTO DE PARTIDA</div>
          <h1>
            Banco de preguntas<span className="red-dot">.</span>
          </h1>
          <p>Organiza, revisa y convierte cada buena pregunta en contenido.</p>
        </div>
        <button className="button primary" onClick={() => setAdding(true)}>
          <Plus size={17} />
          Nueva pregunta
        </button>
      </div>
      <div className="area-tabs">
        <button className={!area ? 'active' : ''} onClick={() => setArea('')}>
          Todas <span>{d.questions.length}</span>
        </button>
        {d.areas.map((a) => (
          <button
            key={a.id}
            className={area === a.slug ? 'active' : ''}
            onClick={() => setArea(a.slug)}
          >
            <AreaBadge area={a} />
            <span>{d.questions.filter((q) => q.areas.some((x) => x.id === a.id)).length}</span>
          </button>
        ))}
      </div>
      <section className="content-panel">
        <div className="panel-heading">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="Buscar en el banco"
              placeholder="Busca por pregunta, curso o tema…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="muted">{qs.length} preguntas</span>
        </div>
        {qs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PREGUNTA</th>
                  <th>CURSO / TEMA</th>
                  <th>ÁREA</th>
                  <th>REVISIÓN</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {qs.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <button className="question-link" onClick={() => setDetail(q)}>
                        {q.statement}
                      </button>
                      <small className="source-label">{q.source}</small>
                    </td>
                    <td>
                      <strong className="course-name">{q.course}</strong>
                      <small className="source-label">{q.topic}</small>
                    </td>
                    <td>
                      <div className="badge-stack">
                        {q.areas.map((a) => (
                          <AreaBadge key={a.id} area={a} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status ${q.approved ? 'status-completed' : 'status-queued'}`}
                      >
                        {q.approved ? (
                          <>
                            <CheckCircle2 size={12} />
                            Aprobada
                          </>
                        ) : (
                          'Pendiente'
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        title="Ver pregunta"
                        onClick={() => setDetail(q)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Una nueva pregunta, una nueva oportunidad"
            text="Prueba otro filtro o añade una pregunta a tu banco."
          />
        )}
      </section>
      <p className="fine-print">
        Las preguntas iniciales son contenido original de muestra. La etiqueta del área indica a
        quién orientar el contenido; una pregunta puede servir para varias áreas.
      </p>
      {adding && (
        <Modal title="Nueva pregunta" onClose={() => setAdding(false)}>
          <QuestionForm
            data={d}
            onSaved={async () => {
              setAdding(false);
              await refresh();
              notify('Pregunta guardada en el banco.');
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal title="Detalle de pregunta" onClose={() => setDetail(null)}>
          <div className="detail-meta">
            <strong>
              {detail.course} · {detail.topic}
            </strong>
            <div className="badge-stack">
              {detail.areas.map((a) => (
                <AreaBadge key={a.id} area={a} />
              ))}
            </div>
          </div>
          <h3 className="detail-question">{detail.statement}</h3>
          <div className="detail-choices">
            {detail.choices.map((c) => (
              <div className={c.correct ? 'correct' : ''} key={c.label}>
                <strong>{c.label}</strong>
                {c.text}
                {c.correct && <CheckCircle2 size={17} />}
              </div>
            ))}
          </div>
          <div className="explanation">
            <span className="eyebrow">EXPLICACIÓN</span>
            <p>{detail.explanation}</p>
          </div>
          <p className="fine-print">Fuente: {detail.source}</p>
          {!detail.approved && (
            <button
              className="button primary full"
              onClick={async () => {
                try {
                  await api(`questions/${detail.id}/approve`, {});
                  setDetail(null);
                  await refresh();
                  notify('Nueva versión aprobada. Lista para producir.');
                } catch (e) {
                  notify(e instanceof Error ? e.message : 'No se pudo aprobar.');
                }
              }}
            >
              <CheckCircle2 size={17} />
              Aprobar explicación
            </button>
          )}
        </Modal>
      )}
    </>
  );
}
function QuestionForm({ data: d, onSaved }: { data: StudioData; onSaved: () => Promise<void> }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [areas, setAreas] = useState<number[]>([]),
    [correct, setCorrect] = useState('A'),
    [options, setOptions] = useState(4);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const f = new FormData(e.currentTarget);
        try {
          await api('questions', {
            statement: f.get('statement'),
            explanation: f.get('explanation'),
            courseId: Number(f.get('courseId')),
            topic: f.get('topic'),
            difficulty: f.get('difficulty'),
            source: f.get('source'),
            areaIds: areas,
            approved: f.get('approved') === 'on',
            choices: Array.from({ length: options }, (_, i) => {
              const label = String.fromCharCode(65 + i);
              return { label, text: f.get(`choice${label}`), correct: correct === label };
            }),
          });
          await onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo guardar.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Pregunta
        <textarea
          name="statement"
          required
          minLength={10}
          maxLength={700}
          rows={3}
          placeholder="Escribe el enunciado que verá tu comunidad…"
        />
      </label>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="question-course">Curso</label>
          <select id="question-course" name="courseId" required>
            {d.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label>
          Tema
          <input name="topic" required minLength={2} maxLength={100} placeholder="Ej. Genética" />
        </label>
      </div>
      <fieldset>
        <legend>Áreas a las que aplica</legend>
        <div className="area-checks">
          {d.areas.map((a) => (
            <label key={a.id}>
              <input
                type="checkbox"
                checked={areas.includes(a.id)}
                onChange={() =>
                  setAreas((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))
                }
              />
              {a.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="options-heading">
        <span>Alternativas · marca la correcta</span>
        <select
          aria-label="Número de alternativas"
          value={options}
          onChange={(e) => {
            const n = Number(e.target.value);
            setOptions(n);
            if (correct.charCodeAt(0) - 65 >= n) setCorrect('A');
          }}
        >
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} alternativas
            </option>
          ))}
        </select>
      </div>
      {Array.from({ length: options }, (_, i) => {
        const l = String.fromCharCode(65 + i);
        return (
          <div className="choice-input" key={l}>
            <label title="Alternativa correcta">
              <input
                type="radio"
                name="correct"
                checked={correct === l}
                onChange={() => setCorrect(l)}
              />
              {l}
            </label>
            <input
              aria-label={`Alternativa ${l}`}
              name={`choice${l}`}
              required
              maxLength={250}
              placeholder={`Texto de la alternativa ${l}`}
            />
          </div>
        );
      })}
      <label>
        Explicación de la respuesta
        <textarea
          name="explanation"
          required
          minLength={5}
          maxLength={1200}
          rows={3}
          placeholder="Esta explicación será la base de lo que dice el dinosaurio."
        />
      </label>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="question-difficulty">Dificultad</label>
          <select id="question-difficulty" name="difficulty">
            <option value="basica">Básica</option>
            <option value="intermedia">Intermedia</option>
            <option value="avanzada">Avanzada</option>
          </select>
        </div>
        <label>
          Fuente
          <input name="source" maxLength={200} defaultValue="Contenido propio de práctica" />
        </label>
      </div>
      <label className="check-label">
        <input name="approved" type="checkbox" />
        He revisado la respuesta y apruebo esta explicación.
      </label>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? <LoaderCircle size={16} className="spin" /> : <BookOpen size={16} />}Guardar
        pregunta
      </button>
    </form>
  );
}
