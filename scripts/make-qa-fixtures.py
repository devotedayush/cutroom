"""Generate original, identifiable media for manual browser verification.
Requires Python Pillow and ffmpeg on PATH. Outputs are ignored under artifacts/qa.
"""
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'qa'
OUT.mkdir(parents=True, exist_ok=True)
font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = ImageFont.truetype(font_path, 58) if Path(font_path).exists() else ImageFont.load_default(size=58)
small = ImageFont.truetype(font_path, 28) if Path(font_path).exists() else ImageFont.load_default(size=28)

for label, color, tone in [('A', '#1765c1', 440), ('B', '#b44232', 660), ('SILENT', '#287d49', None)]:
    frames = OUT / ('frames-' + label)
    frames.mkdir(exist_ok=True)
    for index in range(120):
        image = Image.new('RGB', (640, 360), color)
        draw = ImageDraw.Draw(image)
        draw.text((30, 50), f'CLIP {label}', font=font, fill='white')
        draw.text((30, 140), f'{index / 20:05.2f} seconds', font=font, fill='white')
        draw.text((30, 265), f'{tone} Hz tone' if tone else 'No audio track', font=small, fill='white')
        draw.rectangle((30, 325, 30 + int(580 * index / 119), 340), fill='#ffd479')
        image.save(frames / f'{index:04}.png')
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '20', '-i', str(frames / '%04d.png')]
    if tone:
        command += ['-f', 'lavfi', '-i', f'sine=frequency={tone}:sample_rate=48000:duration=6']
    command += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '6']
    if tone:
        command += ['-c:a', 'aac', '-shortest']
    command += [str(OUT / f'clip-{label.lower()}.mp4')]
    subprocess.run(command, check=True)
    shutil.rmtree(frames)

image = Image.new('RGB', (500, 700), '#8751b8')
ImageDraw.Draw(image).text((35, 280), 'STILL IMAGE', font=font, fill='white')
image.save(OUT / 'portrait.png')
(OUT / 'corrupt.mp4').write_bytes(b'This is deliberately not valid media.\n')
print(OUT)
