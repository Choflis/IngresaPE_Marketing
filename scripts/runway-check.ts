import 'dotenv/config';
import { runwayClient, providerError } from '../src/server/runway';
if (!process.env.RUNWAYML_API_SECRET) {
  console.error(
    'PENDIENTE: añade RUNWAYML_API_SECRET a .env. No se hizo ninguna generación ni cargo.',
  );
  process.exitCode = 2;
} else {
  try {
    const result = await runwayClient().organization.retrieve();
    console.log('Conexión autenticada con Runway: OK.');
    if ('creditBalance' in result) console.log('Créditos disponibles:', result.creditBalance);
    console.log('Esta comprobación no genera videos.');
  } catch (e) {
    console.error(providerError(e));
    process.exitCode = 1;
  }
}
