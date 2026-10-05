import os
import wave
import struct
import math
import random

def generate_wav_files():
    dirs = [
        os.path.join(os.getcwd(), "backend", "demo", "audio"),
        os.path.join(os.getcwd(), "frontend", "public", "demo", "audio")
    ]

    for d in dirs:
        os.makedirs(d, exist_ok=True)

    sample_rate = 44100
    duration_sec = 4
    total_samples = sample_rate * duration_sec

    def write_wav(filepath, samples):
        with wave.open(filepath, "w") as wav_file:
            wav_file.setnchannels(1) # mono
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(sample_rate)
            for s in samples:
                # clamp to int16
                clamped = max(-32767, min(32767, int(s * 32767.0)))
                wav_file.writeframesraw(struct.pack("<h", clamped))

    # 1. Silence.wav
    silence_samples = [random.uniform(-0.005, 0.005) for _ in range(total_samples)]

    # 2. Normal Environment.wav (Calm ambient cafe / outdoor breeze: RMS ~0.06, freq ~200-350Hz)
    normal_samples = []
    for i in range(total_samples):
        t = i / sample_rate
        ambient = 0.04 * math.sin(2 * math.pi * 180 * t) + 0.02 * math.sin(2 * math.pi * 320 * t)
        noise = random.uniform(-0.02, 0.02)
        normal_samples.append(ambient + noise)

    # 3. Suspicious Noise.wav (Abrupt elevated footsteps & sudden rustling: RMS ~0.35, freq ~500-800Hz)
    suspicious_samples = []
    for i in range(total_samples):
        t = i / sample_rate
        # Intermittent sudden spikes
        envelope = 0.15 + (0.25 * math.sin(2 * math.pi * 1.5 * t) ** 2)
        tone = 0.20 * math.sin(2 * math.pi * 580 * t) + 0.15 * math.sin(2 * math.pi * 820 * t)
        noise = random.uniform(-0.10, 0.10)
        suspicious_samples.append((tone + noise) * envelope)

    # 4. Distress Sound.wav (High frequency scream / distress shriek: RMS ~0.75, peak freq 1200Hz - 2100Hz + harmonics)
    distress_samples = []
    for i in range(total_samples):
        t = i / sample_rate
        # Scream pitch modulation between 1200 Hz and 2200 Hz
        inst_freq = 1400.0 + 700.0 * math.sin(2 * math.pi * 3.5 * t)
        phase = 2 * math.pi * inst_freq * t
        scream = 0.50 * math.sin(phase) + 0.25 * math.sin(phase * 2) + 0.15 * math.sin(phase * 3)
        surge_env = 0.5 + 0.5 * math.sin(2 * math.pi * 1.2 * t)
        noise = random.uniform(-0.15, 0.15)
        distress_samples.append(min(1.0, max(-1.0, (scream + noise) * surge_env * 0.9)))

    for target_dir in dirs:
        write_wav(os.path.join(target_dir, "silence.wav"), silence_samples)
        write_wav(os.path.join(target_dir, "normal_environment.wav"), normal_samples)
        write_wav(os.path.join(target_dir, "suspicious_noise.wav"), suspicious_samples)
        write_wav(os.path.join(target_dir, "distress_sound.wav"), distress_samples)

    print("Successfully generated demo WAV audio files in backend and frontend!")

if __name__ == "__main__":
    generate_wav_files()
