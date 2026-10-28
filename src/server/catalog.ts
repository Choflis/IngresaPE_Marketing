import { query, transaction } from '../lib/db';
import { questionInput, templateInput } from '../lib/validation';
import type { Question, Template } from '../lib/types';
export const questionSelect = `SELECT q.id,v.id version_id,v.statement,v.explanation,v.approved,q.difficulty,t.course_id,c.name course,t.name topic,s.name source,q.created_at,
COALESCE((SELECT json_agg(json_build_object('id',a.id,'slug',a.slug,'name',a.name,'color',a.color) ORDER BY a.id) FROM question_areas qa JOIN areas a ON a.id=qa.area_id WHERE qa.question_id=q.id),'[]') areas,
COALESCE((SELECT json_agg(json_build_object('label',ch.label,'text',ch.content,'correct',ch.is_correct) ORDER BY ch.label) FROM question_choices ch WHERE ch.question_version_id=v.id),'[]') choices
FROM questions q JOIN question_versions v ON v.question_id=q.id JOIN topics t ON t.id=q.topic_id JOIN courses c ON c.id=t.course_id JOIN sources s ON s.id=q.source_id`;
export async function getQuestions() {
  return query<Question>(
    `${questionSelect} WHERE v.version=(SELECT max(version) FROM question_versions WHERE question_id=q.id) ORDER BY q.created_at DESC LIMIT 1000`,
  );
}
export async function getQuestionVersion(id: string) {
  return (await query<Question>(`${questionSelect} WHERE v.id=$1`, [id]))[0];
}
export async function createQuestion(input: unknown) {
  const v = questionInput.parse(input);
  return transaction(async (c) => {
    const s = (
      await c.query(
        'INSERT INTO sources(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=excluded.name RETURNING id',
        [v.source || 'Contenido propio de práctica'],
      )
    ).rows[0];
    const t = (
      await c.query(
        'INSERT INTO topics(course_id,name) VALUES($1,$2) ON CONFLICT(course_id,name) DO UPDATE SET name=excluded.name RETURNING id',
        [v.courseId, v.topic],
      )
    ).rows[0];
    const q = (
      await c.query(
        'INSERT INTO questions(topic_id,source_id,difficulty) VALUES($1,$2,$3) RETURNING id',
        [t.id, s.id, v.difficulty],
      )
    ).rows[0];
    const version = (
      await c.query(
        'INSERT INTO question_versions(question_id,statement,explanation,approved) VALUES($1,$2,$3,$4) RETURNING id',
        [q.id, v.statement, v.explanation, v.approved],
      )
    ).rows[0];
    for (const ch of v.choices)
      await c.query(
        'INSERT INTO question_choices(question_version_id,label,content,is_correct) VALUES($1,$2,$3,$4)',
        [version.id, ch.label, ch.text, ch.correct],
      );
    for (const id of v.areaIds)
      await c.query('INSERT INTO question_areas(question_id,area_id) VALUES($1,$2)', [q.id, id]);
    return q;
  });
}
export async function approveQuestion(id: string) {
  return transaction(async (c) => {
    const old = (
      await c.query(
        'SELECT * FROM question_versions WHERE question_id=$1 ORDER BY version DESC LIMIT 1 FOR UPDATE',
        [id],
      )
    ).rows[0];
    if (!old) throw new Error('Pregunta no encontrada.');
    if (old.approved) return;
    const v = (
      await c.query(
        'INSERT INTO question_versions(question_id,version,statement,explanation,approved) VALUES($1,$2,$3,$4,true) RETURNING id',
        [id, old.version + 1, old.statement, old.explanation],
      )
    ).rows[0];
    await c.query(
      'INSERT INTO question_choices(question_version_id,label,content,is_correct) SELECT $1,label,content,is_correct FROM question_choices WHERE question_version_id=$2',
      [v.id, old.id],
    );
  });
}
export async function getTemplates() {
  return query<Template>(
    `SELECT t.*,v.id version_id,v.accent,v.duration_seconds,v.version FROM templates t JOIN template_versions v ON v.template_id=t.id WHERE v.version=(SELECT max(version) FROM template_versions WHERE template_id=t.id) ORDER BY t.id`,
  );
}
export async function createTemplate(input: unknown) {
  const v = templateInput.parse(input);
  return transaction(async (c) => {
    const t = (
      await c.query('INSERT INTO templates(name,description,kind) VALUES($1,$2,$3) RETURNING id', [
        v.name,
        v.description,
        v.kind,
      ])
    ).rows[0];
    await c.query(
      'INSERT INTO template_versions(template_id,accent,duration_seconds) VALUES($1,$2,$3)',
      [t.id, v.accent, v.durationSeconds],
    );
    return t;
  });
}
