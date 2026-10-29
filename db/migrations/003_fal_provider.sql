ALTER TABLE video_jobs DROP CONSTRAINT video_jobs_provider_check;
-- The retired value is retained only for historical rows, never for new batches.
ALTER TABLE video_jobs ADD CONSTRAINT video_jobs_provider_check CHECK(provider IN ('demo','fal','runway'));
ALTER TABLE video_jobs ADD COLUMN generation_config jsonb;
UPDATE video_jobs SET status='needs_attention',error_message='Este trabajo pertenece a un proveedor retirado. Conservamos su historial; crea un lote nuevo con fal.ai.',updated_at=now()
WHERE provider='runway' AND status IN ('queued','generating','rendering');
