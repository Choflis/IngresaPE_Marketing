import { query } from '../lib/db';

export async function setJobState(id: string, status: string, error: string | null = null) {
  await query(
    "UPDATE video_jobs SET status=$2,error_message=$3,updated_at=now() WHERE id=$1 AND status<>'cancelled'",
    [id, status, error],
  );
  await query('INSERT INTO job_events(job_id,message) VALUES($1,$2)', [id, error ?? status]);
}
export async function isJobCancelled(id: string) {
  return (
    (await query('SELECT status FROM video_jobs WHERE id=$1', [id]))[0]?.status === 'cancelled'
  );
}
