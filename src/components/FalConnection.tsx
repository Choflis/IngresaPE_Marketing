'use client';
import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { FAL_IMAGE_MODEL, FAL_TEXT_MODEL, type FalModel } from '@/lib/fal-contract';
import { api, money, type StudioData } from './shared';

export function FalConnection({
  data: d,
  refresh,
  notify,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<FalModel>(d.fal.model);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="content-panel settings-panel">
      <div className="settings-title">
        <div className="provider-symbol fal">f</div>
        <div>
          <h2>Anima con fal.ai</h2>
          <p>LongCat Video Distilled · 480p · 15 fps</p>
        </div>
        <span className={`status ${d.fal.configured ? 'status-completed' : 'status-queued'}`}>
          {d.fal.configured && <CheckCircle2 size={14} />}
          {d.fal.configured ? 'Clave configurada' : 'Falta tu clave'}
        </span>
      </div>
      <p>
        La IA anima al personaje. El estudio añade la pregunta, las alternativas y la respuesta
        revisada. Por ahora, los videos se producen sin voz.
      </p>
      <a className="text-button" href="https://fal.ai/dashboard" target="_blank" rel="noreferrer">
        Abrir mi cuenta de fal.ai <ArrowUpRight size={15} />
      </a>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('fal/connect', { apiKey, model });
            setApiKey('');
            await refresh();
            notify('Clave de fal.ai guardada. No se generó contenido.');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="fal-api-key">
          API key de fal.ai
          <input
            id="fal-api-key"
            type="password"
            autoComplete="new-password"
            required
            minLength={16}
            maxLength={4096}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              d.fal.configured
                ? 'Introduce tu clave para actualizar la configuración'
                : 'Pega tu API key'
            }
          />
        </label>
        <label htmlFor="fal-model">
          Cómo animar el personaje
          <select
            id="fal-model"
            value={model}
            onChange={(e) => setModel(e.target.value as FalModel)}
          >
            <option value={FAL_IMAGE_MODEL}>Desde la imagen del dinosaurio · recomendado</option>
            <option value={FAL_TEXT_MODEL}>Desde una descripción de texto</option>
          </select>
        </label>
        <p className="fine-print">
          Desde imagen usa el dinosaurio de tu referencia. Desde texto puede cambiar su apariencia.
          Guardar la clave no verifica el saldo ni genera cargos; fal.ai validará sus permisos al
          producir.
        </p>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={busy}>
          {busy && <LoaderCircle size={16} className="spin" />} Guardar configuración
        </button>
      </form>
      <div className="setting-row">
        <span>Referencia por video de 30 segundos</span>
        <strong>{money(15)}</strong>
      </div>
      <div className="setting-row">
        <span>Reserva máxima mensual del estudio</span>
        <strong>{money(d.fal.monthlyBudgetCents)}</strong>
      </div>
      <p className="fine-print">
        Tarifa de referencia: $0.005 por segundo generado. Con $10 alcanzan hasta 66 videos de 30
        segundos, antes de impuestos y nuevas generaciones. La reserva del estudio no representa el
        saldo real de fal.ai.
      </p>
    </section>
  );
}
