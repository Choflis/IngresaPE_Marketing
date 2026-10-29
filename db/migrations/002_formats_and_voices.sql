CREATE TABLE voice_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  selection jsonb NOT NULL,
  preview_url text,
  status text NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','processing','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO voice_profiles(id,name,description,selection) VALUES
('preset:adrian','Adrian','Voz de catálogo de Runway.', '{"type":"preset","presetId":"adrian"}'),
('preset:clara','Clara','Voz de catálogo de Runway.', '{"type":"preset","presetId":"clara"}'),
('preset:mia','Mia','Voz de catálogo de Runway.', '{"type":"preset","presetId":"mia"}'),
('preset:vincent','Vincent','Voz de catálogo de Runway.', '{"type":"preset","presetId":"vincent"}');

ALTER TABLE templates ADD COLUMN builtin_key text UNIQUE;
UPDATE templates t SET builtin_key = CASE t.name
  WHEN 'Dino responde' THEN 'dino' WHEN 'Reto de admisión' THEN 'challenge'
  WHEN 'Pregunta del día' THEN 'daily' WHEN 'Repaso en tres pasos' THEN 'carousel' END
WHERE t.id=(SELECT min(t2.id) FROM templates t2 WHERE t2.name=t.name)
AND t.name IN ('Dino responde','Reto de admisión','Pregunta del día','Repaso en tres pasos');
ALTER TABLE template_versions ADD COLUMN composition text NOT NULL DEFAULT 'dino'
  CHECK(composition IN ('dino','challenge','las-fijas','daily','carousel'));
ALTER TABLE template_versions ADD COLUMN default_voice_id text REFERENCES voice_profiles(id) DEFAULT 'preset:adrian';
UPDATE template_versions v SET composition=CASE
  WHEN t.kind='carousel' THEN 'carousel' WHEN t.kind='image' THEN 'daily'
  WHEN t.builtin_key='challenge' THEN 'challenge' ELSE 'dino' END
FROM templates t WHERE v.template_id=t.id;
INSERT INTO templates(name,description,kind,builtin_key)
VALUES('Las fijas','Un reto de 30 segundos: lee, elige, descubre la respuesta y practica.','video','las-fijas')
ON CONFLICT(builtin_key) DO NOTHING;
INSERT INTO template_versions(template_id,composition,duration_seconds)
SELECT id,'las-fijas',30 FROM templates WHERE builtin_key='las-fijas'
AND NOT EXISTS(SELECT 1 FROM template_versions v WHERE v.template_id=templates.id);
ALTER TABLE video_jobs ADD COLUMN voice jsonb;
