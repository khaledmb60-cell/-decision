import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {AUDIO} from './assets';
import {C, DURATION, FPS, SCENES, XF} from './theme';
import {Scene1, Scene2, Scene3, Scene4, Scene5} from './scenes/Scenes';

const list = [
  {s: SCENES.s1, C: Scene1},
  {s: SCENES.s2, C: Scene2},
  {s: SCENES.s3, C: Scene3},
  {s: SCENES.s4, C: Scene4},
  {s: SCENES.s5, C: Scene5},
];

export const ReefWataniAd: React.FC = () => {
  // تنخفض الموسيقى تحت التعليق الصوتي
  const musicLevel = AUDIO.voiceover ? 0.16 : 0.32;
  return (
    <AbsoluteFill style={{background: C.green900}}>
      {list.map(({s, C: Scene}, i) => {
        const last = i === list.length - 1;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.to - s.from + (last ? 0 : XF)}>
            <Scene />
          </Sequence>
        );
      })}

      {AUDIO.music && (
        <Audio
          src={staticFile(AUDIO.music)}
          volume={(f) =>
            musicLevel *
            interpolate(f, [0, 20, DURATION - 45, DURATION], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
      {AUDIO.ambience && (
        <Audio
          src={staticFile(AUDIO.ambience)}
          volume={(f) =>
            0.22 * interpolate(f, [0, 30, DURATION - 45, DURATION], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
      {AUDIO.voiceover && (
        <Sequence from={Math.round(0.6 * FPS)}>
          <Audio src={staticFile(AUDIO.voiceover)} volume={1} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
