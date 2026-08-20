#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
png2webp — convertește imagini PNG (și JPG) în WebP, cu fundal ALB.

Pune fundal alb în locul transparenței (util pentru poze de produs cu fundal
transparent, ca să nu iasă negru pe fundaluri închise), respectă orientarea
EXIF și, opțional, redimensionează.

Exemple:
  # convertește toate PNG-urile din folderul curent (creează .webp lângă ele)
  python3 png2webp.py

  # un folder anume, recursiv, calitate 82, fundal alb (implicit)
  python3 png2webp.py public/assets/img -r -q 82

  # scrie rezultatele într-un alt folder și limitează latura la 1200px
  python3 png2webp.py poze/ --out poze_webp --max 1200

  # șterge PNG-ul original după conversie reușită
  python3 png2webp.py public/assets/img/products -r --delete

Necesită: Pillow cu suport WebP  ->  pip install Pillow
"""
import argparse
import os
import sys

try:
    from PIL import Image, ImageOps, features
except ImportError:
    sys.exit("Lipsește Pillow. Instalează cu:  pip install Pillow")

if not features.check("webp"):
    sys.exit("Pillow-ul instalat nu are suport WebP. Reinstalează:  pip install -U Pillow")

INPUT_EXT = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif"}


def hex_to_rgb(s):
    s = (s or "").lstrip("#").strip()
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        raise argparse.ArgumentTypeError("Culoare invalidă (folosește ex. #ffffff sau fff)")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def gather(path, recursive):
    """Întoarce lista de fișiere-imagine de procesat."""
    if os.path.isfile(path):
        return [path]
    files = []
    if recursive:
        for root, _dirs, names in os.walk(path):
            for n in names:
                if os.path.splitext(n)[1].lower() in INPUT_EXT:
                    files.append(os.path.join(root, n))
    else:
        for n in sorted(os.listdir(path)):
            fp = os.path.join(path, n)
            if os.path.isfile(fp) and os.path.splitext(n)[1].lower() in INPUT_EXT:
                files.append(fp)
    return sorted(files)


def out_path(src, in_root, out_dir):
    """Calea .webp de ieșire (păstrează structura de subfoldere sub --out)."""
    if not out_dir:
        return os.path.splitext(src)[0] + ".webp"
    if os.path.isdir(in_root):
        rel = os.path.relpath(src, in_root)
    else:
        rel = os.path.basename(src)
    dst = os.path.join(out_dir, os.path.splitext(rel)[0] + ".webp")
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    return dst


def convert(src, dst, bg, quality, lossless, max_side):
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)  # respectă orientarea din EXIF

    # Aplatizează pe fundal alb (sau culoarea aleasă) dacă are transparență.
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, bg)
        canvas.paste(rgba, mask=rgba.split()[-1])  # canalul alpha ca mască
        im = canvas
    else:
        im = im.convert("RGB")

    if max_side and max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.LANCZOS)

    params = {"lossless": True} if lossless else {"quality": quality, "method": 6}
    im.save(dst, "WEBP", **params)
    return os.path.getsize(dst)


def main():
    ap = argparse.ArgumentParser(
        description="Convertește PNG/JPG în WebP cu fundal alb.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("path", nargs="?", default=".", help="Fișier sau folder (implicit: folderul curent)")
    ap.add_argument("-o", "--out", help="Folder de ieșire (implicit: .webp lângă original)")
    ap.add_argument("-q", "--quality", type=int, default=90, help="Calitate WebP 1-100 (implicit 90)")
    ap.add_argument("--bg", type=hex_to_rgb, default=(255, 255, 255), help="Culoare fundal (implicit #ffffff)")
    ap.add_argument("-r", "--recursive", action="store_true", help="Caută recursiv în subfoldere")
    ap.add_argument("--lossless", action="store_true", help="WebP fără pierderi (fișiere mai mari)")
    ap.add_argument("--max", type=int, default=0, metavar="PX", help="Redimensionează astfel încât latura max ≤ PX")
    ap.add_argument("--delete", action="store_true", help="Șterge originalul după conversie reușită")
    ap.add_argument("--overwrite", action="store_true", help="Rescrie .webp existent (implicit: sare peste)")
    args = ap.parse_args()

    if not os.path.exists(args.path):
        sys.exit("Nu există calea: " + args.path)

    files = gather(args.path, args.recursive)
    if not files:
        sys.exit("Niciun fișier-imagine găsit (caut: %s)." % ", ".join(sorted(INPUT_EXT)))

    ok = skip = err = 0
    saved_in = saved_out = 0
    for src in files:
        dst = out_path(src, args.path, args.out)
        if os.path.abspath(src) == os.path.abspath(dst):
            dst = os.path.splitext(src)[0] + ".webp"
        if os.path.exists(dst) and not args.overwrite:
            print("SKIP  %s (există deja .webp)" % src)
            skip += 1
            continue
        try:
            in_size = os.path.getsize(src)
            out_size = convert(src, dst, args.bg, args.quality, args.lossless, args.max)
            saved_in += in_size
            saved_out += out_size
            pct = (1 - out_size / in_size) * 100 if in_size else 0
            print("OK    %s -> %s  (%.0f KB -> %.0f KB, -%.0f%%)"
                  % (src, dst, in_size / 1024, out_size / 1024, pct))
            ok += 1
            if args.delete:
                os.remove(src)
        except Exception as e:  # noqa: BLE001
            print("EROARE %s: %s" % (src, e), file=sys.stderr)
            err += 1

    print("\n%d convertite, %d sărite, %d erori." % (ok, skip, err))
    if ok:
        pct = (1 - saved_out / saved_in) * 100 if saved_in else 0
        print("Total: %.1f MB -> %.1f MB (economie %.0f%%)."
              % (saved_in / 1048576, saved_out / 1048576, pct))


if __name__ == "__main__":
    main()
