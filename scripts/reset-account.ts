import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, transaction } from '../src/lib/db';
try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error('Configura ADMIN_EMAIL y ADMIN_PASSWORD de al menos 12 caracteres en .env.');
  await transaction(async (c) => {
    const r = await c.query('UPDATE users SET password_hash=$2 WHERE email=$1 RETURNING id', [
      email,
      await bcrypt.hash(password, 12),
    ]);
    if (!r.rowCount) throw new Error('Cuenta inexistente: ejecuta db:seed primero.');
    await c.query('DELETE FROM sessions WHERE user_id=$1', [r.rows[0].id]);
  });
  console.log('Contraseña actualizada. Sesiones anteriores revocadas.');
} catch (e) {
  console.error(e instanceof Error ? e.message : 'No se pudo actualizar.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
