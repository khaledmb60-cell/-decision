// ملف ربط المواد الحقيقية بالإعلان.
// ضع الملفات داخل مجلد public/ ثم اكتب اسم الملف هنا بدل null.
// أي خانة تبقى null تُعرض مكانها خلفية مؤقتة مع وصف اللقطة المطلوبة.

export type Clip = {
  /** مسار الملف داخل public/ مثل 'footage/seedling-closeup.mp4' أو null */
  src: string | null;
  /** وصف اللقطة المطلوبة (يظهر في المعاينة فقط عند غياب الملف) */
  brief: string;
  /** ثانية البداية داخل ملف الفيديو */
  startFrom?: number;
  /** سرعة التشغيل (1 = طبيعية) */
  playbackRate?: number;
};

export const LOGO: string | null = null; // مثال: 'brand/logo.png' (يفضل PNG شفاف)

export const AUDIO = {
  voiceover: null as string | null, // مثال: 'audio/voiceover.mp3'
  music: 'audio/music.wav' as string | null,
  ambience: 'audio/ambience.wav' as string | null,
};

export const CLIPS = {
  // 0–5 ث: لقطة قريبة للشتلات في أكياسها (مبطّأة بالاستيفاء الحركي)
  sprout: {src: 'footage/sprout-closeup.mp4', brief: 'لقطة ماكرو قريبة لشتلة صغيرة'} as Clip,
  // 5–13 ث: جولة بين صفوف الشتلات
  rows: [{src: 'footage/rows-walk.mp4', brief: 'حركة كاميرا بطيئة على صفوف الشتلات'}] as Clip[],
  // 13–23 ث: خلفية مشهد التنوع (تظهر مموّهة خلف الصور)
  varietyBg: {src: 'footage/rows-walk.mp4', brief: 'صفوف الشتلات', playbackRate: 0.8} as Clip,
  // 23–30 ث: الشتلات في أكياسها جاهزة للتجهيز والتوريد
  prep: [
    {src: 'footage/rows-wide.mp4', brief: 'صفوف الشتلات في أكياسها', startFrom: 0.6},
    {src: 'footage/prep-closeup.mp4', brief: 'لقطة قريبة للشتلات الجاهزة'},
  ] as Clip[],
};

// صور الشتلات الفردية لمشهد التنوع (13–23 ث)
export const PHOTOS: string[] = [
  'photos/sapling-1.jpg',
  'photos/sapling-2.jpg',
  'photos/sapling-3.jpg',
  'photos/sapling-4.jpg',
];
