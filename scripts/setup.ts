import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
try {
  await readFile('.env');
  console.log('.env ya existe; se conservó sin cambios.');
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  const db = randomBytes(24).toString('hex');
  const password = randomBytes(15).toString('base64url');
  let env = await readFile('.env.example', 'utf8');
  env = env.replaceAll('CHANGE_ME', db).replace('GENERATE_WITH_SETUP', password);
  await writeFile('.env', env, { mode: 0o600, flag: 'wx' });
  console.log('Configuración privada creada en .env (permisos 0600).');
  console.log('Acceso: ADMIN_EMAIL y ADMIN_PASSWORD en .env. No se imprimen las credenciales.');
}
