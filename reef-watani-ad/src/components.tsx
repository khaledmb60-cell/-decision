import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C, FONT_BODY, FONT_DISPLAY, XF} from './theme';
import {Clip, LOGO} from './assets';

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** تلاشي دخول وخروج للمشهد كاملًا */
export const SceneFade: React.FC<{children: React.ReactNode; inF?: number; outF?: number}> = ({
  children,
  inF = XF,
  outF = XF,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const o = Math.min(
    inF ? interpolate(frame, [0, inF], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1,
    outF
      ? interpolate(frame, [durationInFrames - outF, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1,
  );
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

/** خلفية مؤقتة راقية تعرض وصف اللقطة المطلوبة إلى أن تضاف اللقطة الحقيقية */
const Placeholder: React.FC<{brief: string; seed: number; tone: 'dark' | 'light'}> = ({brief, seed, tone}) => {
  const frame = useCurrentFrame();
  const orbs = new Array(7).fill(0).map((_, i) => {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    return {
      x: r('x') * 100 + Math.sin((frame + r('p') * 300) / 90) * 4,
      y: r('y') * 100 + Math.cos((frame + r('q') * 300) / 110) * 4,
      s: 260 + r('s') * 520,
      c: i % 3 === 0 ? C.lime : i % 3 === 1 ? C.green600 : C.beigeDeep,
      a: 0.16 + r('a') * 0.22,
    };
  });
  const bg =
    tone === 'dark'
      ? `radial-gradient(120% 80% at 50% 30%, ${C.green700} 0%, ${C.green900} 70%)`
      : `radial-gradient(120% 80% at 50% 30%, ${C.beige} 0%, ${C.beigeDeep} 80%)`;
  return (
    <AbsoluteFill style={{background: bg}}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: o.s,
            height: o.s,
            marginLeft: -o.s / 2,
            marginTop: -o.s / 2,
            borderRadius: '50%',
            background: o.c,
            opacity: o.a,
            filter: 'blur(90px)',
          }}
        />
      ))}
      <div
        dir="rtl"
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: '44%',
          padding: '18px 26px',
          border: `2px dashed ${tone === 'dark' ? 'rgba(239,229,208,0.35)' : 'rgba(22,49,31,0.35)'}`,
          borderRadius: 18,
          fontFamily: FONT_BODY,
          fontSize: 30,
          color: tone === 'dark' ? 'rgba(239,229,208,0.7)' : 'rgba(22,49,31,0.7)',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        مكان اللقطة الحقيقية: {brief}
      </div>
    </AbsoluteFill>
  );
};

/** لقطة فيديو مع حركة كاميرا بطيئة (Ken Burns) */
export const Shot: React.FC<{
  clip: Clip;
  seed: number;
  zoom?: [number, number];
  pan?: [number, number];
  tone?: 'dark' | 'light';
}> = ({clip, seed, zoom = [1.08, 1.18], pan = [0, 0], tone = 'dark'}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  const s = zoom[0] + (zoom[1] - zoom[0]) * p;
  const x = pan[0] + (pan[1] - pan[0]) * p;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${s}) translateX(${x}px)`}}>
        {clip.src ? (
          <OffthreadVideo
            src={staticFile(clip.src)}
            muted
            playbackRate={clip.playbackRate ?? 1}
            startFrom={Math.round((clip.startFrom ?? 0) * fps)}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        ) : (
          <Placeholder brief={clip.brief} seed={seed} tone={tone} />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** تدرج لوني سينمائي أخضر/بيج مع تعتيم للحواف وحبيبات فيلم */
export const Grade: React.FC<{bottom?: number}> = ({bottom = 0.85}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'rgba(30,64,41,0.18)', mixBlendMode: 'multiply'}} />
      <AbsoluteFill style={{background: 'rgba(239,229,208,0.08)', mixBlendMode: 'soft-light'}} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(15,36,25,0.55) 0%, rgba(15,36,25,0) 22%, rgba(15,36,25,0) 48%, rgba(15,36,25,${bottom}) 100%)`,
        }}
      />
      <AbsoluteFill style={{boxShadow: 'inset 0 0 260px rgba(0,0,0,0.45)'}} />
      <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 12} />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** عنوان عربي يظهر كلمة كلمة مع صعود ناعم وخط ليموني */
export const Headline: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  bottom?: number;
  font?: string;
  bar?: boolean;
  weight?: number;
  hold?: boolean;
}> = ({text, delay = 8, size = 84, color = C.beige, bottom = 330, font = FONT_BODY, bar = true, weight = 800, hold = false}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  // «|» يفرض سطرًا جديدًا، و«ريف وطني» لا ينقسم بين سطرين
  const lines = text.split('|').map((l) => l.replace(/ريف وطني/g, 'ريف\u00A0وطني').trim().split(' '));
  const words = lines.flat();
  const out = hold ? 1 : interpolate(frame, [durationInFrames - XF - 10, durationInFrames - XF + 2], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barW = interpolate(frame, [delay + 6, delay + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });
  return (
    <div
      dir="rtl"
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom,
        textAlign: 'center',
        opacity: out,
        transform: `translateY(${(1 - out) * -20}px)`,
      }}
    >
      {bar && (
        <div
          style={{
            width: 120 * barW,
            height: 6,
            borderRadius: 3,
            background: C.lime,
            margin: '0 auto 34px',
          }}
        />
      )}
      <div
        style={{
          fontFamily: font,
          fontWeight: weight,
          fontSize: size,
          lineHeight: 1.35,
          color,
          textShadow: color === C.beige ? '0 4px 30px rgba(0,0,0,0.45)' : 'none',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: size * 0.28,
        }}
      >
        {lines.map((line, li) => (
          <div key={li} style={{display: 'flex', justifyContent: 'center', columnGap: size * 0.28, width: '100%'}}>
            {line.map((w, wi) => {
              const i = lines.slice(0, li).flat().length + wi;
          const t = interpolate(frame, [delay + i * 5, delay + i * 5 + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: ease,
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: t,
                transform: `translateY(${(1 - t) * 40}px)`,
                filter: `blur(${(1 - t) * 8}px)`,
              }}
            >
              {w}
            </span>
          );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/** رمز ورقة بسيط يستخدم فقط عند عدم توفر ملف الشعار */
const LeafMark: React.FC<{size: number; color: string; accent: string}> = ({size, color, accent}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M50 92 C50 70 50 55 50 40" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M50 58 C30 58 18 44 18 24 C38 24 50 36 50 58 Z" fill={accent} />
    <path d="M50 46 C70 46 84 32 84 10 C62 10 50 24 50 46 Z" fill={color} />
  </svg>
);

/** الشعار: يستخدم ملف الشعار المرفق إن وُجد، وإلا يعرض شعارًا نصيًا مؤقتًا */
export const Logo: React.FC<{width: number; onLight?: boolean}> = ({width, onLight = false}) => {
  if (LOGO) {
    return <Img src={staticFile(LOGO)} style={{width, height: 'auto', objectFit: 'contain'}} />;
  }
  const main = onLight ? C.green800 : C.beige;
  return (
    <div dir="rtl" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: width * 0.02}}>
      <LeafMark size={width * 0.34} color={main} accent={C.lime} />
      <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: width * 0.26, color: main, lineHeight: 1.1}}>
        ريف وطني
      </div>
    </div>
  );
};
