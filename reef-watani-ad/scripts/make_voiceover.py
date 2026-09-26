"""يولّد تعليقًا صوتيًا آليًا بصوت ذكوري عربي (Piper ar_JO-kareem عبر sherpa-onnx)
ويضع كل جملة على توقيت مشهدها، ثم يعالج الصوت (تعميق خفيف، دفء، ضغط، صدى بسيط).

ملاحظة: هذا صوت اصطناعي مؤقت؛ للنسخة النهائية يُنصح بتسجيل معلّق سعودي حقيقي
وحفظه في public/audio/voiceover.mp3.

التشغيل:
  pip install sherpa-onnx numpy imageio-ffmpeg
  python3 scripts/make_voiceover.py <مجلد نموذج vits-piper-ar_JO-kareem-medium>
"""
import os
import subprocess
import sys
import wave

import numpy as np
import sherpa_onnx

MODEL_DIR = sys.argv[1]
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
DUR = 35.0
GAP = 0.3

# (أقرب بداية للجملة بالثواني، النص مشكولًا لضبط النطق)
# تبدأ الجملة عند توقيتها أو بعد نهاية السابقة بـ GAP ثانية، أيهما أبعد
LINES = [
    (0.7, 'كُلُّ شَتْلَةٍ تَبْدَأُ بِخُطْوَة'),
    (0, 'وَتَكْبُرُ مَعَهَا فُرَصٌ جَدِيدَة'),
    (0, 'فِي رِيفْ وَطَنِي، نُنْتِجُ وَنُوَرِّدُ شَتَلَاتِ الْأَشْجَارِ الْبَرِّيَّهْ'),
    (0, 'وَأَشْجَارِ الزِينَة'),
    (13.6, 'بِخِيَارَاتٍ مُتَنَوِّعَةٍ تُنَاسِبُ الْأَفْرَادَ وَالْمَشَارِيع'),
    (22.6, 'مِنْ بِدَايَةِ النُمُو، حَتَّى تَجْهِيزِ الطَّلَب'),
    (0, 'نَهْتَمُّ بِالتَّفَاصِيلِ الَّتِي تَصْنَعُ الْفَرْقْ.'),
    (30.6, 'رِيفْ وَطَنِي، نَنمُو مَعَ أَرْضِنَا.'),
]

cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=os.path.join(MODEL_DIR, 'ar_JO-kareem-medium.onnx'),
            tokens=os.path.join(MODEL_DIR, 'tokens.txt'),
            data_dir=os.path.join(MODEL_DIR, 'espeak-ng-data'),
            noise_scale=0.55,
            noise_scale_w=0.7,
            length_scale=1.08,
        ),
        num_threads=4,
    ),
)
tts = sherpa_onnx.OfflineTts(cfg)

def trim(x, sr, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.03 * sr))
    b = min(len(x), idx[-1] + int(0.12 * sr))
    return x[a:b]


sr = None
track = None
prev_end = 0.0
for target, text in LINES:
    audio = tts.generate(text, sid=0, speed=1.0)
    sr = audio.sample_rate
    if track is None:
        track = np.zeros(int(DUR * sr), dtype=np.float32)
    s = trim(np.array(audio.samples, dtype=np.float32), sr)
    start = max(target, prev_end + GAP)
    prev_end = start + len(s) / sr
    i = int(start * sr)
    end = min(len(track), i + len(s))
    track[i:end] += s[: end - i]
    print(f'{start:5.1f}s → {start + len(s) / sr:5.1f}s  {text}')

raw = os.path.join(OUT_DIR, 'voiceover-raw.wav')
with wave.open(raw, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((np.clip(track / (np.abs(track).max() + 1e-9) * 0.9, -1, 1) * 32767).astype('<i2').tobytes())

try:
    import imageio_ffmpeg

    ff = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ff = 'ffmpeg'

# تعميق بنصف درجة تقريبًا مع الحفاظ على الإيقاع، ودفء في الترددات المنخفضة، وضغط، وصدى خفيف جدًا
fx = (
    f'aresample=44100,asetrate=44100*0.95,aresample=44100,atempo=1/0.95,'
    'equalizer=f=140:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2,highpass=f=70,'
    'acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=3,'
    'aecho=0.8:0.5:40|75:0.12|0.07,loudnorm=I=-16:TP=-1.5:LRA=9'
)
subprocess.run(
    [ff, '-v', 'error', '-y', '-i', raw, '-af', fx, '-ac', '2', '-ar', '44100', '-t', str(DUR),
     os.path.join(OUT_DIR, 'voiceover.wav')],
    check=True,
)
os.remove(raw)
print('voiceover.wav ok')
