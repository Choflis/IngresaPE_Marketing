'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, AudioLines, ExternalLink } from 'lucide-react';
import { voiceCatalog, voicePreview } from '@/lib/voices';
const googleVoiceCatalog = 'https://firebase.google.com/docs/ai-logic/generate-speech#voices';

export function Voices({ onBack }: { onBack: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  return (
    <div
      ref={root}
      onPlayCapture={(event) => {
        if (!(event.target instanceof HTMLAudioElement)) return;
        const current = event.target;
        root.current?.querySelectorAll('audio').forEach((audio) => {
          if (audio !== current) audio.pause();
        });
      }}
    >
      <div className="page-heading">
        <div>
          <div className="eyebrow">SONIDO CON IDENTIDAD</div>
          <h1>La voz de tu contenido.</h1>
          <p>
            Cuatro voces para encontrar el carácter de tu dinosaurio: cercano, amigable y con
            energía.
          </p>
        </div>
        <button className="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Volver al creador
        </button>
      </div>
      <section className="voice-catalog" aria-label="Voces para tu dinosaurio">
        <div className="section-heading">
          <div>
            <h2>Escucha y compara</h2>
            <p>Las cuatro dicen: «¡Esta es una fija para la UNSA!»</p>
          </div>
          <span className="counter">4 voces</span>
        </div>
        <div className="voice-catalog-grid">
          {voiceCatalog.map((voice) => {
            const src = voicePreview(voice.name);
            return (
              <article className="content-panel voice-preview-card" key={voice.name}>
                <div className="voice-preview-heading">
                  <span className="voice-wave" aria-hidden="true">
                    <AudioLines size={25} />
                  </span>
                  <div>
                    <h3>{voice.name}</h3>
                    <span>{voice.character} · Masculina</span>
                  </div>
                  {voice.name === 'Puck' && <span className="reference-label">Para empezar</span>}
                </div>
                <p>{voice.description}</p>
                <audio
                  controls
                  preload="none"
                  aria-label={`Escuchar ${voice.name}`}
                  src={src}
                  onError={() =>
                    setUnavailable((previous) =>
                      previous.includes(voice.name) ? previous : [...previous, voice.name],
                    )
                  }
                />
                {unavailable.includes(voice.name) && (
                  <p className="voice-preview-error" role="status">
                    No se pudo cargar el audio. Prueba el enlace de la muestra.
                  </p>
                )}
                <a className="text-button" href={src} target="_blank" rel="noreferrer">
                  Abrir muestra de {voice.name} <ExternalLink size={13} />
                </a>
              </article>
            );
          })}
        </div>
        <p className="voice-catalog-note">
          Muestras generadas con Gemini en español, con una interpretación juvenil, amigable y
          enérgica. Los audios ya están guardados: escucharlos no inicia nuevas generaciones ni
          consume créditos.{' '}
          <a href={googleVoiceCatalog} target="_blank" rel="noreferrer">
            Ver catálogo de Google <ExternalLink size={12} />
          </a>
        </p>
      </section>
      <div className="voices-intro-grid">
        <section className="content-panel reference-audio">
          <span className="voice-wave">
            <AudioLines size={29} />
          </span>
          <div>
            <span className="eyebrow">TU PUNTO DE PARTIDA</span>
            <h2>La voz de “Las fijas”</h2>
            <p>Audio original de tu video para comparar el timbre y el ritmo al elegir la voz.</p>
          </div>
          <audio data-reference controls preload="none" src="/api/references/las-fijas/audio" />
          <a className="text-button" href="/api/references/las-fijas/audio?download=1">
            Descargar muestra de referencia <ExternalLink size={14} />
          </a>
        </section>
        <section className="content-panel voice-method">
          <span className="eyebrow">LISTA PARA PRODUCIR</span>
          <h2>De la muestra a tu video</h2>
          <p>
            Elige tu voz en el paso Producción del creador. Gemini narrará la pregunta, las
            alternativas, la respuesta y la explicación con una interpretación juvenil y enérgica.
          </p>
          <p>
            La voz se incorpora al MP4 final y se sincroniza con la respuesta. Puedes usarla con la
            animación de fal.ai o con el video local.
          </p>
        </section>
      </div>
    </div>
  );
}
