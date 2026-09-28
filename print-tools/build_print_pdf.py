#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_print_pdf.py
===================

"Зөвхөн Түүнд Kids Book" захиалгын хэвлэхэд бэлэн PDF-ийг автоматаар
угсарна — Photoshop дээр хуудас бүрийг гараар зэрэгцүүлж байсныг орлоно.

ХЭРХЭН АЖИЛЛУУЛАХ
------------------
1. Admin панелаас захиалгынхаа "⬇ Бүх зургийг татах (ZIP)" товчийг дарж
   ZIP-ийг татаж аваад, нэг фолдер руу задлана (01.jpg, 02.jpg, ...,
   pattern.jpg, backpage.jpg, background.jpg, book.json орно).
2. Python 3 болон Pillow суулгасан байх (нэг удаа):
       pip install pillow --break-system-packages
3. Скриптийг ажиллуулна:
       python3 build_print_pdf.py /path/to/задалсан/фолдер

   Гаралт: тэр л фолдер дотор "print-ready.pdf" үүснэ — 10 хуудастай,
   duplex (хоёр талт) хэвлэхэд шууд бэлэн, урдаас нь буцаагаад стапль/
   гар оёдол хийж чадах дараалалтайгаар.

ЯГ ЮУГ АВТОМАТААР ХИЙДЭГ
-------------------------
tanhil2.psd загвар файлаас гаргаж авсан яг тэр байрлал/хэмжээгээр:
  - Хуудас 1-9: ЗҮҮН тал = дэвсгэр зураг (background.jpg) дээр тухайн
    хуудасны каптион текст, БАРУУН тал = тухайн хуудасны зураг.
  - Хуудас 10: нэг тал дотор зураг + текст хамт (төгсгөлийн хуудас).
  - Нүүр хуудас: 1-р хуудасны зураг дээр зориулалтын бичвэр (book.json-
    ий coverDedication) давхарлагдана.
  - Бүгд admin.html-ийн "🖨 Хэвлэлийн зохион байгуулалт (10 хуудас)"
    хэсэгт бичигдсэн яг тэр 5 хуудас (sheet) / 10 талын (front/back)
    дарааллаар угсарна.

АНХААРАХ ЗҮЙЛ
--------------
- Каптион/гарчгийн ФОНТ энд системийн Cyrillic фонт (DejaVu Sans)-оор
  орлуулагдсан болохоос, tanhil2.psd-д ашигласан жинхэнэ брэндийн
  фонт биш. Хэрэв өөрийн .ttf фонт файлтай бол доорх FONT_REGULAR /
  FONT_BOLD хувьсагчид замыг нь зааж өгвөл яг тэр фонтоор гарна.
- Текстний өнгө, байрлал ойролцоогоор тохируулсан — эхний хэдэн
  захиалга дээр гарсан үр дүнг харж, доорх тогтмолуудыг (координат,
  фонтын хэмжээ) өөрт тохируулан жижигхэн засаж болно.
