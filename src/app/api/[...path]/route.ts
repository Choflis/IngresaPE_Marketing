import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { cookies } from 'next/headers';
import path from 'node:path';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { falModelSchema } from '@/lib/fal-contract';
import { GEMINI_TTS_MODEL } from '@/lib/voices';
import {
  COOKIE,
  checkOrigin,
  currentUser,
  hashToken,
  HttpError,
  login,
  requireUser,
} from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import {
  getQuestions,
  getTemplates,
  createQuestion,
  approveQuestion,
  createTemplate,
} from '@/server/catalog';
import { createBatch, getJobs } from '@/server/production';
import { canRetryJob } from '@/server/policy';
import { cancelFal, pollFal, falRequestId } from '@/server/fal';
import { saveProviderSettings, publicProviderStatus } from '@/server/provider-settings';
import { withProviderLock } from '@/server/provider-lock';
import { saveUpload, storageRoot } from '@/server/storage';
import { privateFileResponse } from '@/server/media-response';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
async function body(req: Request, max = 80000) {
  if (Number(req.headers.get('content-length') ?? 0) > max)
    throw new HttpError(413, 'Solicitud demasiado grande.');
  const text = await req.text();
  if (Buffer.byteLength(text) > max) throw new HttpError(413, 'Solicitud demasiado grande.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
async function handle(req: Request, ctx: Context) {
  const { path: parts } = await ctx.params;
  const route = parts.join('/');
  const method = req.method;
  if (method !== 'GET') checkOrigin(req);
  if (route === 'login' && method === 'POST') {
    const v = z
      .object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
      .parse(await body(req, 4096));
    let r;
    try {
      r = await login(v.email, v.password);
    } catch (e) {
      throw new HttpError(401, e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    }
    const res = NextResponse.json({ user: r.user });
    res.cookies.set(COOKIE, r.token, {
      httpOnly: true,
      secure: process.env.AUTH_COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path: '/',
      maxAge: 604800,
    });
    return res;
  }
  const user = await requireUser();
  if (route === 'logout' && method === 'POST') {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token) await query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
    jar.delete(COOKIE);
    return NextResponse.json({ ok: true });
  }
  if (route === 'studio' && method === 'GET') {
    const [areas, courses, questions, templates, jobs, assets, health, stats] = await Promise.all([
      query('SELECT * FROM areas ORDER BY id'),
      query('SELECT * FROM courses ORDER BY name'),
      getQuestions(),
      getTemplates(),
      getJobs(user.id),
      query(
        'SELECT id,original_name,mime_type,byte_size,created_at FROM media_assets WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 300',
        [user.id],
      ),
      query(
        "SELECT EXISTS(SELECT 1 FROM worker_heartbeats WHERE last_seen_at>now()-interval '20 seconds') worker_online",
      ),
      query(
        `SELECT count(*)::int total_jobs,count(*) FILTER(WHERE j.status='completed')::int completed,count(*) FILTER(WHERE j.status IN ('queued','generating','rendering'))::int active,COALESCE(sum(j.estimated_cost_cents) FILTER(WHERE j.provider='fal' AND j.created_at>=date_trunc('month',now()) AND (j.status<>'cancelled' OR EXISTS(SELECT 1 FROM provider_requests p WHERE p.job_id=j.id))),0)::int reserved_cents FROM video_jobs j JOIN batches b ON b.id=j.batch_id WHERE b.owner_id=$1`,
        [user.id],
      ),
    ]);
    return NextResponse.json({
      user,
      areas,
      courses,
      questions,
      templates,
      jobs,
      assets,
      stats: stats[0],
      workerOnline: health[0].worker_online,
      fal: publicProviderStatus(),
      narration: {
        configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        model: GEMINI_TTS_MODEL,
      },
      referenceVideoAvailable: existsSync(
        path.resolve('ejemplo_Video/gemini_generated_video_3778db79.mp4'),
      ),
    });
  }
  if (route === 'references/las-fijas/audio' && method === 'GET')
    return privateFileResponse(
      req,
      path.resolve('resources/reference/las-fijas-voice.mp3'),
      'audio/mpeg',
      new URL(req.url).searchParams.has('download') ? 'las-fijas-referencia.mp3' : undefined,
    );
  if (route === 'references/las-fijas/video' && method === 'GET')
    return privateFileResponse(
      req,
      path.resolve('ejemplo_Video/gemini_generated_video_3778db79.mp4'),
      'video/mp4',
    );
  if (route === 'questions' && method === 'POST')
    return NextResponse.json(await createQuestion(await body(req)), { status: 201 });
  if (parts[0] === 'questions' && parts[2] === 'approve' && method === 'POST') {
    await approveQuestion(z.string().uuid().parse(parts[1]));
    return NextResponse.json({ ok: true });
  }
  if (route === 'templates' && method === 'POST')
    return NextResponse.json(await createTemplate(await body(req)), { status: 201 });
  if (route === 'batches' && method === 'POST') {
    const key = z.string().uuid().parse(req.headers.get('idempotency-key'));
    return NextResponse.json(await createBatch(await body(req), user.id, key), { status: 201 });
  }
  if (parts[0] === 'jobs' && parts.length === 3 && method === 'POST') {
    const id = z.string().uuid().parse(parts[1]);
    const [j] = await query(
      'SELECT j.*,p.state,p.remote_task_id FROM video_jobs j JOIN batches b ON b.id=j.batch_id LEFT JOIN provider_requests p ON p.job_id=j.id WHERE j.id=$1 AND b.owner_id=$2',
      [id, user.id],
    );
    if (!j) throw new HttpError(404, 'Trabajo no encontrado.');
    if (parts[2] === 'cancel') {
      if (j.status === 'completed') throw new HttpError(409, 'Este trabajo ya terminó.');
      await query("UPDATE video_jobs SET status='cancelled',updated_at=now() WHERE id=$1", [id]);
      if (j.provider === 'fal' && j.remote_task_id) {
        try {
          await cancelFal(j.remote_task_id);
        } catch {
          /* Local cancellation stays effective; the remote provider may have completed already. */
        }
      }
      return NextResponse.json({ ok: true });
    }
    if (parts[2] === 'retry') {
      if (!['failed', 'needs_attention'].includes(j.status))
        throw new HttpError(409, 'Este trabajo no necesita reintento.');
      if (
        !canRetryJob(
          j.provider,
          j.state ? { state: j.state, remote_task_id: j.remote_task_id } : null,
        )
      )
        throw new HttpError(
          409,
          'Revisa la solicitud en fal.ai y vincula su request ID, o crea un lote nuevo para una generación nueva.',
        );
      await query(
        "UPDATE video_jobs SET status='queued',error_message=null,updated_at=now() WHERE id=$1",
        [id],
      );
      return NextResponse.json({ ok: true });
    }
    if (parts[2] === 'reconcile') {
      const { taskId } = z.object({ taskId: falRequestId }).parse(await body(req));
      if (j.provider !== 'fal')
        throw new HttpError(409, 'Solo se pueden vincular solicitudes de fal.ai.');
      if (j.status !== 'needs_attention')
        throw new HttpError(409, 'Este trabajo no requiere conciliación.');
      await pollFal(taskId);
      await transaction(async (c) => {
        await c.query(
          "UPDATE provider_requests SET remote_task_id=$2,state='submitted',updated_at=now() WHERE job_id=$1",
          [id, taskId],
        );
        await c.query(
          "UPDATE video_jobs SET status='queued',error_message=null,updated_at=now() WHERE id=$1",
          [id],
        );
      });
      return NextResponse.json({ ok: true });
    }
  }
  if (parts[0] === 'media' && method === 'GET') {
    const id = z.string().uuid().parse(parts[1]);
    const [asset] = await query('SELECT * FROM media_assets WHERE id=$1 AND owner_id=$2', [
      id,
      user.id,
    ]);
    if (!asset) throw new HttpError(404, 'Archivo no encontrado.');
    const file = path.resolve(storageRoot(), asset.storage_path);
    if (!file.startsWith(storageRoot() + path.sep)) throw new HttpError(404, 'Archivo inválido.');
    const extension =
      asset.mime_type === 'video/mp4' ? 'mp4' : asset.mime_type === 'image/png' ? 'png' : 'jpg';
    const download = new URL(req.url).searchParams.has('download')
      ? `ingresape-${id}.${extension}`
      : undefined;
    return privateFileResponse(req, file, asset.mime_type, download);
  }
  if (route === 'upload' && method === 'POST') {
    if (Number(req.headers.get('content-length') ?? 0) > 11 * 1024 * 1024)
      throw new HttpError(413, 'Máximo 10 MB por imagen.');
    const data = await req.formData();
    const f = data.get('file');
    if (!(f instanceof File) || f.size > 10 * 1024 * 1024)
      throw new HttpError(400, 'Elige una imagen PNG, JPEG o WebP de hasta 10 MB.');
    const bytes = Buffer.from(await f.arrayBuffer());
    const info = await sharp(bytes, { limitInputPixels: 25000000 }).metadata();
    if (!['png', 'jpeg', 'webp'].includes(info.format ?? ''))
      throw new HttpError(400, 'Formato no admitido.');
    const clean = await sharp(bytes).rotate().png().toBuffer();
    return NextResponse.json(await saveUpload(clean, f.name.slice(0, 150), 'image/png', user.id), {
      status: 201,
    });
  }
  if (route === 'fal/connect' && method === 'POST') {
    const input = z
      .object({
        apiKey: z.string().trim().min(16, 'Ingresa una API key válida.').max(4096).regex(/^\S+$/),
        model: falModelSchema,
      })
      .parse(await body(req, 8192));
    return withProviderLock(async () => {
      saveProviderSettings({ ...input, savedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true, ...publicProviderStatus() });
    });
  }
  if (route === 'assistant/draft' && method === 'POST') {
    const v = z.object({ questionId: z.string().uuid() }).parse(await body(req));
    const questions = await getQuestions();
    const q = questions.find((q) => q.id === v.questionId);
    if (!q) throw new HttpError(404, 'Pregunta no encontrada.');
    if (!process.env.GEMINI_API_KEY)
      return NextResponse.json({
        script: `${q.statement} La respuesta correcta es ${q.choices.find((c) => c.correct)?.text}. ${q.explanation} Sigue practicando en ingresa.pe.`,
        source: 'Guion preparado con la explicación del banco. Gemini no está configurado.',
      });
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Escribe un guion educativo breve en español peruano para el dinosaurio de Ingresa PE. Usa únicamente los datos proporcionados, sin cambiar la respuesta. Termina invitando a practicar en ingresa.pe. Pregunta: ${q.statement}\nRespuesta: ${q.choices.find((c) => c.correct)?.text}\nExplicación aprobada: ${q.explanation}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 400 },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok) throw new HttpError(502, 'No se pudo preparar el guion con Gemini.');
    const result = await response.json();
    return NextResponse.json({
      script:
        result.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? '')
          .join('') ?? '',
      source: 'Borrador Gemini para revisión. La generación usa siempre la explicación aprobada.',
    });
  }
  throw new HttpError(404, 'Ruta no encontrada.');
}
async function endpoint(req: Request, ctx: Context) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 },
      );
    const code = (e as { code?: string })?.code;
    if (code === '23503')
      return NextResponse.json(
        { error: 'El área, curso o referencia seleccionada no existe.' },
        { status: 400 },
      );
    if (code === '23505')
      return NextResponse.json({ error: 'El registro ya existe.' }, { status: 409 });
    console.error('API error', e instanceof Error ? e.name : 'Error');
    return NextResponse.json(
      { error: 'No se pudo completar la operación. Revisa la conexión a la base de datos.' },
      { status: 500 },
    );
  }
}
export const GET = endpoint;
export const POST = endpoint;
