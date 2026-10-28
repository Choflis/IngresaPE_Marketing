import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { submitAvatar, pollRunway, providerError } from '../src/server/runway';
import { downloadProviderOutput } from '../src/server/storage';
// Explicitly invoked, paid smoke test: one short request, no submission retries.
const dir = 'storage/provider-tests';
if (!process.env.RUNWAYML_API_SECRET || !process.env.RUNWAY_AVATAR_ID) {
  console.error(
    'PENDIENTE: configura RUNWAYML_API_SECRET y RUNWAY_AVATAR_ID. No se hizo ninguna generación ni cargo.',
  );
  process.exitCode = 2;
} else {
  await mkdir(dir, { recursive: true });
  const file = `${dir}/smoke-${Date.now()}.json`;
  const receipt: { state: string; taskId?: string; testedAt: string; error?: string } = {
    state: 'submitting',
    testedAt: new Date().toISOString(),
  };
  await writeFile(file, JSON.stringify(receipt, null, 2));
  try {
    const task = await submitAvatar(
      'Hola, soy el dinosaurio de Ingresa PE. Practiquemos para la UNSA.',
    );
    receipt.taskId = task.id;
    receipt.state = 'submitted';
    await writeFile(file, JSON.stringify(receipt, null, 2));
    console.log('Task ID:', task.id);
    for (let i = 0; i < 120; i++) {
      const r = await pollRunway(task.id);
      if (r.status === 'SUCCEEDED') {
        if (!r.output?.[0]) throw new Error('Sin video de salida.');
        await downloadProviderOutput(r.output[0], `${dir}/${task.id}.mp4`);
        receipt.state = 'succeeded';
        console.log('Video real guardado:', `${dir}/${task.id}.mp4`);
        break;
      }
      if (r.status === 'FAILED' || r.status === 'CANCELLED') {
        receipt.state = 'failed';
        throw new Error('La tarea remota no terminó.');
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    if (receipt.state === 'submitted')
      console.log(
        'Sigue procesando. Consulta este task ID en Runway; no repitas el smoke test para consultar el mismo trabajo.',
      );
  } catch (e) {
    receipt.error = providerError(e);
    if (!receipt.taskId) receipt.state = 'uncertain';
    console.error(receipt.error);
    process.exitCode = 1;
  } finally {
    await writeFile(file, JSON.stringify(receipt, null, 2));
  }
}
