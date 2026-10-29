# Modelo relacional

```mermaid
erDiagram
  users ||--o{ sessions : autentica
  users ||--o{ batches : produce
  users ||--o{ media_assets : posee
  courses ||--o{ topics : contiene
  topics ||--o{ questions : clasifica
  sources ||--o{ questions : documenta
  questions ||--o{ question_areas : aplica
  areas ||--o{ question_areas : agrupa
  questions ||--|{ question_versions : versiona
  question_versions ||--|{ question_choices : contiene
  templates ||--|{ template_versions : versiona
  batches ||--|{ video_jobs : contiene
  question_versions ||--o{ video_jobs : alimenta
  template_versions ||--o{ video_jobs : presenta
  video_jobs ||--o| provider_requests : registra
  video_jobs ||--o{ job_assets : produce
  media_assets ||--o{ job_assets : vincula
  video_jobs ||--o{ job_events : registra
```

Catálogo compartido para un único propietario. `video_jobs` conserva el nombre histórico por compatibilidad de API, pero representa videos, imágenes y carruseles. Las alternativas correctas se validan antes de entrar en una transacción. Las versiones utilizadas para producir no se sobrescriben. Aprobar una pregunta pendiente crea una versión nueva y copia sus alternativas.

## Migraciones

`npm run db:migrate` aplica una sola vez cada archivo de `db/migrations`, en orden y bajo lock transaccional. Los errores hacen rollback. No hay sincronización destructiva automática del esquema.

La migración `002_formats_and_voices.sql` añade composiciones y Las fijas. Sus tablas de voces se conservan como datos históricos, sin API activa. La migración `003_fal_provider.sql` incorpora `fal` y el snapshot técnico `generation_config`; bloquea los trabajos pendientes del proveedor retirado para evitar ejecutarlos accidentalmente. Conserva sus archivos, IDs y estados de solicitud.

## Respaldos

La base y los medios forman un conjunto. Guarda ambos; un dump SQL sin el volumen de medios no contiene los MP4/PNG.

```bash
docker compose exec -T db pg_dump -U studio -d ingresape_studio -Fc > studio.dump
# Instalación local: respaldar ./storage con la herramienta de backup que uses.
# Instalación Docker: respaldar también el volumen media_data.
```

Para restaurar, utiliza una base nueva y `pg_restore`; no sobrescribas una instalación en uso. El `.env` se conserva de forma privada y nunca se versiona.
