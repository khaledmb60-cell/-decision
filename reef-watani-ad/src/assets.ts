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
};

export const LOGO: string | null = null; // مثال: 'brand/logo.png' (يفضل PNG شفاف)

export const AUDIO = {
  voiceover: null as string | null, // مثال: 'audio/voiceover.mp3'
  music: 'audio/music.wav' as string | null,
  ambience: 'audio/ambience.wav' as string | null,
};

export const CLIPS = {
  // 0–5 ث
  sprout: {src: null, brief: 'لقطة ماكرو قريبة لشتلة صغيرة تخرج من التربة'} as Clip,
  // 5–13 ث
  rows: [
    {src: null, brief: 'حركة كاميرا بطيئة على صفوف الشتلات داخل المشتل'},
    {src: null, brief: 'لقطة جانبية لصفوف أشجار الزينة في الأصص'},
    {src: null, brief: 'لقطة علوية لصفوف الأشجار البرية'},
  ] as Clip[],
  // 13–23 ث
  variety: [
    {src: null, brief: 'شتلة صغيرة في كيس زراعي'},
    {src: null, brief: 'شجرة زينة متوسطة الحجم'},
    {src: null, brief: 'شجرة برية كبيرة جاهزة للمشاريع'},
    {src: null, brief: 'لقطة واسعة تجمع أحجامًا مختلفة'},
  ] as Clip[],
  // 23–30 ث
  prep: [
    {src: null, brief: 'يد تفحص أوراق الشتلة وجذورها'},
    {src: null, brief: 'تجهيز الشتلات وترتيبها للتحميل والتوريد'},
  ] as Clip[],
};
