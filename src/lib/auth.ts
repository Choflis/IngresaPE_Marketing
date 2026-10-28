import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query, transaction } from './db';
export const COOKIE = 'ingresape_session';
export const hashToken = (v: string) => createHash('sha256').update(v).digest('hex');
export async function login(email: string, password: string) {
  email = email.trim().toLowerCase();
  // Per-email lock serializes concurrent attempts; no trusted client IP is required.
  const user = await transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`login:${email}`]);
    const r = await c.query(
      "SELECT count(*)::int n FROM login_attempts WHERE email=$1 AND attempted_at>now()-interval '15 minutes'",
      [email],
    );
    if (r.rows[0].n >= 8) throw new Error('Demasiados intentos. Espera 15 minutos.');
    await c.query('INSERT INTO login_attempts(email) VALUES($1)', [email]);
    return (await c.query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
  });
  const valid = await bcrypt.compare(
    password,
    user?.password_hash ?? '$2b$12$4WM.Sko97f.rqZDD/Z91UOZgKTL4YVmMZ3pQdEBGBiTjqpnT.TvA.',
  );
  if (!user || !valid) throw new Error('Correo o contraseña incorrectos.');
  await query('DELETE FROM login_attempts WHERE email=$1', [email]);
  const token = randomBytes(32).toString('base64url');
  await query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [hashToken(token), user.id],
  );
  await query('DELETE FROM sessions WHERE expires_at<now()');
  return { token, user: { id: user.id, email: user.email } };
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [user] = await query<{ id: string; email: string }>(
    'SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',
    [hashToken(token)],
  );
  return user ?? null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'Inicia sesión para continuar.');
  return u;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(req: Request) {
  const expected = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
  if (req.headers.get('origin') !== expected)
    throw new HttpError(403, 'Origen de solicitud no permitido.');
}
