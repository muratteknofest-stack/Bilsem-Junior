#!/usr/bin/env python3
"""Render original Bilsem Junior 9:16 quiz reels. Requires Pillow and ffmpeg."""
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
GOLD = (255, 200, 73)
BLUE = (91, 117, 249)
PINK = (249, 104, 180)
GREEN = (48, 218, 157)
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
        draw.line([(0, y), (W, y)], fill=(int(15 + 20 * t), int(25 + 4 * t), int(76 + 34 * t)))
    for x, y, r, color in [(975, 250, 260, (84, 52, 169)),
                            (100, 1260, 250, (59, 68, 168)),
                            (1000, 1640, 280, (30, 118, 138))]:
        glow = Image.new('RGBA', (W, H))
        gd = ImageDraw.Draw(glow)
        gd.ellipse((x-r, y-r, x+r, y+r), fill=(*color, 80))
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


def card_content(base, bounds, value, blank=False):
    x0, y0, x1, y1 = map(int, bounds)
    d = ImageDraw.Draw(base)
    rounded(d, (x0, y0, x1, y1), 23, (247, 249, 255), outline=(198, 218, 255), width=4)
    if blank or value is None:
        centered(d, '?', (x0 + x1) // 2, y0 + (y1 - y0) // 2 - 55,
                 100, (89, 92, 225))
        return
    color = [BLUE, PINK, (48, 166, 190), (150, 96, 244)][
        {'arrow': 0, 'flag': 1, 'key': 2, 'leaf': 3}[value['shape']]
    ]
    count = int(value['count'])
    width, height = x1-x0, y1-y0
    columns = count if count <= 3 else 2 if count <= 4 else 3
    rows = math.ceil(count / columns)
    tile = max(22, min(75, int((width - 34) / columns), int((height - 22) / rows)))
    gap = 0 if columns == 1 else min(7, max(0, (width-columns*tile-30)//(columns-1)))
    stepy = tile + min(6, max(0, (height-rows*tile-20)//max(1, rows-1)))
    total_width = columns*tile + (columns-1)*gap
    startx = x0 + (width-total_width)//2
    starty = y0 + (height-(rows-1)*stepy-tile)//2
    symbol = glyph(value['shape'], tile, color, bool(value['filled']), int(value['rotation']))
    for k in range(count):
        px = startx + (k % columns) * (tile + gap)
        py = starty + (k // columns) * stepy
        base.paste(symbol, (px, py), symbol)


def board(base, payload):
    d = ImageDraw.Draw(base)
    b = payload['question']['visualConfig']
    cards = b['cards']
    total = len(cards)
    columns = (3 if total in (9, 3) else
               2 if b['mechanic'] == 'paired-analogy' else
               4 if b['mechanic'] in ('attribute-sequence', 'interleaved-sequence') else 2)
    rows = math.ceil(total / columns)
    gap = 17
    width, height = 862, 620
    x0, y0 = (W-width)//2, 535
    cw = int((width-(columns-1)*gap)/columns)
    ch = int((height-(rows-1)*gap)/rows)
    if rows == 1:
        ch, y0 = 210, 680
    if rows == 2:
        ch, y0 = 255, 575
    rounded(d, (58, 478, W-58, 1220), 48, (31, 45, 105),
            outline=(83, 109, 188), width=3)
    for i, card in enumerate(cards):
        r, col = divmod(i, columns)
        box = (x0+col*(cw+gap), y0+r*(ch+gap),
               x0+col*(cw+gap)+cw, y0+r*(ch+gap)+ch)
        card_content(base, box, card, blank=card is None)
    if b['mechanic'] == 'analogy-grid':
        centered(d, 'Aynı değişimi uygula', W//2, 1115, 34, (213, 228, 255))
    elif b['mechanic'] == 'feature-classification':
        centered(d, 'Ortak özellik hangisinde?', W//2, 1115, 34, (213, 228, 255))


def page(payload, second):
    base = gradient()
    d = ImageDraw.Draw(base)
    rng = random.Random(7711 + second)
    for _ in range(23):
        x, y = rng.randrange(25, W-25), rng.randrange(85, H-180)
        radius = rng.choice([2, 3, 4])
        d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(102, 127, 225))
    rounded(d, (55, 82, 1025, 206), 47, (58, 56, 150),
            outline=(127, 105, 236), width=3)
    centered(d, '✦  BİLSEM JUNIOR  ✦', W//2, 113, 49, WHITE)
    centered(d, 'GÜNÜN ZEKA SORUSU', W//2, 252, 48, GOLD)
    rounded(d, (320, 331, 760, 399), 28, (43, 69, 134), outline=(104, 137, 206))
    centered(d, str(payload['grade']) + '. SINIF  ·  ' +
             str(payload['difficulty']) + '. SEVİYE', W//2, 348, 26, (219, 229, 255))
    labels = {
        'analogy-grid': 'GÖRSEL ANALOJİ',
        'paired-analogy': 'ŞEKİL İLİŞKİLERİ',
        'matrix-attributes': 'RAVEN TİPİ MATRİS',
        'feature-classification': 'SINIFLANDIRMA',
        'attribute-sequence': 'GÖRSEL ÖRÜNTÜ',
        'interleaved-sequence': 'KARMA ÖRÜNTÜ',
    }
    centered(d, labels[payload['mechanic']], W//2, 440, 28, (179, 200, 255))
    board(base, payload)
    d = ImageDraw.Draw(base)
    rounded(d, (61, 1244, 1019, 1572), 38, (248, 249, 255))
    options = payload['question']['options']
    correct_id = payload['question']['correctOptionId']
    for j, opt in enumerate(options):
        ox, oy = 78+(j % 2)*479, 1263+(j // 2)*146
        correct = opt['id'] == correct_id and second >= 13
        fill = (205, 255, 229) if correct else (231, 235, 251)
        line = GREEN if correct else (195, 204, 235)
        rounded(d, (ox, oy, ox+453, oy+128), 22, fill, outline=line,
                width=6 if correct else 3)
        rounded(d, (ox+11, oy+16, ox+81, oy+111), 16,
                (23, 142, 103) if correct else (40, 59, 128))
        centered(d, LETTERS[j], ox+46, oy+36, 42, WHITE)
        temp = Image.new('RGBA', (350, 112), (0, 0, 0, 0))
        card_content(temp, (0, 0, 350, 112), opt['visualData'])
        base.paste(temp, (ox+93, oy+8), temp)
    d = ImageDraw.Draw(base)
    if second < 2:
        centered(d, 'Hazır mısın? Şimdi düşün!', W//2, 1621, 39, WHITE)
    elif second < 13:
        left = 13-second
        centered(d, 'CEVAP İÇİN ' + str(left) + ' SANİYE', W//2, 1621, 43, GOLD)
        rounded(d, (120, 1703, 960, 1735), 16, (57, 73, 125))
        rounded(d, (120, 1703, 120+int(840*left/11), 1735), 16, PINK)
    elif second < 16:
        answer = LETTERS[next(i for i, o in enumerate(options) if o['id'] == correct_id)]
        centered(d, 'DOĞRU CEVAP: ' + answer, W//2, 1619, 50, GREEN)
        centered(d, 'Bravo! Doğru cevabı buldun mu?', W//2, 1710, 28, WHITE)
    else:
        centered(d, 'KAÇ SANİYEDE BULDUN?', W//2, 1621, 44, GOLD)
        centered(d, 'Yorumlara yaz!', W//2, 1705, 30, WHITE)
    centered(d, 'Daha fazlası Bilsem Junior uygulamasında',
             W//2, 1813, 29, (217, 232, 255))
    return base


def audio(path: Path, duration=19):
    rate = 48000
    pcm = array('h')
    # Original, algorithmically generated tones: no licensed music.
    beeps = [(0, 523.25, .13, .23), (1, 659.25, .11, .22)]
    beeps += [(s, 880, .065, .16) for s in range(2, 13)]
    beeps += [(13, 523.25, .35, .2), (13.2, 659.25, .34, .19),
              (13.4, 783.99, .38, .2), (16, 659.25, .14, .15)]
    for i in range(duration*rate):
        t = i/rate
        value = .012 * math.sin(2*math.pi*130*t)
        for t0, freq, dur, amp in beeps:
            dt = t-t0
            if 0 <= dt < dur:
                env = min(1, dt/.01)*math.exp(-6*dt/dur)*min(1, (dur-dt)/.02)
                value += amp*env*(math.sin(2*math.pi*freq*dt) +
                                  .27*math.sin(4*math.pi*freq*dt))
        pcm.append(int(max(-1, min(1, value))*32767))
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
    if (payload['question']['visualConfig']['displayMode'] != 'perceptual_board' or
            len(payload['question']['options']) != 4):
        raise ValueError('Only verified perceptual questions with four options supported')
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
        lines.append("file '" + str(folder/'018.png') + "'\n")
        (folder/'frames.txt').write_text(''.join(lines))
        wav = folder/'original_audio.wav'
        audio(wav)
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-safe', '0', '-f', 'concat', '-i', str(folder/'frames.txt'),
            '-i', str(wav), '-map', '0:v:0', '-map', '1:a:0',
            '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264',
            '-preset', 'veryfast', '-crf', '24', '-r', '30',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
            '-shortest', str(target),
        ], check=True)
    print(target)


if __name__ == '__main__':
    main()
