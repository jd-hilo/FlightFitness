from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path("screenshots/app-store/production")
W, H = 1290, 2796
BLACK = (0, 0, 0)
GOLD = (255, 215, 0)
GOLD_DIM = (214, 174, 0)
WHITE = (242, 242, 232)
MUTED = (198, 201, 171)
SURFACE = (18, 18, 18)
SURFACE_2 = (28, 28, 28)


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            pass
    return ImageFont.load_default()


F_HEAD = font(122, True)
F_HEAD_BIG = font(148, True)
F_SUB = font(42, True)
F_BODY = font(34)
F_BODY_B = font(36, True)
F_SMALL = font(26, True)
F_TINY = font(22, True)


if not hasattr(ImageDraw.ImageDraw, "rounded_rectangle"):
    def _rounded_rectangle(self, xy, radius=0, fill=None, outline=None, width=1):
        x1, y1, x2, y2 = [int(v) for v in xy]
        r = int(max(0, min(radius, (x2 - x1) // 2, (y2 - y1) // 2)))
        if fill is not None:
            self.rectangle((x1 + r, y1, x2 - r, y2), fill=fill)
            self.rectangle((x1, y1 + r, x2, y2 - r), fill=fill)
            self.pieslice((x1, y1, x1 + 2 * r, y1 + 2 * r), 180, 270, fill=fill)
            self.pieslice((x2 - 2 * r, y1, x2, y1 + 2 * r), 270, 360, fill=fill)
            self.pieslice((x2 - 2 * r, y2 - 2 * r, x2, y2), 0, 90, fill=fill)
            self.pieslice((x1, y2 - 2 * r, x1 + 2 * r, y2), 90, 180, fill=fill)
        if outline is not None:
            for i in range(width):
                self.arc((x1 + i, y1 + i, x1 + 2 * r - i, y1 + 2 * r - i), 180, 270, fill=outline)
                self.arc((x2 - 2 * r + i, y1 + i, x2 - i, y1 + 2 * r - i), 270, 360, fill=outline)
                self.arc((x2 - 2 * r + i, y2 - 2 * r + i, x2 - i, y2 - i), 0, 90, fill=outline)
                self.arc((x1 + i, y2 - 2 * r + i, x1 + 2 * r - i, y2 - i), 90, 180, fill=outline)
                self.line((x1 + r, y1 + i, x2 - r, y1 + i), fill=outline)
                self.line((x1 + r, y2 - i, x2 - r, y2 - i), fill=outline)
                self.line((x1 + i, y1 + r, x1 + i, y2 - r), fill=outline)
                self.line((x2 - i, y1 + r, x2 - i, y2 - r), fill=outline)

    ImageDraw.ImageDraw.rounded_rectangle = _rounded_rectangle


def gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BLACK)
    px = img.load()
    for y in range(H):
        for x in range(W):
            dx = (x - W * 0.7) / W
            dy = (y - H * 0.18) / H
            glow = max(0, 1 - math.sqrt(dx * dx + dy * dy) * 2.0)
            gold = int(56 * glow)
            px[x, y] = (min(18, gold // 4), min(18, gold // 5), 0)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for i in range(16):
        alpha = max(8, 60 - i * 3)
        d.ellipse((W - 620 - i * 28, -160 - i * 18, W + 210 + i * 32, 620 + i * 22), outline=(255, 215, 0, alpha), width=3)
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def text_metrics(draw: ImageDraw.ImageDraw, text: str, fnt) -> tuple[int, int]:
    if hasattr(draw, "textbbox"):
        bbox = draw.textbbox((0, 0), text, font=fnt)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]
    return draw.textsize(text, font=fnt)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill=WHITE, spacing=8) -> int:
    lines = text.split("\n")
    for line in lines:
        width, height = text_metrics(draw, line, fnt)
        x = (W - width) // 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += height + spacing
    return y


def rounded(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def badge(draw, xy, text: str):
    x, y = xy
    box = (x, y, x + 420, y + 126)
    rounded(draw, box, 63, (20, 20, 12), GOLD, 3)
    draw.ellipse((x + 26, y + 28, x + 72, y + 74), fill=GOLD)
    draw.text((x + 88, y + 25), textwrap.fill(text, 18), font=F_SMALL, fill=WHITE, spacing=0)
    draw.text((x + 42, y + 38), "✚", font=font(24, True), fill=BLACK)


def dumbbell_layer() -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cy = H - 340
    for off, scale, alpha in [(-250, 1.05, 190), (170, 0.9, 150)]:
        cx = W // 2 + off
        bar_w = int(530 * scale)
        bar_h = int(44 * scale)
        d.rounded_rectangle((cx - bar_w // 2, cy - bar_h // 2, cx + bar_w // 2, cy + bar_h // 2), 22, fill=(180, 180, 170, alpha))
        for side in [-1, 1]:
            bx = cx + side * int(bar_w * 0.42)
            for i in range(3):
                w = int((64 + i * 25) * scale)
                h = int((205 + i * 22) * scale)
                d.rounded_rectangle((bx + side * i * 38 - w // 2, cy - h // 2, bx + side * i * 38 + w // 2, cy + h // 2), 26, fill=(45 + i * 18, 45 + i * 18, 43 + i * 15, alpha), outline=(255, 215, 0, 60), width=2)
    return layer.filter(ImageFilter.GaussianBlur(0.15))


def phone_shell(x: int, y: int, w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw, tuple[int, int, int, int]]:
    phone = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(phone)
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((18, 30, w - 18, h - 8), 76, fill=(0, 0, 0, 140))
    phone = Image.alpha_composite(phone, shadow.filter(ImageFilter.GaussianBlur(28)))
    d = ImageDraw.Draw(phone)
    d.rounded_rectangle((32, 10, w - 32, h - 28), 76, fill=(8, 8, 8), outline=(82, 82, 75), width=5)
    screen = (58, 50, w - 58, h - 62)
    d.rounded_rectangle(screen, 48, fill=BLACK)
    island_w = int(w * 0.27)
    d.rounded_rectangle(((w - island_w) // 2, 72, (w + island_w) // 2, 106), 18, fill=(3, 3, 3))
    return phone, d, screen


def paste_phone(canvas: Image.Image, page: str, y_offset: int = 790):
    pw, ph = 700, 1515
    phone, d, s = phone_shell(0, 0, pw, ph)
    sx1, sy1, sx2, sy2 = s
    draw_app_screen(d, (sx1, sy1, sx2, sy2), page)
    x = (W - pw) // 2
    canvas.alpha_composite(phone, (x, y_offset))


def app_header(d, screen, title: str):
    x1, y1, x2, _ = screen
    d.text((x1 + 42, y1 + 78), "FLIGHT", font=font(28, True), fill=GOLD)
    d.text((x1 + 42, y1 + 132), title.upper(), font=font(44, True), fill=WHITE)
    d.rounded_rectangle((x2 - 190, y1 + 82, x2 - 42, y1 + 128), 23, fill=(43, 35, 0), outline=GOLD, width=2)
    d.text((x2 - 165, y1 + 93), "UPGRADE", font=font(18, True), fill=GOLD)


def card(d, box, title: str, lines: list[str], accent=GOLD):
    rounded(d, box, 26, SURFACE, (255, 255, 255, 24), 2)
    x1, y1, x2, _ = box
    d.rectangle((x1, y1, x1 + 8, box[3]), fill=accent)
    d.text((x1 + 28, y1 + 24), title.upper(), font=font(26, True), fill=WHITE)
    y = y1 + 68
    for line in lines:
        d.text((x1 + 28, y), line, font=font(23), fill=MUTED)
        y += 36


def draw_app_screen(d, screen, page: str):
    x1, y1, x2, y2 = screen
    d.rounded_rectangle(screen, 48, fill=BLACK)
    if page == "home":
        app_header(d, screen, "Home")
        card(d, (x1 + 42, y1 + 220, x2 - 42, y1 + 405), "Morning Push", ["Strength focus · 45 min", "Incline bench · Shoulder press"])
        card(d, (x1 + 42, y1 + 430, x2 - 42, y1 + 630), "Today's Fuel", ["2,200 kcal target", "185g protein · 200g carbs"])
        card(d, (x1 + 42, y1 + 660, x2 - 42, y1 + 850), "Daily Word", ["Trust in Yahweh", "Proverbs 3:5"])
        d.rounded_rectangle((x1 + 42, y2 - 135, x2 - 42, y2 - 72), 31, fill=(33, 27, 0), outline=GOLD, width=2)
        d.text((x1 + 180, y2 - 117), "7 DAY STREAK", font=font(24, True), fill=GOLD)
    elif page == "train":
        app_header(d, screen, "Train")
        for i, (name, reps) in enumerate([("Incline Bench Press", "4 x 8-10"), ("DB Shoulder Press", "3 x 10"), ("Triceps Pressdown", "3 x 12"), ("Lateral Raise", "3 x 15")]):
            y = y1 + 225 + i * 145
            rounded(d, (x1 + 42, y, x2 - 42, y + 116), 24, SURFACE, (255, 255, 255, 20), 2)
            d.ellipse((x1 + 70, y + 36, x1 + 116, y + 82), fill=GOLD)
            d.text((x1 + 145, y + 25), name.upper(), font=font(24, True), fill=WHITE)
            d.text((x1 + 145, y + 64), f"{reps} · 120 sec rest", font=font(23), fill=MUTED)
    elif page == "fuel":
        app_header(d, screen, "Fuel")
        rounded(d, (x1 + 42, y1 + 220, x2 - 42, y1 + 470), 28, SURFACE, (255, 255, 255, 25), 2)
        d.text((x1 + 76, y1 + 255), "MACRO TARGETS", font=font(26, True), fill=WHITE)
        for i, (label, val, color) in enumerate([("CAL", "1500 / 2200", GOLD), ("PRO", "140 / 185g", (255, 165, 0)), ("CARB", "110 / 200g", (230, 230, 190))]):
            yy = y1 + 315 + i * 45
            d.text((x1 + 76, yy), label, font=font(20, True), fill=color)
            d.rounded_rectangle((x1 + 172, yy + 5, x2 - 78, yy + 25), 10, fill=(50, 50, 50))
            d.rounded_rectangle((x1 + 172, yy + 5, x1 + 172 + int((x2 - x1 - 250) * (0.55 + i * 0.1)), yy + 25), 10, fill=color)
            d.text((x2 - 220, yy - 3), val, font=font(18, True), fill=WHITE)
        for i, meal in enumerate(["Protein Oats", "Chicken Rice Bowl", "Greek Yogurt Bowl"]):
            y = y1 + 510 + i * 140
            card(d, (x1 + 42, y, x2 - 42, y + 108), meal, ["Balanced macros · tap to edit"])
    elif page == "faith":
        app_header(d, screen, "Faith")
        rounded(d, (x1 + 42, y1 + 220, x2 - 42, y1 + 545), 30, (18, 15, 4), GOLD, 2)
        d.text((x1 + 74, y1 + 260), "PROVERBS 3:5", font=font(24, True), fill=GOLD)
        d.multiline_text((x1 + 74, y1 + 315), "Trust in Yahweh\nwith all your heart,\nand don't lean on your\nown understanding.", font=font(34, True), fill=WHITE, spacing=10)
        for i, item in enumerate(["Read verse", "Study context", "Journal reflection"]):
            y = y1 + 595 + i * 116
            rounded(d, (x1 + 42, y, x2 - 42, y + 82), 22, SURFACE, (255, 255, 255, 18), 2)
            d.ellipse((x1 + 72, y + 22, x1 + 110, y + 60), fill=GOLD)
            d.text((x1 + 145, y + 23), item.upper(), font=font(24, True), fill=WHITE)
    elif page == "grocery":
        app_header(d, screen, "Grocery")
        for i, (name, qty, cat) in enumerate([("Chicken breast", "2 lb", "PROTEIN"), ("Greek yogurt", "32 oz", "DAIRY"), ("Oats", "1 tub", "CARBS"), ("Spinach", "2 bags", "PRODUCE"), ("Blueberries", "1 pint", "PRODUCE"), ("Rice", "2 cups", "CARBS")]):
            y = y1 + 220 + i * 110
            d.line((x1 + 42, y + 92, x2 - 42, y + 92), fill=(255, 255, 255, 24), width=2)
            d.text((x1 + 54, y), name.upper(), font=font(25, True), fill=WHITE)
            d.text((x1 + 54, y + 38), qty, font=font(22), fill=MUTED)
            d.text((x2 - 190, y + 18), cat, font=font(17, True), fill=GOLD)
    elif page == "coach":
        app_header(d, screen, "Coaching")
        rounded(d, (x1 + 42, y1 + 220, x2 - 42, y1 + 450), 30, (22, 18, 2), GOLD, 2)
        d.text((x1 + 72, y1 + 260), "CUSTOM COACHING", font=font(29, True), fill=GOLD)
        d.multiline_text((x1 + 72, y1 + 315), "A real coach builds your\nmeals and training around\nyour life and faith.", font=font(28, True), fill=WHITE, spacing=8)
        for i, item in enumerate(["Faith-forward programming", "Coach reflections", "Message for support"]):
            y = y1 + 500 + i * 125
            card(d, (x1 + 42, y, x2 - 42, y + 96), item, ["Built for accountability"])


def screen_file(name: str, verb: str, desc: str, page: str | None = None, sub: str | None = None):
    img = gradient_bg()
    d = ImageDraw.Draw(img)
    draw_centered(d, verb, 124, F_HEAD_BIG, GOLD)
    draw_centered(d, desc, 285, F_HEAD, WHITE)
    if sub:
        draw_centered(d, sub, 505, F_BODY_B, MUTED)
    if page:
        paste_phone(img, page, 760)
    return img


def hero():
    img = gradient_bg()
    d = ImageDraw.Draw(img)
    badge(d, (W // 2 - 210, 180), "FAITH-FIRST FITNESS")
    draw_centered(d, "WHERE FAITH\nMEETS FITNESS", 380, F_HEAD_BIG, WHITE, spacing=18)
    draw_centered(d, "Train your body. Feed your spirit.", 760, F_SUB, GOLD)
    img.alpha_composite(dumbbell_layer())
    draw_centered(d, "FLIGHT FITNESS", H - 210, font(48, True), WHITE)
    return img


def save_all():
    OUT.mkdir(parents=True, exist_ok=True)
    files = [
        ("01-where-faith-meets-fitness.png", hero()),
        ("02-build-your-week.png", screen_file("home", "BUILD", "YOUR WEEK", "home", "Meals, workouts, and Scripture in one plan.")),
        ("03-train-with-purpose.png", screen_file("train", "TRAIN", "WITH PURPOSE", "train", "Sets, reps, and rest structured for you.")),
        ("04-fuel-your-goals.png", screen_file("fuel", "FUEL", "YOUR GOALS", "fuel", "Macros and meals without the math.")),
        ("05-stay-rooted.png", screen_file("faith", "STAY", "ROOTED", "faith", "Daily Bible study built into your routine.")),
        ("06-shop-your-plan.png", screen_file("grocery", "SHOP", "YOUR PLAN", "grocery", "Your grocery list generated from your meals.")),
        ("07-upgrade-to-coaching.png", screen_file("coach", "UPGRADE", "TO COACHING", "coach", "Faith-forward support from a real coach.")),
    ]
    for filename, image in files:
        image.convert("RGB").save(OUT / filename, quality=96)
    (OUT / "README.md").write_text(
        "# Flight Fitness App Store Screenshots\n\n"
        "Generated production screenshot drafts at 1290x2796 for the iPhone 6.7-inch App Store slot.\n\n"
        "Files:\n"
        + "\n".join(f"- `{name}`" for name, _ in files)
        + "\n\nNote: The hero badge avoids unsupported ranking claims. If you have substantiation, replace the badge copy with `#1 CHRISTIAN FITNESS APP`.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    save_all()
    print(f"Wrote screenshots to {OUT}")
