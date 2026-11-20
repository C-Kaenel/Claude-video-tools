# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Baut absichtlich Fehler in ein Video ein, um die Prüfung (pruefung.py) zu testen. Nur für Tests – Ausgabe nach output/.
#   Bild: schwarz (Frames a–b), weiss (Frame), eingefroren (a–b = Bild a wiederholt), Sprung (ab Frame f werden k Frames
#         übersprungen, am Ende aufgefüllt).
#   Ton (optional): lauter um +dB, Stille von–bis (s), Ton kürzer um s.
# Aufruf: python engine/v01/qa/fehler_einbauen.py <ein.mp4> <aus.mp4> --schwarz 40 44 --weiss 150 --eingefroren 230 250
#         --sprung 120 15 [--ton-lauter 4] [--ton-stille 20 23] [--ton-kuerzer 0.5]
import argparse, json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pruefung import FFMPEG, probe


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ein"); ap.add_argument("aus")
    ap.add_argument("--schwarz", nargs=2, type=int); ap.add_argument("--weiss", type=int)
    ap.add_argument("--eingefroren", nargs=2, type=int); ap.add_argument("--sprung", nargs=2, type=int)
    ap.add_argument("--ton-lauter", type=float); ap.add_argument("--ton-stille", nargs=2, type=float); ap.add_argument("--ton-kuerzer", type=float)
    a = ap.parse_args()
    info = probe(a.ein)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    W, H = int(v["width"]), int(v["height"]); rate = v["r_frame_rate"]
    has_audio = any(s["codec_type"] == "audio" for s in info["streams"])
    p = subprocess.Popen([FFMPEG, "-v", "error", "-i", a.ein, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = W * H * 3
    fr = []
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        fr.append(np.frombuffer(b, np.uint8).reshape(H, W, 3))
    p.wait()
    total = len(fr)
    if a.sprung:
        f, k = a.sprung
        fr = fr[:f] + fr[f + k:] + [fr[-1]] * k
    if a.schwarz:
        for i in range(a.schwarz[0], a.schwarz[1] + 1): fr[i] = np.zeros_like(fr[i])
    if a.weiss is not None: fr[a.weiss] = np.full_like(fr[a.weiss], 255)
    if a.eingefroren:
        s, e = a.eingefroren
        for i in range(s + 1, e + 1): fr[i] = fr[s]
    tmp = a.aus + ".bild.mp4"
    q = subprocess.Popen([FFMPEG, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", rate, "-i", "-",
                          "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for x in fr[:total]: q.stdin.write(x.tobytes())
    q.stdin.close(); q.wait()
    if has_audio:
        af = []
        if a.ton_lauter: af.append(f"volume={a.ton_lauter}dB")
        if a.ton_stille: af.append(f"volume=enable='between(t,{a.ton_stille[0]},{a.ton_stille[1]})':volume=0")
        cut = ["-t", f"{float(info['format']['duration']) - a.ton_kuerzer:.3f}"] if a.ton_kuerzer else []  # Ton-Eingang kürzen
        cmd = [FFMPEG, "-v", "error", "-y", "-i", tmp, *cut, "-i", a.ein, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k"]
        if af: cmd += ["-af", ",".join(af)]
        subprocess.run(cmd + [a.aus], check=True)
        os.remove(tmp)
    else:
        os.replace(tmp, a.aus)
    print("eingebaut:", json.dumps({k: v for k, v in vars(a).items() if v and k not in ("ein", "aus")}))


if __name__ == "__main__":
    main()
