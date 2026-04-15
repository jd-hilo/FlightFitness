#!/usr/bin/env python3
"""Replace edge-connected light/white pixels with black so app icons are full-bleed."""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def flood_edge_to_dark(path: str, lum_threshold: float = 48.0) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    filled = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or filled[y][x]:
            continue
        r, g, b, a = px[x, y]
        if luminance(r, g, b) <= lum_threshold:
            continue
        filled[y][x] = True
        px[x, y] = (0, 0, 0, 255)
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            q.append((x + dx, y + dy))

    img.save(path, format="PNG")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    for rel in (
        "assets/images/icon.png",
        "assets/images/adaptive-icon.png",
        "assets/images/splash-icon.png",
        "assets/images/favicon.png",
    ):
        path = str(root / rel)
        try:
            flood_edge_to_dark(path)
            print(f"OK {rel}", file=sys.stderr)
        except OSError as e:
            print(f"skip {rel}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
