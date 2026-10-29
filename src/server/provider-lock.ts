import { transaction } from '../lib/db';
import { HttpError } from '../lib/auth';
// One shared account for this owner-only installation, including CLI mutations.
export function withProviderLock<T>(fn: () => Promise<T>) {
  return transaction(async (c) => {
    const lock = await c.query(
      "SELECT pg_try_advisory_xact_lock(hashtext('fal:configuration')) locked",
    );
    if (!lock.rows[0].locked)
      throw new HttpError(409, 'Hay otra operación de fal.ai en curso. Espera a que termine.');
    return fn();
  });
}
