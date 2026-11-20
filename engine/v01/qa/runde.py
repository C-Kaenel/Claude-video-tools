# Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
# Übersichtsbild für die Bild-Schleife (Skill K0003): 2–8 Testbilder nebeneinander auf EINEM Bild, nummeriert 1, 2, 3 …
# von links nach rechts (grosse Nummer oben links auf jedem Bild, Dateiname darunter). Hoch- und Querformat dürfen gemischt
# sein (Stufe 2: 2 von 5 Bildern im Langformat) – alle Bilder bekommen dieselbe Höhe.
# Die Ausgabe wird nie überschrieben: ohne --aus entsteht im Ordner der Bilder die nächste freie runde_NN.png.
#
# Aufruf (aus dem Hauptordner):
#   python engine/v01/qa/runde.py <ordner>                         alle PNG/JPG im Ordner (nach Name sortiert, ohne runde_*.png)
#   python engine/v01/qa/runde.py <bild1> <bild2> … [--aus <datei.png>] [--hoehe 720] [--titel "Runde 3"]
# Rückgabe 0 = Bild geschrieben; der Pfad steht in der letzten Zeile.
import argparse, glob, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SCHRIFT = os.path.join(ROOT, "assets", "fonts", "archivo-black", "ArchivoBlack-Regular.ttf")
GRUND, HELL, AKZENT = (24, 22, 30), (235, 235, 240), (255, 196, 40)


def schrift(px):
    try:
        return ImageFont.truetype(SCHRIFT, px)
    except OSError:
        return ImageFont.load_default(size=px)   # Schriften fehlen (node tools/get-fonts.mjs): Pillow-Standardschrift


def bilder_aus(args):
    if len(args) == 1 and os.path.isdir(args[0]):
        d = args[0]
        out = [f for f in sorted(glob.glob(os.path.join(d, "*.*"))) if f.lower().endswith((".png", ".jpg", ".jpeg"))
               and not re.match(r"runde_\d+\.png$", os.path.basename(f))]
        return out, d
    return list(args), os.path.dirname(os.path.abspath(args[0])) if args else "."


def naechste(ordner):
    nr = [int(m.group(1)) for f in os.listdir(ordner) if (m := re.match(r"runde_(\d+)\.png$", f))]
    return os.path.join(ordner, f"runde_{(max(nr) + 1) if nr else 1:02d}.png")


def main():
    for s in (sys.stdout, sys.stderr):
        if hasattr(s, "reconfigure"): s.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("bilder", nargs="+"); ap.add_argument("--aus"); ap.add_argument("--hoehe", type=int, default=720)
    ap.add_argument("--titel")
    a = ap.parse_args()
    dateien, ordner = bilder_aus(a.bilder)
    if not 2 <= len(dateien) <= 8: sys.exit(f"2 bis 8 Bilder nötig, gefunden: {len(dateien)}")
    fehlt = [f for f in dateien if not os.path.isfile(f)]
    if fehlt: sys.exit("nicht gefunden: " + ", ".join(fehlt))
    aus = a.aus or naechste(ordner)
    if os.path.exists(aus): sys.exit(f"{aus} gibt es schon – nie überschreiben, anderen Namen wählen")

    H, rand, unter = a.hoehe, 16, 34
    kopf = 56 if a.titel else 0
    kacheln = []
    for f in dateien:
        im = Image.open(f).convert("RGB")
        kacheln.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
    W = sum(k.width for k in kacheln) + rand * (len(kacheln) + 1)
    bild = Image.new("RGB", (W, kopf + H + unter + 2 * rand), GRUND)
    d = ImageDraw.Draw(bild)
    if a.titel: d.text((rand, rand), a.titel, font=schrift(34), fill=HELL)
    gross, klein = schrift(max(28, H // 9)), schrift(18)
    x = rand
    for i, (k, f) in enumerate(zip(kacheln, dateien), 1):
        y = kopf + rand
        bild.paste(k, (x, y))
        r = max(26, H // 13)   # Nummer im gelben Kreis, oben links
        d.ellipse([x + 10, y + 10, x + 10 + 2 * r, y + 10 + 2 * r], fill=AKZENT, outline=GRUND, width=4)
        d.text((x + 10 + r, y + 10 + r), str(i), font=gross, fill=GRUND, anchor="mm")
        name = os.path.basename(f)
        while d.textlength(name, font=klein) > k.width and len(name) > 4: name = name[:-2]
        d.text((x, y + H + 8), name, font=klein, fill=HELL)
        x += k.width + rand
    os.makedirs(os.path.dirname(os.path.abspath(aus)), exist_ok=True)
    bild.save(aus)
    for i, f in enumerate(dateien, 1): print(f"  {i}: {os.path.basename(f)}")
    print(aus)


if __name__ == "__main__":
    main()
