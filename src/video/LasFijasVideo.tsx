import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { LAS_FIJAS, assertValidChoices, lasFijasPhase } from '../lib/video-format';
import { QuestionChoices } from './QuestionChoices';
import type { VideoProps } from './QuestionVideo';

function SchoolPaper() {
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <svg
        width="720"
        height="1280"
        viewBox="0 0 720 1280"
        style={{ opacity: 0.12 }}
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="school-paper"
            width="225"
            height="260"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-12)"
          >
            <g
              fill="none"
              stroke="#656573"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M30 50l27-13 27 13-27 13z M40 56v18q17 12 34 0V56 M85 52v26" />
              <path d="M130 135q22-10 44 0v44q-22-10-44 0-22-10-44 0v-44q22-10 44 0v44" />
              <circle cx="165" cy="50" r="16" />
              <path d="M156 64v11h18V64 M158 82h14 M165 16v-7 M140 25l-6-6 M190 25l6-6" />
              <path d="M28 213l24-24 7 7-24 24-11 5z M122 224h49 M137 209v30" />
            </g>
          </pattern>
        </defs>
        <rect width="720" height="1280" fill="url(#school-paper)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: -75,
          left: -50,
          width: 270,
          height: 90,
          borderRadius: '45%',
          background: '#c70f2b',
          transform: 'rotate(-15deg)',
        }}
      />
    </AbsoluteFill>
  );
}

export function LasFijasVideo(p: VideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const phase = lasFijasPhase(seconds);
  const reveal = phase === 'answer';
  const correct = assertValidChoices(p.choices);
  const clipActive = Boolean(p.clipUrl) && seconds < (p.clipDurationSeconds ?? p.durationSeconds);
  const dense = p.statement.length > 130 || p.choices.length > 3;
  return (
    <AbsoluteFill
      style={{ background: '#fcfcfd', color: '#25252b', fontFamily: 'Arial, sans-serif' }}
    >
      <SchoolPaper />
      <header
        style={{
          position: 'absolute',
          top: 55,
          left: 35,
          right: 35,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: '#a81d32' }}>
          RUMBO A LA UNSA
        </span>
        <Img
          src={staticFile('brand/logo.png')}
          style={{ width: 235, height: 65, objectFit: 'contain' }}
        />
      </header>
      <div
        style={{
          position: 'absolute',
          top: 160,
          left: 285,
          right: 25,
          textAlign: 'center',
          transform: 'rotate(-3deg)',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: 77,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 0.97,
            WebkitTextStroke: '6px #25252b',
            paintOrder: 'stroke fill',
            filter: 'drop-shadow(5px 5px 0 #c70f2b)',
          }}
        >
          LAS
        </div>
        <div
          style={{
            color: '#ffd34b',
            fontSize: 98,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1.06,
            WebkitTextStroke: '6px #25252b',
            paintOrder: 'stroke fill',
            filter: 'drop-shadow(5px 5px 0 #c70f2b)',
          }}
        >
          FIJAS
        </div>
        <span
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            color: '#fff',
            background: '#c70f2b',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          DE INGRESA PE
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 355,
          left: 0,
          width: 295,
          height: 790,
          overflow: 'hidden',
          borderRadius: 20,
        }}
      >
        {clipActive ? (
          <Sequence
            from={0}
            durationInFrames={Math.ceil((p.clipDurationSeconds ?? p.durationSeconds) * fps)}
            layout="none"
          >
            <OffthreadVideo
              src={p.clipUrl!}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
              }}
            />
          </Sequence>
        ) : (
          <Img
            src={staticFile('brand/mascot-las-fijas.webp')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: p.demo ? `translateY(${Math.sin(seconds * 2.2) * 2}px)` : undefined,
            }}
          />
        )}
      </div>
      {phase === 'intro' ? (
        <div style={{ position: 'absolute', top: 485, left: 320, right: 45, textAlign: 'center' }}>
          <div style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.3 }}>
            Un reto.
            <br />
            Una buena explicación.
          </div>
          <div style={{ marginTop: 30, fontSize: 22, color: '#63636e' }}>Lee. Elige. Aprende.</div>
          <span
            style={{
              display: 'inline-block',
              marginTop: 28,
              padding: '12px 20px',
              background: '#fff1d1',
              borderRadius: 30,
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            30 segundos para practicar
          </span>
        </div>
      ) : phase === 'outro' ? (
        <div
          style={{
            position: 'absolute',
            top: 450,
            left: 315,
            right: 35,
            borderRadius: 32,
            border: '2px solid #ededf0',
            background: '#fff',
            padding: '38px 25px',
            boxShadow: '0 12px 35px #25252b12',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 18, color: '#bd1737', fontWeight: 800, letterSpacing: 2 }}>
            SIGUE PRACTICANDO
          </span>
          <div style={{ fontSize: 43, fontWeight: 900, lineHeight: 1.12, margin: '25px 0' }}>
            Prepárate.
            <br />
            Practica.
            <br />
            Ingresa.
          </div>
          <p style={{ fontSize: 23, lineHeight: 1.4 }}>Una pregunta más cerca de tu meta.</p>
          <div
            style={{
              background: '#bd1737',
              color: '#fff',
              padding: '16px 8px',
              borderRadius: 15,
              marginTop: 28,
              fontSize: 27,
              fontWeight: 800,
            }}
          >
            ingresa.pe ↗
          </div>
        </div>
      ) : (
        <div style={{ position: 'absolute', top: 410, left: 303, right: 25 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: '#bd1737',
              marginBottom: 14,
            }}
          >
            {p.course.toUpperCase()}
          </div>
          <div
            style={{
              padding: 20,
              borderRadius: 22,
              background: '#ffffffed',
              border: '1px solid #e8e8ec',
              boxShadow: '0 8px 28px #25252b08',
            }}
          >
            <div
              style={{
                fontSize: dense ? 24 : 28,
                fontWeight: 750,
                lineHeight: 1.25,
                marginBottom: 18,
                overflowWrap: 'anywhere',
              }}
            >
              {p.statement}
            </div>
            <QuestionChoices choices={p.choices} reveal={reveal} compact />
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 20,
              color: reveal ? '#1f7548' : '#62626b',
              fontWeight: 700,
            }}
          >
            {reveal
              ? `✓ Respuesta correcta · ${correct.label}`
              : `Piensa tu respuesta · ${Math.max(1, Math.ceil(LAS_FIJAS.answerAt - seconds))} s`}
          </div>
        </div>
      )}
      {reveal && (
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 100,
            padding: '19px 23px',
            borderRadius: 18,
            background: '#edf7f0',
            border: '1px solid #b3d7bd',
          }}
        >
          <div
            style={{
              fontSize: 17,
              color: '#1f7548',
              fontWeight: 800,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            LA CLAVE ESTÁ EN ENTENDER
          </div>
          <div style={{ fontSize: 23, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
            {p.explanation}
          </div>
        </div>
      )}
      <footer
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          bottom: 25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 17,
          color: '#62626b',
        }}
      >
        <span>{p.demo ? 'VISTA DE DISEÑO · SIN VOZ' : 'ANIMACIÓN IA · SIN VOZ'}</span>
        <span style={{ color: '#bd1737', fontWeight: 800 }}>ingresa.pe ↗</span>
      </footer>
    </AbsoluteFill>
  );
}
