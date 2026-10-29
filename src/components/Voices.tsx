'use client';
import { ArrowLeft, AudioLines, ExternalLink, VolumeX } from 'lucide-react';

export function Voices({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SONIDO CON IDENTIDAD</div>
          <h1>La voz de tu contenido.</h1>
          <p>Conservamos tu referencia. La integración de voz queda para el siguiente paso.</p>
        </div>
        <button className="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Volver al creador
        </button>
      </div>
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
          <span className="eyebrow">PRÓXIMAMENTE</span>
          <h2>
            <VolumeX size={22} /> Por ahora, sin voz
          </h2>
          <p>
            fal.ai LongCat genera la animación del personaje. Estos videos todavía no incluyen
            narración ni sincronización de labios.
          </p>
          <p>
            La pregunta, la clave y la explicación aparecen en pantalla con la estructura del
            formato elegido.
          </p>
        </section>
      </div>
    </>
  );
}
