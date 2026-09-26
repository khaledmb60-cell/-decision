"""يولّد موسيقى هادئة ملهمة ومؤثرات طبيعية خفيفة (رياح + طيور) بطول 35 ثانية.

الناتج: public/audio/music.wav و public/audio/ambience.wav
التشغيل: python3 scripts/make_audio.py  (يتطلب numpy)
"""
import os
import wave

import numpy as np

SR = 44100
DUR = 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, cutoff):
    # مرشح تمرير منخفض بسيط أحادي القطب يطبق مرتين
    a = np.exp(-2 * np.pi * cutoff / SR)
    for _ in range(2):
        y = np.empty_like(x)
        acc = 0.0
        for i in range(len(x)):
            acc = (1 - a) * x[i] + a * acc
            y[i] = acc
        x = y
    return x


def lowpass_fast(x, cutoff):
    # نسخة سريعة عبر FFT
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def write(name, L, R):
    stereo = np.stack([L, R], axis=1)
    stereo /= np.max(np.abs(stereo)) + 1e-9
    stereo *= 0.89
    data = (stereo * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


# ---------------- الموسيقى ----------------
# تقدم هارموني دافئ: Dmaj9 – Bm9 – Gmaj9 – Asus4 ... ثم قفلة على Dmaj9
chords = [
    [50, 57, 62, 66, 69, 76],
    [47, 54, 62, 66, 69, 73],
    [43, 50, 59, 62, 66, 69],
    [45, 52, 62, 64, 69, 71],
    [50, 57, 62, 66, 69, 76],
    [47, 54, 62, 66, 71, 73],
    [43, 50, 59, 62, 67, 71],
    [50, 57, 62, 66, 69, 74],
]
seg = DUR / len(chords)
L = np.zeros(N)
R = np.zeros(N)

for ci, ch in enumerate(chords):
    s0 = int(ci * seg * SR)
    s1 = min(N, int((ci + 1) * seg * SR + 1.5 * SR))
    n = s1 - s0
    tt = np.arange(n) / SR
    e = env(n, 1.2, 1.8)
    for k, m in enumerate(ch):
        f = midi(m)
        amp = 0.5 if k == 0 else 0.22
        for det, pan in ((-0.12, 0.3), (0.12, 0.7)):
            ff = f * 2 ** (det / 12 / 10)
            v = np.sin(2 * np.pi * ff * tt) + 0.25 * np.sin(4 * np.pi * ff * tt)
            v *= amp * e * (1 + 0.08 * np.sin(2 * np.pi * 0.2 * tt + k))
            L[s0:s1] += v * (1 - pan)
            R[s0:s1] += v * pan

L = lowpass_fast(L, 1800)
R = lowpass_fast(R, 1800)

# نغمات بيانو ناعمة (أربيجيو) تبدأ بعد الثانية 3 وتزداد قليلًا نحو النهاية
beat = 60 / 76 / 2
pl = np.zeros(N)
pr = np.zeros(N)
pattern = [2, 3, 4, 5, 4, 3]
i = 0
time = 3.0
while time < DUR - 3.5:
    ci = min(int(time / seg), len(chords) - 1)
    m = chords[ci][pattern[i % len(pattern)]] + 12
    f = midi(m)
    s0 = int(time * SR)
    n = min(int(2.4 * SR), N - s0)
    tt = np.arange(n) / SR
    v = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 6)) * np.exp(-tt * 2.2)
    v *= np.minimum(1, tt / 0.006)
    grow = 0.55 + 0.45 * min(1, time / 28)
    pan = 0.35 + 0.3 * rng.random()
    pl[s0:s0 + n] += v * grow * (1 - pan) * 0.33
    pr[s0:s0 + n] += v * grow * pan * 0.33
    time += beat
    i += 1

# صدى بسيط يعطي اتساعًا
for d, g in ((0.33, 0.35), (0.61, 0.2)):
    k = int(d * SR)
    pl[k:] += pr[:-k] * g
    pr[k:] += pl[:-k] * g * 0.8

# ضربة منخفضة ناعمة مع ظهور الشعار الختامي (30 ث)
s0 = int(30 * SR)
tt = np.arange(N - s0) / SR
boom = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 1.6) * 0.9
L[s0:] += boom
R[s0:] += boom

master = env(N, 1.0, 2.5)
write('music.wav', (L + pl) * master, (R + pr) * master)

# ---------------- المؤثرات الطبيعية ----------------
noise = rng.standard_normal(N)
brown = np.cumsum(noise)
brown -= lowpass_fast(brown, 0.5)
wind = lowpass_fast(brown, 500)
wind /= np.max(np.abs(wind))
wind *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t) ** 2

leaves = lowpass_fast(rng.standard_normal(N), 5000) - lowpass_fast(rng.standard_normal(N), 1500)
leaves *= (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t + 1)) ** 4 * 0.06

aL = wind * 0.5 + leaves
aR = np.roll(wind, 900) * 0.5 + np.roll(leaves, 400)

# تغريد طيور متباعد وخافت
for bt in [1.4, 2.1, 7.8, 8.2, 12.5, 17.9, 18.3, 24.6, 29.2, 31.5]:
    base = 3000 + rng.random() * 1800
    pan = rng.random()
    for c in range(int(2 + rng.random() * 3)):
        s0 = int((bt + c * 0.13) * SR)
        n = int(0.09 * SR)
        tt = np.arange(n) / SR
        sweep = base * (1 + 0.35 * np.sin(np.pi * tt / tt[-1]))
        ph = 2 * np.pi * np.cumsum(sweep) / SR
        v = np.sin(ph) * np.sin(np.pi * tt / tt[-1]) ** 2 * 0.12
        aL[s0:s0 + n] += v * (1 - pan)
        aR[s0:s0 + n] += v * pan

amb = env(N, 1.5, 2.5)
write('ambience.wav', aL * amb, aR * amb)
print('ok')