"""

import json
import os
import sys
import textwrap
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Тохиргоо — tanhil2.psd-ээс хэмжсэн утгууд (px, 300dpi, canvas 4961x3508)
# ---------------------------------------------------------------------------

CANVAS_SIZE = (4961, 3508)
DPI = 300

# Зүүн тал (дэвсгэр+текст / 10-р хуудасны зураг) байрлах дөрвөлжин муж
LEFT_PANEL = (296, 691, 2484, 2879)
# Баруун тал (зураг / нүүр) байрлах дөрвөлжин муж
RIGHT_PANEL = (2483, 691, 4669, 2877)
# 10-р хуудасны онцгой байрлал (зураг нь зүүн талын байрлалтай төстэй)
PAGE10_IMAGE_RECT = (302, 691, 2478, 2867)
PAGE10_TEXT_CENTER_Y = 1060
PAGE10_TEXT_MAX_WIDTH = 1900

CAPTION_CENTER_Y = 1751  # 1-9-р хуудсуудын каптионы дундаж босоо төв
CAPTION_MAX_WIDTH = 1850  # энэ өргөнд багтаахаар мөр таслана
CAPTION_MAX_HEIGHT = 620  # текстийн блок дээд тал нь энэ өндрөөс хэтрэхгүй
CAPTION_MAX_FONT_SIZE = 60  # pt — эндээс эхэлж, багтахгүй бол автоматаар багасна
CAPTION_MIN_FONT_SIZE = 24
CAPTION_COLOR = (46, 34, 71)  # var(--plum)-той ойролцоо — брэндийн бор ягаан

DEDICATION_MAX_WIDTH = 1450
DEDICATION_MAX_HEIGHT = 500
DEDICATION_MAX_FONT_SIZE = 46
DEDICATION_MIN_FONT_SIZE = 20
DEDICATION_COLOR = (46, 34, 71)

# Брэндийн жинхэнэ фонт. Эрэлтгүй бол доорх FONT_FALLBACK систем ашиглана.
FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
FONT_REGULAR = os.path.join(FONT_DIR, "IsamiRiDisplayRegular.ttf")
FONT_BOLD = os.path.join(FONT_DIR, "IsamiRiDisplayRegular.ttf")  # тусдаа Bold файлгүй тул ижилээр ашиглана
FONT_FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Каптион/зориулалтын текстийн эргэн тойронд зурах цагаан stroke-ийн зузаан
# (px, фонтын хэмжээтэй харьцангуй тооцоологдоно — доорх STROKE_WIDTH_RATIO)
TEXT_STROKE_COLOR = (255, 255, 255)
STROKE_WIDTH_RATIO = 0.06  # фонтын хэмжээний ~6%

# admin.html-ийн "🖨 Хэвлэлийн зохион байгуулалт" хэсэгт бичигдсэн яг тэр
# 5 хуудас (sheet) / урд-ар талын дараалал. Зүүн/баруун гэдэг нь тэдгээр
# label доторх "|"-ийн өмнө/дараах хэсэгтэй тохирно.
SHEET_LAYOUT = [
    # (sheet_id, front=(left,right), back=(left,right))
    ("s1-1", ("text_6", "cover"), ("text_1", "image_5")),
    ("s1-2", ("text_5", "image_1"), ("text_2", "image_4")),
    ("s1-3", ("text_4", "image_2"), ("text_3", "image_3")),
    ("s2-1", ("combined_10", "image_6"), ("text_7", "image_9")),
    ("s2-2", ("text_9", "image_7"), ("text_8", "image_8")),
]


def load_font(path, size_pt):
    size_px = round(size_pt * DPI / 72)
    try:
        return ImageFont.truetype(path, size_px)
    except OSError:
        return ImageFont.truetype(FONT_FALLBACK, size_px)


def cover_fit(img, box):
    """img-ийг box (x0,y0,x1,y1) дотор бүрэн дүүргэж, төвөөс тайрч crop хийнэ
    (CSS-ийн object-fit: cover-той адил)."""
    x0, y0, x1, y1 = box
    target_w, target_h = x1 - x0, y1 - y0
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w, new_h = round(src_w * scale), round(src_h * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def wrap_text(draw, text, font, max_width, stroke_width=0):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = (current + " " + word).strip()
        if draw.textlength(trial, font=font) + 2 * stroke_width <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_centered_text(
    canvas, text, font_path, color, center_x, center_y, max_width, max_height,
    max_font_size, min_font_size, line_spacing=1.3,
    stroke_color=TEXT_STROKE_COLOR, stroke_width_ratio=STROKE_WIDTH_RATIO,
):
    """Текстийг төвд нь, цагаан stroke-той зурна — өгөгдсөн max_width/
    max_height-д багтахгүй бол фонтын хэмжээг автоматаар min_font_size
    хүртэл багасгана (ингэснээр ямар ч урттай каптион давхарлагдах/гарч
    тавигдахгүй)."""
    if not text:
        return
    draw = ImageDraw.Draw(canvas)

    font_size = max_font_size
    lines, font, line_height, total_height, stroke_width = [], None, 0, 0, 0
    while font_size >= min_font_size:
        font = load_font(font_path, font_size)
        stroke_width = max(1, round(font_size * DPI / 72 * stroke_width_ratio))
        lines = wrap_text(draw, text, font, max_width, stroke_width)
        line_heights = [
            draw.textbbox((0, 0), ln, font=font, stroke_width=stroke_width)[3]
            - draw.textbbox((0, 0), ln, font=font, stroke_width=stroke_width)[1]
            for ln in lines
        ]
        line_height = max(line_heights) if line_heights else font_size
        total_height = int(line_height * line_spacing * len(lines))
        widest = max((draw.textlength(ln, font=font) + 2 * stroke_width for ln in lines), default=0)
        if widest <= max_width and total_height <= max_height:
            break
        font_size -= 2
    else:
        font_size = min_font_size
        font = load_font(font_path, font_size)
        stroke_width = max(1, round(font_size * DPI / 72 * stroke_width_ratio))
        lines = wrap_text(draw, text, font, max_width, stroke_width)

    y = center_y - total_height // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
        w = bbox[2] - bbox[0]
        x = center_x - w // 2
        draw.text((x, y), line, font=font, fill=color, stroke_width=stroke_width, stroke_fill=stroke_color)
        y += int(line_height * line_spacing)


def build_panels(folder, meta):
    """Хуудас бүрийн зураг/каптионыг ашиглан 20 "half-panel" зургийг
    урьдчилан угсарна (текст-панель, зураг-панель, 10-р хуудас, нүүр)."""
    panels = {}

    def open_page(n):
        for ext in ("jpg", "jpeg", "png"):
            p = os.path.join(folder, f"{n:02d}.{ext}")
            if os.path.exists(p):
                return Image.open(p).convert("RGB")
        raise FileNotFoundError(f"{n:02d}.jpg/png олдсонгүй — эхлээд ZIP-ээ бүрэн татсан эсэхээ шалгана уу.")

    def open_optional(name):
        for ext in ("jpg", "jpeg", "png"):
            p = os.path.join(folder, f"{name}.{ext}")
            if os.path.exists(p):
                return Image.open(p).convert("RGB")
        return None

    captions = {p["pageNumber"]: p.get("caption", "") for p in meta.get("pages", [])}
    background_img = open_optional("background")

    # --- 1-9-р хуудсуудын текст-панель (зүүн тал) ---
    for n in range(1, 10):
        canvas = Image.new("RGB", (LEFT_PANEL[2] - LEFT_PANEL[0], LEFT_PANEL[3] - LEFT_PANEL[1]), "white")
        if background_img:
            fitted = cover_fit(background_img, (0, 0, canvas.width, canvas.height))
            canvas.paste(fitted, (0, 0))
        draw_centered_text(
            canvas, captions.get(n, ""), FONT_REGULAR, CAPTION_COLOR,
            canvas.width // 2, CAPTION_CENTER_Y - LEFT_PANEL[1], CAPTION_MAX_WIDTH, CAPTION_MAX_HEIGHT,
            CAPTION_MAX_FONT_SIZE, CAPTION_MIN_FONT_SIZE,
        )
        panels[f"text_{n}"] = canvas

    # --- 1-9-р хуудсуудын зураг-панель (баруун тал) ---
    for n in range(1, 10):
        img = open_page(n)
        panels[f"image_{n}"] = cover_fit(img, (0, 0, RIGHT_PANEL[2] - RIGHT_PANEL[0], RIGHT_PANEL[3] - RIGHT_PANEL[1]))

    # --- 10-р хуудас: зураг + текст нэг талд хамт ---
    img10 = open_page(10)
    w10, h10 = PAGE10_IMAGE_RECT[2] - PAGE10_IMAGE_RECT[0], PAGE10_IMAGE_RECT[3] - PAGE10_IMAGE_RECT[1]
    canvas10 = Image.new("RGB", (LEFT_PANEL[2] - LEFT_PANEL[0], LEFT_PANEL[3] - LEFT_PANEL[1]), "white")
    fitted10 = cover_fit(img10, (0, 0, w10, h10))
    canvas10.paste(fitted10, (PAGE10_IMAGE_RECT[0] - LEFT_PANEL[0], PAGE10_IMAGE_RECT[1] - LEFT_PANEL[1]))
    draw_centered_text(
        canvas10, captions.get(10, ""), FONT_REGULAR, CAPTION_COLOR,
        canvas10.width // 2, PAGE10_TEXT_CENTER_Y - LEFT_PANEL[1], PAGE10_TEXT_MAX_WIDTH, CAPTION_MAX_HEIGHT,
        CAPTION_MAX_FONT_SIZE, CAPTION_MIN_FONT_SIZE,
    )
    panels["combined_10"] = canvas10

    # --- Нүүр хуудас: 1-р хуудасны зураг дээр зориулалтын бичвэр ---
    page1_img = open_page(1)
    cover_canvas = cover_fit(page1_img, (0, 0, RIGHT_PANEL[2] - RIGHT_PANEL[0], RIGHT_PANEL[3] - RIGHT_PANEL[1]))
    dedication = meta.get("coverDedication", "")
    if dedication:
        draw_centered_text(
            cover_canvas, dedication, FONT_BOLD, DEDICATION_COLOR,
            cover_canvas.width // 2, int(cover_canvas.height * 0.62), DEDICATION_MAX_WIDTH, DEDICATION_MAX_HEIGHT,
            DEDICATION_MAX_FONT_SIZE, DEDICATION_MIN_FONT_SIZE,
        )
    panels["cover"] = cover_canvas

    return panels


def compose_side(panels, left_key, right_key):
    canvas = Image.new("RGB", CANVAS_SIZE, "white")
    left_panel = panels[left_key]
    right_panel = panels[right_key]

    if left_key == "combined_10":
        canvas.paste(left_panel, (LEFT_PANEL[0], LEFT_PANEL[1]))
    else:
        canvas.paste(left_panel, (LEFT_PANEL[0], LEFT_PANEL[1]))

    canvas.paste(right_panel, (RIGHT_PANEL[0], RIGHT_PANEL[1]))
    return canvas


def main():
    if len(sys.argv) < 2:
        print("Ашиглах заавар: python3 build_print_pdf.py /path/to/задалсан/ZIP/фолдер")
        sys.exit(1)

    folder = sys.argv[1]
    meta_path = os.path.join(folder, "book.json")
    if not os.path.exists(meta_path):
        print(f"АЛДАА: {meta_path} олдсонгүй. admin.html-ийн шинэчилсэн хувилбараар дахин ZIP татна уу.")
        sys.exit(1)

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    print(f"'{meta.get('childName', '?')}'-ийн ном угсарч байна…")
    panels = build_panels(folder, meta)

    pages = []
    for sheet_id, front, back in SHEET_LAYOUT:
        print(f"  {sheet_id}: урд тал ({front[0]} | {front[1]}), ар тал ({back[0]} | {back[1]})")
        pages.append(compose_side(panels, *front))
        pages.append(compose_side(panels, *back))

    out_path = os.path.join(folder, "print-ready.pdf")
    pages[0].save(
        out_path,
        save_all=True,
        append_images=pages[1:],
        resolution=DPI,
    )
    print(f"\n✓ Бэлэн: {out_path}")
    print("  (10 хуудас, урд/ар талаараа дараалсан — duplex хэвлэгчинд шууд илгээж болно)")


if __name__ == "__main__":
    main()
