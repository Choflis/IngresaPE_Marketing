'use client';
import { voiceCatalog, voicePreview, type VoiceSelection } from '@/lib/voices';

export function NarrationSelector({
  value,
  configured,
  onChange,
}: {
  value: VoiceSelection['name'] | '';
  configured: boolean;
  onChange: (name: VoiceSelection['name'] | '') => void;
}) {
  const selected = voiceCatalog.find((voice) => voice.name === value);
  return (
    <div className="production-voice narration-selector">
      <label htmlFor="narration-voice">Voz del dinosaurio</label>
      <select
        id="narration-voice"
        value={value}
        onChange={(event) => onChange(event.target.value as VoiceSelection['name'] | '')}
      >
        <option value="">Sin voz</option>
        {voiceCatalog.map((voice) => (
          <option key={voice.name} value={voice.name} disabled={!configured}>
            {voice.name} · {voice.character}
          </option>
        ))}
      </select>
      {selected && (
        <>
          <small>{selected.description}</small>
          <audio
            key={selected.name}
            controls
            preload="none"
            src={voicePreview(selected.name)}
            aria-label="Escuchar voz seleccionada"
          />
          <small>
            El video incluirá la pregunta, las alternativas y la explicación con esta voz. La
            respuesta se revela al comenzar su narración.
          </small>
        </>
      )}
      {!configured && (
        <small>
          Configura GEMINI_API_KEY en el servidor y reinicia el motor para habilitar la narración.
        </small>
      )}
      {configured && (
        <small>
          La voz usa la cuota de Gemini. Si se agota, el trabajo se detiene para que puedas
          reintentarlo después.
        </small>
      )}
    </div>
  );
}
