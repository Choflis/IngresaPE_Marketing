import React from 'react';
import type { Choice } from '../lib/types';
import { assertValidChoices } from '../lib/video-format';

export function QuestionChoices({
  choices,
  reveal,
  compact = false,
  accent = '#bd1737',
}: {
  choices: Choice[];
  reveal: boolean;
  compact?: boolean;
  accent?: string;
}) {
  assertValidChoices(choices);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 9 : 12 }}>
      {choices.map((c) => {
        const selected = reveal && c.correct;
        return (
          <div
            key={c.label}
            data-choice={c.label}
            data-correct={selected ? 'true' : 'false'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: compact ? '12px 13px' : '14px 18px',
              border: `2px solid ${selected ? '#238450' : '#e6e6e9'}`,
              borderRadius: 14,
              background: selected ? '#eaf7ee' : '#ffffff',
              color: '#25252b',
              fontSize: compact ? 23 : 25,
              lineHeight: 1.25,
              fontWeight: selected ? 700 : 500,
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: selected ? '#238450' : accent,
                color: '#fff',
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {c.label}
            </span>
            <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{c.text}</span>
            {selected && (
              <span
                aria-label="Respuesta correcta"
                style={{ flexShrink: 0, color: '#1f7548', fontWeight: 800 }}
              >
                ✓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
