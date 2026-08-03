#!/usr/bin/env python3
"""
Recolor RepDB flat WebPs into Flight Fitness palette:
  black background · gray mannequin · gold (#FFD700) highlights.

Usage:
  python3 scripts/recolor-repdb-flight.py

Backs up originals to assets/repdb/images/flat-original/ on first run.
"""

from __future__ import annotations

import math
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Need Pillow. Example: python3 -m venv /tmp/ff-img-venv && /tmp/ff-img-venv/bin/pip install pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/repdb/images/flat"
BACKUP = ROOT / "assets/repdb/images/flat-original"

GOLD = (255, 215, 0)
BLACK = (0, 0, 0)
# Flat poster palette — solid steps (no mid gold/gray blends = no mottling)
GRAYS = [
    BLACK,
    (32, 32, 32),
    (64, 64, 64),
    (96, 96, 96),
    (128, 128, 128),
    (160, 160, 160),
    (192, 192, 192),
]


def dist(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a[:3], b[:3])))


def nearest_gray(v: float) -> tuple[int, int, int]:
    return min(GRAYS, key=lambda c: abs(c[0] - v))


def is_background(r: int, g: int, b: int, bg: tuple[int, int, int]) -> bool:
    if dist((r, g, b), bg) < 40 and (r + g + b) / 3 > 175:
        return True
    # light cyan / ice blue fill
    if b > 215 and r > 175 and g > 195 and abs(r - g) < 45:
        return True
    return False


def process(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    corners = [
        im.getpixel((1, 1))[:3],
        im.getpixel((w - 2, 1))[:3],
        im.getpixel((1, h - 2))[:3],
        im.getpixel((w - 2, h - 2))[:3],
    ]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    src = im.load()
    out = Image.new("RGBA", (w, h))
    dst = out.load()

    fig_ys: list[float] = []
    mask: list[list[bool]] = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 10:
                continue
            if is_background(r, g, b, bg):
                continue
            mask[y][x] = True
            fig_ys.append(0.2126 * r + 0.7152 * g + 0.0722 * b)

    if not fig_ys:
        return Image.new("RGBA", (w, h), (*BLACK, 255))

    fig_ys.sort()
    # Only the brightest figure pixels become solid gold (equipment / edge catch lights)
    gold_cut = fig_ys[int(len(fig_ys) * 0.92)]

    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 10:
                dst[x, y] = (0, 0, 0, 0)
                continue
            if not mask[y][x]:
                dst[x, y] = (*BLACK, 255)
                continue

            fy = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if fy >= gold_cut:
                dst[x, y] = (*GOLD, 255)
            else:
                gray = max(28.0, min(200.0, fy * 0.88 + 10))
                dst[x, y] = (*nearest_gray(gray), 255)

    return out


def main() -> None:
    if not SRC.is_dir():
        print(f"Missing {SRC}")
        sys.exit(1)

    files = sorted(SRC.glob("*.webp"))
    if not files:
        print("No webp files found")
        sys.exit(1)

    if not BACKUP.exists():
        print(f"Backing up originals → {BACKUP}")
        shutil.copytree(SRC, BACKUP)
    else:
        print(f"Backup already exists at {BACKUP} (using as source if present)")

    # Prefer recoloring from originals so re-runs stay consistent
    source_dir = BACKUP if BACKUP.exists() else SRC
    source_files = sorted(source_dir.glob("*.webp"))

    print(f"Recoloring {len(source_files)} images…")
    for i, path in enumerate(source_files, 1):
        out = process(Image.open(path))
        dest = SRC / path.name
        out.save(dest, "WEBP", quality=92, method=6)
        if i % 50 == 0 or i == len(source_files):
            print(f"  {i}/{len(source_files)}")

    print("Done. Restart Expo / Metro to pick up asset changes.")


if __name__ == "__main__":
    main()
