#!/usr/bin/env python3
"""Assemble a contact sheet of captured App Store PNGs."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image, ImageDraw, ImageFont

ORDER = [
    "01_home.png",
    "02_progress_verse.png",
    "03_workout_session.png",
    "03b_rest_verse.png",
    "04_faith.png",
    "04b_faith_completed.png",
    "05_progress_full.png",
    "05b_workout_insights.png",
    "06_intake_goal.png",
    "06_intake_lifting.png",
    "06_intake_faith.png",
    "06_sign_in.png",
    "07_train.png",
    "08_tabbar.png",
]


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def main() -> None:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts")
    cells: list[tuple[str, Image.Image]] = []
    for name in ORDER:
        path = out_dir / name
        if not path.exists():
            continue
        img = Image.open(path).convert("RGB")
        cells.append((name, img))

    if not cells:
        print("no screenshots for contact sheet")
        return

    cols = 4
    rows = (len(cells) + cols - 1) // cols
    thumb_w = 240
    thumb_h = int(thumb_w * cells[0][1].height / cells[0][1].width)
    pad = 18
    label_h = 28
    sheet_w = cols * thumb_w + (cols + 1) * pad
    sheet_h = rows * (thumb_h + label_h) + (rows + 1) * pad + 20
    sheet = Image.new("RGB", (sheet_w, sheet_h), (8, 8, 9))
    draw = ImageDraw.Draw(sheet)
    f = font(14)

    for i, (name, img) in enumerate(cells):
        r, c = divmod(i, cols)
        x = pad + c * (thumb_w + pad)
        y = pad + r * (thumb_h + label_h + pad)
        thumb = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb_h + 6), name.replace(".png", ""), fill=(235, 213, 174), font=f)

    dest = out_dir / "contact_sheet.png"
    sheet.save(dest)
    print("wrote", dest)


if __name__ == "__main__":
    main()
