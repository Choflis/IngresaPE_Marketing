import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { QuestionVideo, type VideoProps } from './QuestionVideo';
const defaults: VideoProps = {
  statement: '¿Listo para tu siguiente reto?',
  explanation: 'Practica un poco cada día.',
  choices: [
    { label: 'A', text: 'Empezar a practicar', correct: true },
    { label: 'B', text: 'Dejarlo para después', correct: false },
  ],
  course: 'Biología',
  area: 'Biomédicas',
  accent: '#C80727',
  demo: true,
  durationSeconds: 12,
};
const Root = () => (
  <Composition
    id="QuestionVideo"
    component={QuestionVideo}
    width={720}
    height={1280}
    fps={30}
    durationInFrames={360}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(props.durationSeconds * 30) })}
  />
);
registerRoot(Root);
