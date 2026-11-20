# Herkunft: eigen (V-Video), geschrieben 2026-11-11, ohne Vorlage.
# Übersichtsbogen der Raum-Prüfung: alle Prüfbilder shot_<id>.png eines Ordners klein auf EINEM Bild, beschriftet mit
# Shot-ID, Anzahl Funde und Details; Shots mit Funden rot umrandet. Spart das Ansehen vieler Einzelbilder.
# Hoch- und Querformat: Kachelgrösse und Spalten richten sich nach dem ersten Prüfbild.
# Aufruf (aus dem Hauptordner): python engine/v01/qa/uebersicht.py <raum-ordner>   → <raum-ordner>/uebersicht.png
import json, os, sys
from PIL import Image, ImageDraw



def main():
    d = sys.argv[1]
    info = {e["shot"]: e for e in json.load(open(os.path.join(d, "raum.json"), encoding="utf-8"))}
    shots = [s for s in info if os.path.exists(os.path.join(d, f"shot_{s}.png"))]
    if not shots: print("keine Prüfbilder"); return
    w0, h0 = Image.open(os.path.join(d, f"shot_{shots[0]}.png")).size
    TW, TH, COLS = (180, 320, 8) if h0 > w0 else (320, 180, 5)   # Kurzform 9:16 / Langform 16:9
    rows = (len(shots) + COLS - 1) // COLS
    img = Image.new("RGB", (COLS * (TW + 8) + 8, rows * (TH + 24) + 8), (24, 22, 30))
    dr = ImageDraw.Draw(img)
    for k, s in enumerate(shots):
        x, y = 8 + (k % COLS) * (TW + 8), 8 + (k // COLS) * (TH + 24)
        im = Image.open(os.path.join(d, f"shot_{s}.png")).convert("RGB"); im.thumbnail((TW, TH))
        img.paste(im, (x, y))
        n = len(info[s]["funde"])
        if n: dr.rectangle([x - 3, y - 3, x + im.width + 2, y + im.height + 2], outline=(255, 40, 60), width=3)
        dr.text((x, y + TH + 5), f"{s}  {n} Funde  {info[s].get('details') or 0} Det.", fill=(255, 120, 120) if n else (220, 220, 230))
    img.save(os.path.join(d, "uebersicht.png"))
    print(os.path.join(d, "uebersicht.png"))


if __name__ == "__main__":
    main()
