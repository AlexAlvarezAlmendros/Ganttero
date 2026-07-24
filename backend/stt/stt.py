#!/usr/bin/env python3
"""STT del spike: audio → transcripción con faster-whisper (CPU).

Uso: .venv/bin/python stt.py <audio> [--model small]
Salida: JSON por stdout → {"text", "language", "audio_sec", "latency_sec", "model"}
Los errores salen por stderr y el exit code es != 0 (el orquestador TS decide).
"""

import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from faster_whisper import WhisperModel


def to_wav_16k_mono(audio: str, out_dir: str) -> str:
    """Normaliza cualquier contenedor (aac/webm/ogg/…) a WAV 16 kHz mono.

    PyAV (el decoder de faster-whisper) se atraganta con algunos ADTS/AAC;
    ffmpeg no. En la app real el paso existirá igual para el webm del navegador.
    """
    out = str(Path(out_dir) / (Path(audio).stem + ".wav"))
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", audio, "-ar", "16000", "-ac", "1", out],
        check=True,
    )
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--model", default="small", help="tiny/base/small/medium/large-v3")
    parser.add_argument("--language", default="es")
    args = parser.parse_args()

    start = time.perf_counter()
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    with tempfile.TemporaryDirectory() as tmp:
        wav = to_wav_16k_mono(args.audio, tmp)
        segments, info = model.transcribe(
            wav,
            language=args.language,
            vad_filter=True,  # recorta silencios: menos latencia y menos alucinación
            beam_size=5,
        )
        segments = list(segments)  # el generador debe consumirse antes de borrar el wav
    text = " ".join(segment.text.strip() for segment in segments).strip()
    latency = time.perf_counter() - start

    if not text:
        print("transcripción vacía", file=sys.stderr)
        return 1

    json.dump(
        {
            "text": text,
            "language": info.language,
            "audio_sec": round(info.duration, 2),
            "latency_sec": round(latency, 2),
            "model": args.model,
        },
        sys.stdout,
        ensure_ascii=False,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
