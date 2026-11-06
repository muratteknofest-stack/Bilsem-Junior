#!/usr/bin/env python3
"""Render original Bilsem Junior 9:16 quiz reels.
Features rich 3D isometric spatial reasoning questions with vivid, high-contrast colors,
responsive timer countdown, and celebratory answer reveals.
Requires Pillow and ffmpeg.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import subprocess
import tempfile
import wave
from array import array
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
NAVY = (13, 23, 64)
WHITE = (247, 249, 255)
GOLD = (255, 208, 64)
AMBER = (255, 170, 0)
CYAN_TOP = (0, 235, 255)
CYAN_LEFT = (0, 180, 225)
CYAN_RIGHT = (0, 125, 175)
GOLD_TOP = (255, 220, 20)
GOLD_LEFT = (245, 170, 0)
GOLD_RIGHT = (210, 125, 0)
CUBE_BORDER = (10, 20, 48)
BLUE = (91, 117, 249)
PINK = (249, 104, 180)
GREEN = (40, 215, 145)
GREEN_DARK = (18, 140, 90)
LETTERS = 'ABCD'
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')


def font(size: int, bold: bool = True):
    filename = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    candidates = [FONT_DIR / filename, Path('/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf')]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    raise RuntimeError('Install fonts-dejavu-core for Turkish typography')


def rounded(draw, xy, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(tuple(map(int, xy)), radius=radius, fill=fill, outline=outline, width=width)


def centered(draw, text, cx, y, size=40, color=WHITE, bold=True):
    f = font(size, bold)
    box = draw.textbbox((0, 0), text, font=f)
    draw.text((cx - (box[2] - box[0]) / 2, y), text, font=f, fill=color)


def gradient():
    im = Image.new('RGB', (W, H), NAVY)
    draw = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)], fill=(int(14 + 18 * t), int(22 + 8 * t), int(68 + 42 * t)))
    for x, y, r, color in [(980, 260, 270, (86, 50, 175)),
                           (90, 1180, 260, (50, 75, 185)),
                           (990, 1620, 290, (20, 130, 160))]:
        glow = Image.new('RGBA', (W, H))
        gd = ImageDraw.Draw(glow)
        gd.ellipse((x-r, y-r, x+r, y+r), fill=(*color, 85))
        glow = glow.filter(ImageFilter.GaussianBlur(95))
        im = Image.alpha_composite(im.convert('RGBA'), glow).convert('RGB')
    return im


def glyph(shape, size, color, filled, rotation):
    n = 150
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    fill = (*color, 255) if filled else (15, 30, 74, 255)
    stroke = (*color, 255)
    if shape == 'arrow':
        points = [(75, 13), (132, 76), (101, 76), (101, 137),
                  (49, 137), (49, 76), (18, 76)]
        d.polygon(points, fill=fill)
        d.line(points + [points[0]], fill=stroke, width=10, joint='curve')
    elif shape == 'flag':
        d.line([(34, 20), (34, 135)], fill=stroke, width=12)
        d.polygon([(42, 20), (121, 35), (91, 73), (42, 68)], fill=fill)
        d.line([(42, 20), (121, 35), (91, 73), (42, 68), (42, 20)],
               fill=stroke, width=9, joint='curve')
    elif shape == 'key':
        d.ellipse((16, 20, 89, 92), fill=fill, outline=stroke, width=10)
        d.line([(81, 80), (133, 132)], fill=stroke, width=14)
        d.line([(104, 106), (92, 120)], fill=stroke, width=10)
        d.line([(115, 117), (104, 132)], fill=stroke, width=10)
    else:
        d.ellipse((24, 11, 126, 125), fill=fill, outline=stroke, width=10)
        d.line([(19, 138), (95, 45)], fill=stroke, width=9)
    im = im.rotate(-90 * rotation, expand=False, resample=Image.Resampling.BICUBIC)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def draw_cube_view(draw, bounds, width, height, cells, active_color=CYAN_TOP, empty_color=(220, 228, 248)):
    x0, y0, x1, y1 = bounds
    box_w, box_h = x1 - x0, y1 - y0
    cell_size = min(int((box_w - 10) / width), int((box_h - 10) / height))
    total_w = width * cell_size
    total_h = height * cell_size
    start_x = x0 + (box_w - total_w) // 2
    start_y = y0 + (box_h - total_h) // 2
    for r in range(height):
        for c in range(width):
            idx = r * width + c
            is_filled = bool(cells[idx]) if idx < len(cells) else False
            cx0 = start_x + c * cell_size
            cy0 = start_y + r * cell_size
            fill = active_color if is_filled else empty_color
            border = CUBE_BORDER if is_filled else (190, 205, 235)
            draw.rectangle([cx0+1, cy0+1, cx0+cell_size-1, cy0+cell_size-1], fill=fill, outline=border, width=2)


def card_content(base, bounds, value, blank=False):
    x0, y0, x1, y1 = map(int, bounds)
    d = ImageDraw.Draw(base)
    if blank or value is None:
        centered(d, '?', (x0 + x1) // 2, y0 + (y1 - y0) // 2 - 45, 90, (89, 92, 225))
        return

    # 1. Text number option (e.g. 3D cube counts like 9, 10, 11)
    if isinstance(value, dict) and 'textNumber' in value:
        num_str = str(value['textNumber'])
        centered(d, num_str, (x0 + x1) // 2, y0 + (y1 - y0) // 2 - 38, 62, (18, 30, 80), bold=True)
        return

    # 2. 2D grid/cubeView option (e.g. front-view / top-view silhouettes)
    if isinstance(value, dict) and value.get('cubeView') is True:
        draw_cube_view(d, (x0 + 8, y0 + 6, x1 - 8, y1 - 6),
                       value.get('width', 3), value.get('height', 3), value.get('cells', []))
        return

    # 3. Perceptual 2D shape option (legacy glyphs)
    if isinstance(value, dict) and 'shape' in value:
        color = [BLUE, PINK, (48, 166, 190), (150, 96, 244)][
            {'arrow': 0, 'flag': 1, 'key': 2, 'leaf': 3}.get(value['shape'], 0)
        ]
        count = int(value.get('count', 1))
        width, height = x1 - x0, y1 - y0
        columns = count if count <= 3 else 2 if count <= 4 else 3
        rows = math.ceil(count / columns)
        tile = max(22, min(75, int((width - 34) / columns), int((height - 22) / rows)))
        gap = 0 if columns == 1 else min(7, max(0, (width - columns * tile - 30) // (columns - 1)))
        stepy = tile + min(6, max(0, (height - rows * tile - 20) // max(1, rows - 1)))
        total_width = columns * tile + (columns - 1) * gap
        startx = x0 + (width - total_width) // 2
        starty = y0 + (height - (rows - 1) * stepy - tile) // 2
        symbol = glyph(value['shape'], tile, color, bool(value.get('filled')), int(value.get('rotation', 0)))
        for k in range(count):
            px = startx + (k % columns) * (tile + gap)
            py = starty + (k // columns) * stepy
            base.paste(symbol, (px, py), symbol)
        return

    # Fallback text
    centered(d, str(value), (x0 + x1) // 2, y0 + (y1 - y0) // 2 - 30, 44, (20, 35, 85))


def draw_isometric_stack(base, bounds, size: int, heights: list[int], mechanic: str, layer: int | None = None, target_height: int | None = None):
    """Render authentic, mathematically precise 3D Isometric unit cubes with vivid depth shading."""
    d = ImageDraw.Draw(base)
    x0, y0, x1, y1 = bounds

    # Stage background illumination
    rounded(d, (x0, y0, x1, y1), 48, (26, 38, 92), outline=(95, 128, 220), width=3)

    # Scale edge size based on grid dimension
    edge = 95 if size == 2 else 74 if size == 3 else 58
    u = math.sqrt(3) * edge / 2
    v = edge / 2

    # Center of projection inside board
    cx = (x0 + x1) // 2
    max_h = max(heights) if heights else 1
    cy = y0 + (y1 - y0) // 2 + int(max_h * 16) - 10

    def project(x, y, z):
        return (cx + (x - y) * u, cy + (x + y) * v - z * edge)

    # 1. Draw 3D floor grid (base plane)
    for y in range(size):
        for x in range(size):
            pts = [project(x, y, 0), project(x + 1, y, 0),
                   project(x + 1, y + 1, 0), project(x, y + 1, 0)]
            d.polygon(pts, fill=(35, 52, 115), outline=(72, 105, 195))
            d.line(pts + [pts[0]], fill=(72, 105, 195), width=2)

    # 2. Collect all occupied 3D unit cubes and sort back-to-front
    cubes = []
    for y in range(size):
        for x in range(size):
            h = heights[y * size + x]
            for z in range(h):
                cubes.append((x, y, z))

    # Painter's sorting: back-to-front (smaller x+y rendered first, then lower z first)
    cubes.sort(key=lambda c: (c[0] + c[1], c[2]))

    # 3. Draw each 3D cube with vivid face illumination
    for x, y, z in cubes:
        # Determine color palette for this cube (e.g. highlight specific layer if layer-count)
        is_highlighted = (mechanic == 'layer-count' and layer is not None and z + 1 == layer)
        top_color = GOLD_TOP if is_highlighted else CYAN_TOP
        left_color = GOLD_LEFT if is_highlighted else CYAN_LEFT
        right_color = GOLD_RIGHT if is_highlighted else CYAN_RIGHT

        # A. Top face (plane at z+1) - visible if topmost in this (x, y) column
        if z + 1 == heights[y * size + x]:
            pts = [project(x, y, z + 1), project(x + 1, y, z + 1),
                   project(x + 1, y + 1, z + 1), project(x, y + 1, z + 1)]
            d.polygon(pts, fill=top_color)
            d.line(pts + [pts[0]], fill=CUBE_BORDER, width=3, joint='curve')

        # B. Left face (plane at y+1) - visible if not occluded by a cube in front-left
        occupied_left = (y + 1 < size and heights[(y + 1) * size + x] > z)
        if not occupied_left:
            pts = [project(x, y + 1, z + 1), project(x + 1, y + 1, z + 1),
                   project(x + 1, y + 1, z), project(x, y + 1, z)]
            d.polygon(pts, fill=left_color)
            d.line(pts + [pts[0]], fill=CUBE_BORDER, width=3, joint='curve')

        # C. Right face (plane at x+1) - visible if not occluded by a cube in front-right
        occupied_right = (x + 1 < size and heights[y * size + x + 1] > z)
        if not occupied_right:
            pts = [project(x + 1, y, z + 1), project(x + 1, y + 1, z + 1),
                   project(x + 1, y + 1, z), project(x + 1, y, z)]
            d.polygon(pts, fill=right_color)
            d.line(pts + [pts[0]], fill=CUBE_BORDER, width=3, joint='curve')

    # 4. Perspective Direction Labels (ÖN / SAĞ)
    if mechanic == 'front-view':
        arrow_pt = project(size / 2, size + 0.65, 0)
        centered(d, 'ÖN  ⬇', arrow_pt[0], arrow_pt[1] + 15, 34, GOLD, bold=True)
    elif mechanic == 'right-view':
        arrow_pt = project(size + 0.65, size / 2, 0)
        centered(d, 'SAĞ  ⬅', arrow_pt[0] + 10, arrow_pt[1] - 15, 34, GOLD, bold=True)
    elif mechanic == 'layer-count' and layer is not None:
        centered(d, f'✦ {layer}. Katmandaki Küpler Vurgulanmıştır ✦', cx, y1 - 65, 29, GOLD)
    elif mechanic == 'complete-block' and target_height is not None:
        centered(d, f'Hedef: Tabanı {target_height} kat yüksekliğinde doldur', cx, y1 - 65, 30, (215, 235, 255))


def draw_cube_net(base, bounds, faces: list[dict], target: int):
    """Render 3D cube unfolding net with high-contrast dice face cards."""
    d = ImageDraw.Draw(base)
    x0, y0, x1, y1 = bounds
    rounded(d, (x0, y0, x1, y1), 48, (26, 38, 92), outline=(95, 128, 220), width=3)

    min_x = min(f['x'] for f in faces)
    max_x = max(f['x'] for f in faces)
    min_y = min(f['y'] for f in faces)
    max_y = max(f['y'] for f in faces)
    net_w = max_x - min_x + 1
    net_h = max_y - min_y + 1

    box_w = x1 - x0 - 80
    box_h = y1 - y0 - 150
    tile = min(120, int(box_w / net_w), int(box_h / net_h))
    gap = 4

    start_x = x0 + (x1 - x0 - (net_w * tile + (net_w - 1) * gap)) // 2
    start_y = y0 + 110 + (box_h - (net_h * tile + (net_h - 1) * gap)) // 2

    centered(d, '✦  KÜPÜ ZİHNİNDE KATLA  ✦', (x0 + x1) // 2, y0 + 42, 34, GOLD)

    for face in faces:
        fx = start_x + (face['x'] - min_x) * (tile + gap)
        fy = start_y + (face['y'] - min_y) * (tile + gap)
        is_target = (face['label'] == target)

        fill = GOLD if is_target else (244, 247, 255)
        border = (255, 240, 160) if is_target else (175, 195, 240)
        num_color = (25, 30, 80) if is_target else (18, 30, 75)

        rounded(d, (fx, fy, fx + tile, fy + tile), 20, fill=fill, outline=border, width=4)
        centered(d, str(face['label']), fx + tile // 2, fy + tile // 2 - 32, 52, num_color, bold=True)

    centered(d, f'Soru: {target} numaralı yüzün karşısındaki yüz hangisidir?', (x0 + x1) // 2, y1 - 65, 31, WHITE)


def draw_perceptual_board(base, payload):
    d = ImageDraw.Draw(base)
    b = payload['question']['visualConfig']
    cards = b.get('cards', [])
    total = len(cards)
    columns = (3 if total in (9, 3) else
               2 if b.get('mechanic') == 'paired-analogy' else
               4 if b.get('mechanic') in ('attribute-sequence', 'interleaved-sequence') else 2)
    rows = math.ceil(total / max(1, columns))
    gap = 17
    width, height = 862, 620
    x0, y0 = (W - width) // 2, 535
    cw = int((width - (columns - 1) * gap) / columns)
    ch = int((height - (rows - 1) * gap) / rows)
    if rows == 1:
        ch, y0 = 210, 680
    if rows == 2:
        ch, y0 = 255, 575
    rounded(d, (58, 478, W - 58, 1220), 48, (31, 45, 105), outline=(83, 109, 188), width=3)
    for i, card in enumerate(cards):
        r, col = divmod(i, columns)
        box = (x0 + col * (cw + gap), y0 + r * (ch + gap),
               x0 + col * (cw + gap) + cw, y0 + r * (ch + gap) + ch)
        rounded(d, box, 23, (247, 249, 255), outline=(198, 218, 255), width=4)
        card_content(base, box, card, blank=card is None)

    mech = b.get('mechanic')
    if mech == 'analogy-grid':
        centered(d, 'Aynı değişimi uygula', W // 2, 1115, 34, (213, 228, 255))
    elif mech == 'feature-classification':
        centered(d, 'Ortak özellik hangisinde?', W // 2, 1115, 34, (213, 228, 255))


def board(base, payload):
    vconfig = payload['question'].get('visualConfig', {})
    mode = vconfig.get('displayMode')

    if mode == 'cube_lab':
        bounds = (58, 478, W - 58, 1220)
        mech = vconfig.get('mechanic')
        if mech == 'net-opposite':
            draw_cube_net(base, bounds, vconfig.get('faces', []), vconfig.get('target', 1))
        else:
            draw_isometric_stack(base, bounds, vconfig.get('size', 3), vconfig.get('heights', []),
                                 mech, vconfig.get('layer'), vconfig.get('targetHeight'))
    else:
        draw_perceptual_board(base, payload)


def page(payload, second):
    base = gradient()
    d = ImageDraw.Draw(base)

    # Ambient subtle space dust stars
    rng = random.Random(7711 + second)
    for _ in range(25):
        x, y = rng.randrange(25, W - 25), rng.randrange(85, H - 180)
        radius = rng.choice([2, 3, 4])
        d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(110, 135, 235))

    # Top Brand Header
    rounded(d, (55, 78, 1025, 196), 47, (52, 50, 142), outline=(130, 110, 245), width=3)
    centered(d, '✦  BİLSEM JUNIOR  ✦', W // 2, 108, 48, WHITE)

    # Sub-header: 3D Zeka Sorusu
    is_3d = payload['question'].get('visualConfig', {}).get('displayMode') == 'cube_lab'
    title_text = 'GÜNÜN 3B ZEKA SORUSU' if is_3d else 'GÜNÜN ZEKA SORUSU'
    centered(d, title_text, W // 2, 238, 47, GOLD)

    # Class & Difficulty Badge
    rounded(d, (315, 318, 765, 384), 26, (40, 65, 130), outline=(100, 135, 205), width=2)
    centered(d, f"{payload['grade']}. SINIF  ·  {payload['difficulty']}. SEVİYE", W // 2, 334, 25, (220, 232, 255))

    # Topic Label
    labels = {
        'total': '3 BOYUTLU KÜP SAYMA',
        'layer-count': 'KATMAN İNCELEME',
        'complete-block': 'YAPIYI TAMAMLAMA',
        'front-view': 'ÖNDEN GÖRÜNÜŞ',
        'right-view': 'SAĞDAN GÖRÜNÜŞ',
        'top-view': 'ÜSTTEN GÖRÜNÜŞ',
        'rotated-top': '3B YAPIYI DÖNDÜRME',
        'net-opposite': '3B KÜP KATLAMA',
        'analogy-grid': 'GÖRSEL ANALOJİ',
        'paired-analogy': 'ŞEKİL İLİŞKİLERİ',
        'matrix-attributes': 'RAVEN MATRİSİ',
        'feature-classification': 'SINIFLANDIRMA',
        'attribute-sequence': 'GÖRSEL ÖRÜNTÜ',
        'interleaved-sequence': 'KARMA ÖRÜNTÜ',
    }
    mech = payload['mechanic']
    topic_label = labels.get(mech, 'UZAMSAL DÜŞÜNME')
    centered(d, topic_label, W // 2, 412, 27, (185, 208, 255))

    # Main Visual Board (3D Cubes or Perceptual cards)
    board(base, payload)

    # Question Prompt Banner below board
    d = ImageDraw.Draw(base)
    prompt_text = payload['question'].get('prompt', 'Doğru cevabı bul!')
    # Truncate prompt if too long for one line
    if len(prompt_text) > 48:
        prompt_text = prompt_text[:46] + '...'

    # Options Card Area
    rounded(d, (58, 1242, 1022, 1572), 38, (248, 249, 255))
    options = payload['question']['options']
    correct_id = payload['question']['correctOptionId']

    for j, opt in enumerate(options):
        ox = 74 + (j % 2) * 482
        oy = 1260 + (j // 2) * 148
        is_correct = (opt['id'] == correct_id and second >= 13)

        fill = (200, 255, 225) if is_correct else (232, 237, 252)
        border = GREEN if is_correct else (190, 202, 235)
        rounded(d, (ox, oy, ox + 456, oy + 132), 22, fill, outline=border, width=7 if is_correct else 3)

        # Letter badge
        badge_fill = GREEN_DARK if is_correct else (38, 56, 125)
        rounded(d, (ox + 12, oy + 14, ox + 86, oy + 118), 17, badge_fill)
        centered(d, LETTERS[j], ox + 49, oy + 38, 44, WHITE)

        # Option Value
        card_content(base, (ox + 98, oy + 10, ox + 444, oy + 122), opt.get('visualData'))

    d = ImageDraw.Draw(base)

    # Question prompt above options
    rounded(d, (100, 1160, 980, 1224), 22, (20, 32, 78), outline=(85, 110, 195), width=2)
    centered(d, prompt_text, W // 2, 1175, 31, WHITE, bold=True)

    # Bottom Interaction / Timer / Answer Reveal
    if second < 2:
        centered(d, '✦ Hazır mısın? Küpleri incele! ✦', W // 2, 1618, 38, WHITE)
    elif second < 13:
        left = 13 - second
        centered(d, f'CEVAP İÇİN {left} SANİYE', W // 2, 1616, 44, GOLD)
        # Animated countdown bar
        bar_w = 840
        rounded(d, (120, 1698, 960, 1730), 16, (52, 68, 120))
        fill_w = int(bar_w * (left / 11.0))
        if fill_w > 0:
            rounded(d, (120, 1698, 120 + fill_w, 1730), 16, PINK)
    elif second < 16:
        ans_idx = next((i for i, o in enumerate(options) if o['id'] == correct_id), 0)
        ans_letter = LETTERS[ans_idx]
        ans_val = options[ans_idx].get('visualData', {})
        extra = f" ({ans_val.get('textNumber')} Küp)" if isinstance(ans_val, dict) and 'textNumber' in ans_val else ''
        centered(d, f'DOĞRU CEVAP: {ans_letter}{extra}', W // 2, 1614, 49, GREEN)
        centered(d, 'Bravo! Doğru cevabı buldun mu?', W // 2, 1705, 29, WHITE)
    else:
        centered(d, 'KAÇ SANİYEDE BULDUN?', W // 2, 1616, 44, GOLD)
        centered(d, 'Cevabını ve süreni yoruma yaz! 👇', W // 2, 1702, 31, WHITE)

    centered(d, 'BİLSEM Hazırlık: www.bilsemjunior.com', W // 2, 1812, 29, (215, 230, 255))
    return base


def audio(path: Path, duration=19):
    rate = 48000
    pcm = array('h')
    beeps = [(0, 523.25, .13, .23), (1, 659.25, .11, .22)]
    beeps += [(s, 880, .065, .16) for s in range(2, 13)]
    beeps += [(13, 523.25, .35, .2), (13.2, 659.25, .34, .19),
              (13.4, 783.99, .38, .2), (16, 659.25, .14, .15)]
    for i in range(duration * rate):
        t = i / rate
        value = .012 * math.sin(2 * math.pi * 130 * t)
        for t0, freq, dur, amp in beeps:
            dt = t - t0
            if 0 <= dt < dur:
                env = min(1, dt / .01) * math.exp(-6 * dt / dur) * min(1, (dur - dt) / .02)
                value += amp * env * (math.sin(2 * math.pi * freq * dt) +
                                      .27 * math.sin(4 * math.pi * freq * dt))
        pcm.append(int(max(-1, min(1, value)) * 32767))
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(pcm.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default='reels-out/question.json')
    ap.add_argument('--output', default='reels-out/reel.mp4')
    ap.add_argument('--preview', action='store_true')
    args = ap.parse_args()
    payload = json.loads(Path(args.input).read_text(encoding='utf-8'))
    display_mode = payload['question']['visualConfig'].get('displayMode')
    if display_mode not in ('perceptual_board', 'cube_lab') or len(payload['question']['options']) != 4:
        raise ValueError('Only verified 3D cube or perceptual questions with four options supported')

    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    if args.preview:
        page(payload, 8).save(target.with_suffix('.png'))
        print(target.with_suffix('.png'))
        return
    with tempfile.TemporaryDirectory() as temp:
        folder = Path(temp)
        lines = []
        for second in range(19):
            frame = folder / ('%03d.png' % second)
            page(payload, second).save(frame, optimize=True)
            lines.append("file '" + str(frame) + "'\nduration 1\n")
        lines.append("file '" + str(folder / '018.png') + "'\n")
        (folder / 'frames.txt').write_text(''.join(lines))
        wav = folder / 'original_audio.wav'
        audio(wav)
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-safe', '0', '-f', 'concat', '-i', str(folder / 'frames.txt'),
            '-i', str(wav), '-map', '0:v:0', '-map', '1:a:0',
            '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264',
            '-preset', 'veryfast', '-crf', '24', '-r', '30',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
            '-shortest', str(target),
        ], check=True)
    print(target)


if __name__ == '__main__':
    main()
