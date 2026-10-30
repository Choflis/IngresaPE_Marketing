'use client';
import { useState } from 'react';
import { Player } from '@remotion/player';
import { ArrowLeft, ArrowUpRight, Clock3, Film, Volume2, CheckCircle2 } from 'lucide-react';
import { QuestionVideo } from '@/video/QuestionVideo';
import { lasFijasSample } from '@/lib/reference-question';
import { FormatArtwork } from './FormatCatalog';
import type { StudioData } from './shared';

export function FormatDetail({
  data: d,
  versionId,
  onBack,
  onUse,
  onVoices,
}: {
  data: StudioData;
  versionId: number | null;
  onBack: () => void;
  onUse: (id: number) => void;
  onVoices: () => void;
}) {
  const [reference, setReference] = useState(false);
  const t = d.templates.find((t) => t.version_id === versionId);
  if (!t)
    return (
      <div className="inline-empty">
        <h1>Formato no encontrado</h1>
        <p>Vuelve al catálogo y elige un formato disponible.</p>
        <button className="button" onClick={onBack}>
          Volver al catálogo
        </button>
      </div>
    );
  const isFijas = t.composition === 'las-fijas';
  const question = isFijas ? lasFijasSample : d.questions.find((q) => q.approved);
  return (
    <div className="format-detail">
      <button className="text-button detail-back" onClick={onBack}>
        <ArrowLeft size={17} />
        Todos los formatos
      </button>
      <div className="format-detail-grid">
        <div className="format-preview-stage">
          {isFijas && d.referenceVideoAvailable && (
            <div className="segmented-control">
              <button className={!reference ? 'active' : ''} onClick={() => setReference(false)}>
                Nuestra plantilla
              </button>
              <button className={reference ? 'active' : ''} onClick={() => setReference(true)}>
                Tu video de referencia
              </button>
            </div>
          )}
          <div className="detail-video-frame">
            {reference && isFijas && d.referenceVideoAvailable ? (
              <video src="/api/references/las-fijas/video" controls preload="metadata" />
            ) : t.kind === 'video' && question ? (
              <Player
                component={QuestionVideo}
                inputProps={{
                  ...question,
                  area:
                    'area' in question
                      ? question.area
                      : question.areas.map((a) => a.name).join(' / '),
                  accent: t.accent.trim(),
                  demo: true,
                  durationSeconds: t.duration_seconds,
                  composition: t.composition,
                  challenge: t.composition === 'challenge',
                }}
                compositionWidth={720}
                compositionHeight={1280}
                fps={30}
                durationInFrames={t.duration_seconds * 30}
                controls
                style={{ width: '100%' }}
              />
            ) : (
              <FormatArtwork template={t} />
            )}
          </div>
          <span className="preview-caption">
            {reference && d.referenceVideoAvailable
              ? 'Referencia original · 20 segundos · incluye su audio'
              : 'Vista del diseño sin narración · elige la voz al producir'}
          </span>
        </div>
        <div className="format-detail-copy">
          <span className="eyebrow">
            {isFijas ? 'UN FORMATO DE TU COLECCIÓN' : 'LISTO PARA TU PRÓXIMA IDEA'}
          </span>
          <h1>{t.name}</h1>
          <p className="detail-description">{t.description}</p>
          <div className="detail-facts">
            <span>
              <Film size={17} />
              {t.kind === 'video' ? 'Vertical · 9:16' : 'Publicación · 4:5'}
            </span>
            {t.kind === 'video' && (
              <span>
                <Clock3 size={17} />
                {t.duration_seconds} segundos
              </span>
            )}
            <span>
              <CheckCircle2 size={17} />
              Respuestas del banco revisado
            </span>
          </div>
          <div className="detail-voice">
            <Volume2 size={21} />
            <div>
              <small>Voz para este formato</small>
              <strong>
                {t.kind === 'video'
                  ? d.narration.configured
                    ? 'Cuatro voces de Gemini disponibles'
                    : 'Configura Gemini para añadir narración'
                  : 'Sin voz · publicación visual'}
              </strong>
            </div>
            {t.kind === 'video' && (
              <button className="text-button" onClick={onVoices}>
                Escuchar voces
              </button>
            )}
          </div>
          {isFijas && (
            <>
              <h2>Una estructura que se entiende</h2>
              <ol className="format-timeline">
                {[
                  ['0–2 s', 'Presenta el reto'],
                  ['2–10 s', 'Lee la pregunta y elige una alternativa'],
                  ['10–27 s', 'Descubre la clave y lee la explicación'],
                  ['27–30 s', 'Continúa practicando en ingresa.pe'],
                ].map(([time, text]) => (
                  <li key={time}>
                    <span>{time}</span>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
              <p className="detail-note">
                Las letras, los números y la clave se componen desde tu contenido aprobado. La IA
                anima al personaje. Con voz, estos tiempos se ajustan a la narración manteniendo los
                30 segundos y una pausa antes de revelar la respuesta.
              </p>
            </>
          )}
          <button className="button primary detail-create" onClick={() => onUse(t.version_id)}>
            Crear con este formato <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
