import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { LasFijasVideo } from './LasFijasVideo';
import { assertLasFijasLayout, assertValidChoices, type CompositionKey } from '../lib/video-format';
export type VideoProps = {
  statement: string;
  explanation: string;
  choices: { label: string; text: string; correct: boolean }[];
  course: string;
  area: string;
  accent: string;
  demo: boolean;
  clipUrl?: string;
  durationSeconds: number;
  challenge?: boolean;
  composition?: CompositionKey;
  clipDurationSeconds?: number;
};
export function QuestionVideo(p: VideoProps) {
  try {
    assertValidChoices(p.choices);
    if (p.composition === 'las-fijas') assertLasFijasLayout(p);
  } catch (e) {
    return (
      <AbsoluteFill
        style={{
          padding: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fcfcfd',
          color: '#852139',
          textAlign: 'center',
          fontSize: 28,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <strong>Revisa el contenido</strong>
        <p style={{ fontSize: 24, lineHeight: 1.5 }}>{(e as Error).message}</p>
      </AbsoluteFill>
    );
  }
  if (p.composition === 'las-fijas') return <LasFijasVideo {...p} />;
  return <DinoVideo {...p} />;
}
function DinoVideo(p: VideoProps) {
  assertValidChoices(p.choices);
  const f = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const reveal = f > durationInFrames * 0.67;
  const sway = Math.sin((f / fps) * 2) * 2;
  const dense = p.statement.length + p.choices.reduce((n, c) => n + c.text.length, 0) > 450;
  const remaining = Math.max(0, Math.ceil((durationInFrames * 0.67 - f) / fps));
  return (
    <AbsoluteFill
      style={{ background: '#090D16', fontFamily: 'Arial, sans-serif', color: '#F5F6FA' }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.18,
          backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        style={{
          padding: '45px 46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Img
          src={staticFile('brand/logo.png')}
          style={{ width: 210, height: 58, objectFit: 'contain' }}
        />
        <span style={{ fontSize: 20, color: '#b8c2d3' }}>{p.area.toUpperCase()}</span>
      </div>
      <div style={{ margin: '4px 46px 0', opacity: 1, zIndex: 2 }}>
        <div
          style={{
            fontSize: 19,
            letterSpacing: 3,
            color: p.accent,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          {p.course.toUpperCase()} · {p.challenge ? 'RETO DE ADMISIÓN' : 'DINO RESPONDE'}
        </div>
        <div
          style={{
            fontSize: dense ? 26 : p.statement.length > 160 ? 30 : 38,
            lineHeight: 1.23,
            fontWeight: 700,
            letterSpacing: -0.6,
          }}
        >
          {p.statement}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {p.choices.map((c) => (
            <div
              key={c.label}
              style={{
                fontSize: dense ? 18 : 23,
                padding: dense ? '10px 16px' : '14px 18px',
                border: `1px solid ${reveal && c.correct ? '#6dd5ac' : '#ffffff26'}`,
                background: reveal && c.correct ? '#14382f' : '#101623',
                borderRadius: 13,
                display: 'flex',
                gap: 15,
              }}
            >
              <strong style={{ color: reveal && c.correct ? '#6dd5ac' : p.accent }}>
                {c.label}
              </strong>
              {c.text}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: reveal ? 240 : 94,
          left: 0,
          right: 0,
          height: 460,
          overflow: 'hidden',
          borderTop: '1px solid #ffffff14',
        }}
      >
        {p.clipUrl ? (
          <OffthreadVideo
            src={p.clipUrl}
            muted
            style={{ height: '100%', width: '100%', objectFit: 'contain', background: '#ffffff' }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              transform: `translateY(${sway}px) rotate(${sway * 0.25}deg) scale(1.025)`,
              transformOrigin: '70% 100%',
            }}
          >
            <Img
              src={staticFile('brand/mascot.webp')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'right center',
              }}
            />
          </div>
        )}
        {p.demo && (
          <span
            style={{
              position: 'absolute',
              left: 24,
              bottom: 16,
              background: '#090D16e8',
              border: '1px solid #ffffff30',
              padding: '8px 12px',
              fontSize: 17,
              borderRadius: 7,
            }}
          >
            DEMOSTRACIÓN · ANIMACIÓN LOCAL
          </span>
        )}
        {p.challenge && !reveal && (
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 30,
              width: 65,
              height: 65,
              borderRadius: 40,
              display: 'grid',
              placeItems: 'center',
              background: p.accent,
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {remaining}
          </div>
        )}
      </div>
      {reveal && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 35,
            right: 35,
            padding: 23,
            background: '#101623',
            border: '1px solid #6dd5ac66',
            borderRadius: 16,
            zIndex: 3,
          }}
        >
          <div style={{ color: '#6dd5ac', fontSize: 19, fontWeight: 700, marginBottom: 9 }}>
            LA CLAVE ESTÁ EN ENTENDER
          </div>
          <div style={{ fontSize: p.explanation.length > 350 ? 20 : 25, lineHeight: 1.4 }}>
            {p.explanation}
          </div>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 85,
          background: p.accent,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 23,
          fontWeight: 700,
        }}
      >
        Practica para la UNSA en ingresa.pe ↗
      </div>
    </AbsoluteFill>
  );
}
