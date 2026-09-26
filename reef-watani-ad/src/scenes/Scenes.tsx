import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_DISPLAY, XF} from '../theme';
import {CLIPS} from '../assets';
import {Grade, Headline, Logo, SceneFade, Shot} from '../components';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0–5 ث: شتلة قريبة + الشعار + «من الجذور تبدأ الحكاية» */
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const logoIn = interpolate(frame, [10, 40], [0, 1], {...clamp, easing: ease});
  return (
    <SceneFade inF={10}>
      <Shot clip={CLIPS.sprout} seed={1} zoom={[1.22, 1.06]} />
      <Grade />
      <div
        style={{
          position: 'absolute',
          top: 300,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: logoIn,
          transform: `scale(${0.92 + logoIn * 0.08})`,
          filter: `blur(${(1 - logoIn) * 6}px)`,
        }}
      >
        <Logo width={360} />
      </div>
      <Headline text="من الجذور تبدأ الحكاية" delay={46} size={92} font={FONT_DISPLAY} weight={700} />
    </SceneFade>
  );
};

/** مجموعة لقطات متتالية بانتقالات تلاشٍ ناعمة داخل المشهد */
const ShotChain: React.FC<{
  clips: {src: string | null; brief: string}[];
  total: number;
  seed: number;
  pans?: [number, number][];
}> = ({clips, total, seed, pans}) => {
  const each = Math.ceil(total / clips.length);
  return (
    <>
      {clips.map((clip, i) => (
        <Sequence key={i} from={i * each} durationInFrames={each + XF} layout="none">
          <AbsoluteFill>
            <SceneFade inF={i === 0 ? 0 : XF} outF={0}>
              <Shot clip={clip} seed={seed + i} pan={pans?.[i] ?? [0, 0]} zoom={[1.12, 1.2]} />
            </SceneFade>
          </AbsoluteFill>
        </Sequence>
      ))}
    </>
  );
};

/** 5–13 ث: صفوف الشتلات + «أشجار برية وأشجار زينة» */
export const Scene2: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  return (
    <SceneFade>
      <ShotChain
        clips={CLIPS.rows}
        total={durationInFrames - XF}
        seed={10}
        pans={[
          [40, -40],
          [-40, 40],
          [0, 0],
        ]}
      />
      <Grade />
      <Headline text="أشجار برية وأشجار زينة" delay={16} />
    </SceneFade>
  );
};

/** 13–23 ث: تنوع الأحجام (ثلاث لقطات مقسومة ثم لقطة واسعة) + «خيارات تناسب الأفراد والمشاريع» */
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const splitEnd = 180;
  const bandH = 1920 / 3;
  const splitOut = interpolate(frame, [splitEnd - 6, splitEnd + XF], [1, 0], clamp);
  return (
    <SceneFade>
      <Sequence from={splitEnd - 6} layout="none">
        <AbsoluteFill>
          <Shot clip={CLIPS.variety[3]} seed={23} zoom={[1.16, 1.04]} />
        </AbsoluteFill>
      </Sequence>
      <AbsoluteFill style={{opacity: splitOut, background: C.beige}}>
        {CLIPS.variety.slice(0, 3).map((clip, i) => {
          const t = interpolate(frame, [i * 14, i * 14 + 28], [0, 1], {...clamp, easing: ease});
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: i * bandH + (i > 0 ? 4 : 0),
                height: bandH - (i > 0 ? 4 : 0),
                left: 0,
                right: 0,
                overflow: 'hidden',
                clipPath: `inset(0 0 0 ${(1 - t) * 100}%)`,
              }}
            >
              <div style={{position: 'absolute', top: -bandH, height: 1920, left: 0, right: 0}}>
                <Shot clip={clip} seed={20 + i} zoom={[1.05 + i * 0.03, 1.12 + i * 0.03]} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <Grade bottom={0.9} />
      <Headline text="خيارات تناسب|الأفراد والمشاريع" delay={40} size={80} />
    </SceneFade>
  );
};

/** زوايا إطار ليمونية تعطي إحساس الفحص والتدقيق */
const InspectFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [10, 40], [0, 1], {...clamp, easing: ease});
  const inset = 150 - t * 40;
  const L = 90;
  const corner = (pos: React.CSSProperties, b: React.CSSProperties) => (
    <div style={{position: 'absolute', width: L, height: L, ...pos, ...b, opacity: t * 0.9}} />
  );
  const line = `5px solid ${C.lime}`;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {corner({top: inset + 120, left: inset - 40}, {borderTop: line, borderLeft: line, borderTopLeftRadius: 16})}
      {corner({top: inset + 120, right: inset - 40}, {borderTop: line, borderRight: line, borderTopRightRadius: 16})}
      {corner({top: 1080, left: inset - 40}, {borderBottom: line, borderLeft: line, borderBottomLeftRadius: 16})}
      {corner({top: 1080, right: inset - 40}, {borderBottom: line, borderRight: line, borderBottomRightRadius: 16})}
    </AbsoluteFill>
  );
};

/** 23–30 ث: فحص وتجهيز الشتلات + «إنتاج وتوريد من ريف وطني» */
export const Scene4: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  return (
    <SceneFade>
      <ShotChain
        clips={CLIPS.prep}
        total={durationInFrames - XF}
        seed={30}
        pans={[
          [-30, 30],
          [30, -30],
        ]}
      />
      <Grade />
      <InspectFrame />
      <Headline text="إنتاج وتوريد|من ريف وطني" delay={14} />
    </SceneFade>
  );
};

/** 30–35 ث: الشعار بوضوح + «ريف وطني… ننمو مع أرضنا» */
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const logoIn = interpolate(frame, [4, 34], [0, 1], {...clamp, easing: ease});
  const ring = interpolate(frame, [0, 150], [0.85, 1.1], clamp);
  return (
    <SceneFade outF={0}>
      <AbsoluteFill
        style={{background: `radial-gradient(90% 60% at 50% 42%, #F6EFDF 0%, ${C.beige} 55%, ${C.beigeDeep} 100%)`}}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 760,
          width: 820,
          height: 820,
          marginLeft: -410,
          marginTop: -410,
          borderRadius: '50%',
          border: `2px solid rgba(43,86,56,0.18)`,
          transform: `scale(${ring})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 760,
          width: 620,
          height: 620,
          marginLeft: -310,
          marginTop: -310,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(198,218,90,0.35) 0%, rgba(198,218,90,0) 70%)`,
          transform: `scale(${ring})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 520,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: logoIn,
          transform: `translateY(${(1 - logoIn) * 30}px) scale(${0.94 + logoIn * 0.06})`,
        }}
      >
        <Logo width={560} onLight />
      </div>
      <Headline
        text="ريف وطني… ننمو مع أرضنا"
        delay={38}
        size={78}
        color={C.green800}
        font={FONT_DISPLAY}
        weight={700}
        bottom={560}
        hold
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 14,
          background: `linear-gradient(90deg, ${C.green800}, ${C.lime})`,
          transform: `scaleX(${logoIn})`,
          transformOrigin: 'right',
        }}
      />
    </SceneFade>
  );
};
