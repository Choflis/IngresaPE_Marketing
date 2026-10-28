'use client';
import { useState } from 'react';
import { ArrowRight, LockKeyhole, LoaderCircle } from 'lucide-react';
export default function Login() {
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  return (
    <main className="login-page">
      <div className="login-art">
        <a href="https://ingresa.pe" target="_blank" rel="noreferrer">
          <img src="/brand/logo.png" alt="Ingresa PE" width="160" />
        </a>
        <div className="login-story">
          <span className="eyebrow">INGRESA PE STUDIO</span>
          <h1>
            Las buenas ideas
            <br />
            merecen salir
            <br />a <em>escena.</em>
          </h1>
          <p>
            Tu marca. Tu dinosaurio. Una nueva forma
            <br />
            de conectar con los futuros cachimbos.
          </p>
        </div>
        <img
          className="login-mascot"
          src="/brand/mascot.webp"
          alt="Dinosaurio rojo de Ingresa PE"
        />
        <span className="login-caption">CREADO PARA QUIENES AYUDAN A INGRESAR.</span>
      </div>
      <div className="login-side">
        <div className="login-form">
          <div className="private-label">
            <LockKeyhole size={14} /> ESPACIO PRIVADO
          </div>
          <h2>De vuelta al estudio.</h2>
          <p>Ingresa con tu cuenta para empezar a crear.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError('');
              const data = new FormData(e.currentTarget);
              try {
                const r = await fetch('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: data.get('email'),
                    password: data.get('password'),
                  }),
                });
                const v = await r.json();
                if (!r.ok) throw new Error(v.error);
                window.location.assign('/');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo conectar.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="tu@ingresa.pe"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña privada"
                required
              />
            </label>
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={loading}>
              {loading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Entrar al estudio <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <small>
            La cuenta se configura al instalar el estudio.
            <br />
            Consulta ADMIN_EMAIL y ADMIN_PASSWORD en tu .env.
          </small>
        </div>
        <div className="login-footer">
          INGRESA.PE <span>ESTUDIO DE CONTENIDO · 2026</span>
        </div>
      </div>
    </main>
  );
}
