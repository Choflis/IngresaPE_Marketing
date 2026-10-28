'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api, money, type StudioData } from './shared';
export function RunwayConnection({
  data: d,
  refresh,
  notify,
}: {
  data: StudioData;
  refresh: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const [key, setKey] = useState(''),
    [avatar, setAvatar] = useState(''),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  async function act(action: string, payload: unknown = {}) {
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const r = await api(`runway/${action}`, payload);
      if (action === 'connect') {
        setKey('');
        setMessage('Cuenta verificada y conectada. Ahora prepara tu dinosaurio.');
      } else if (action === 'avatar') {
        setMessage(
          r.avatarConfigured
            ? 'Tu dinosaurio está listo para enseñar.'
            : 'Runway está preparando el personaje. Comprueba su estado en unos momentos.',
        );
      } else if (action === 'avatar/status') {
        setMessage(
          r.avatarConfigured
            ? 'Tu dinosaurio está listo. Ya puedes generar videos con voz.'
            : 'El personaje sigue preparándose en Runway.',
        );
      } else setMessage(r.message ?? 'Conexión verificada.');
      await refresh();
      notify(action === 'connect' ? 'Runway conectado.' : 'Estado de Runway actualizado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar.');
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="content-panel settings-panel runway-connection">
      <div className="settings-title">
        <div className="provider-symbol runway">R</div>
        <div>
          <h2>Conecta tu aula con Runway</h2>
          <p>Tu dinosaurio habla y se mueve con cada explicación.</p>
        </div>
        <span
          className={`status ${d.runway.avatarConfigured ? 'status-completed' : 'status-queued'}`}
        >
          {d.runway.avatarConfigured
            ? 'Listo para crear'
            : d.runway.configured
              ? 'Cuenta conectada'
              : 'Por conectar'}
        </span>
      </div>
      <div className="connection-step">
        <span className={`connection-number ${d.runway.configured ? 'complete' : ''}`}>
          {d.runway.configured ? <CheckCircle2 size={18} /> : 1}
        </span>
        <div>
          <h3>Conecta tu cuenta</h3>
          <p>
            Usa una API key de Runway Developers. Puedes tener sesión en la web y necesitar activar
            este acceso por separado.
          </p>
          <a className="text-button" href="https://dev.runway.com" target="_blank" rel="noreferrer">
            Abrir Runway Developers <ArrowUpRight size={15} />
          </a>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act('connect', { apiKey: key, avatarId: avatar.trim() || undefined });
            }}
          >
            <label htmlFor="runway-api-key">
              API key de Runway
              <input
                id="runway-api-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                minLength={16}
                maxLength={4096}
                placeholder={
                  d.runway.configured
                    ? 'Introduce otra clave para cambiar de cuenta'
                    : 'Pega tu API key aquí'
                }
                required
              />
            </label>
            <details className="existing-avatar">
              <summary>Ya tengo un avatar en Runway</summary>
              <label htmlFor="runway-avatar-id">
                ID del avatar
                <input
                  id="runway-avatar-id"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="ID de tu personaje existente"
                />
              </label>
            </details>
            <button className="button primary" disabled={Boolean(busy) || !key.trim()}>
              {busy === 'connect' ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <KeyRound size={17} />
              )}
              Verificar y conectar
            </button>
          </form>
        </div>
      </div>
      <div className="connection-step">
        <span className={`connection-number ${d.runway.avatarConfigured ? 'complete' : ''}`}>
          {d.runway.avatarConfigured ? <CheckCircle2 size={18} /> : 2}
        </span>
        <div>
          <h3>Prepara a tu dinosaurio</h3>
          <p>
            Usaremos el personaje de Ingresa PE y una voz para sus explicaciones. Se configura una
            vez y se reutiliza.
          </p>
          <div className="avatar-setup">
            <img src="/brand/mascot.webp" alt="Dinosaurio rojo de Ingresa PE" />
            <div>
              <strong>Dino · Ingresa PE</strong>
              <small>
                {d.runway.avatarConfigured
                  ? 'Personaje listo'
                  : d.runway.avatarStatus === 'processing'
                    ? 'Preparando en Runway'
                    : d.runway.avatarStatus === 'uncertain'
                      ? 'Revisa su creación en Runway'
                      : 'Tu compañero de estudio'}
              </small>
            </div>
          </div>
          <div className="settings-actions">
            <button
              className="button"
              disabled={
                !d.runway.configured ||
                Boolean(busy) ||
                d.runway.avatarConfigured ||
                d.runway.avatarStatus === 'processing'
              }
              onClick={() => act('avatar')}
            >
              {busy === 'avatar' ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              Preparar dinosaurio
            </button>
            {d.runway.configured && (
              <button
                className="text-button"
                disabled={Boolean(busy)}
                onClick={() => act(d.runway.avatarStatus === 'missing' ? 'check' : 'avatar/status')}
              >
                {busy === 'avatar/status' ? 'Comprobando…' : 'Comprobar estado'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="connection-footer">
        <ShieldCheck size={17} />
        <p>
          La clave se guarda en tu servidor y no se muestra al volver a abrir esta pantalla. Los
          videos generados consumen créditos de tu cuenta.
        </p>
      </div>
      <div className="setting-row">
        <span>Reserva mensual del estudio</span>
        <strong>{money(d.runway.monthlyBudgetCents)} USD</strong>
      </div>
      {d.runway.credits !== null && d.runway.credits !== undefined && (
        <div className="setting-row">
          <span>Créditos al verificar la cuenta</span>
          <strong>{d.runway.credits}</strong>
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success-message" role="status">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
    </section>
  );
}
