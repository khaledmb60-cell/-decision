import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/tajawal/800.css';
import '@fontsource/el-messiri/600.css';
import '@fontsource/el-messiri/700.css';

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DURATION = 35 * FPS;

export const C = {
  green900: '#0F2419',
  green800: '#16311F',
  green700: '#1E4029',
  green600: '#2B5638',
  lime: '#C6DA5A',
  limeSoft: '#DDE89A',
  beige: '#EFE5D0',
  beigeDeep: '#E2D3B3',
  ink: '#0B1A12',
};

export const FONT_BODY = "'Tajawal', sans-serif";
export const FONT_DISPLAY = "'El Messiri', 'Tajawal', serif";

// توقيت المشاهد بالإطارات (30 إطار/ث)، مع تداخل 12 إطارًا للانتقال
export const XF = 12;
export const SCENES = {
  s1: {from: 0, to: 5 * FPS},
  s2: {from: 5 * FPS, to: 13 * FPS},
  s3: {from: 13 * FPS, to: 23 * FPS},
  s4: {from: 23 * FPS, to: 30 * FPS},
  s5: {from: 30 * FPS, to: 35 * FPS},
};
