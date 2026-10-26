import type { Clip } from "./model";

/** Shared by preview and export: letterboxing/cropping and title pixels match. */
export function drawComposition(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  clip: Clip,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#10130f";
  ctx.fillRect(0, 0, width, height);
  const sw = Math.max(1, sourceWidth),
    sh = Math.max(1, sourceHeight);
  const scale =
    clip.fit === "cover"
      ? Math.max(width / sw, height / sh)
      : Math.min(width / sw, height / sh);
  const dw = sw * scale,
    dh = sh * scale;
  ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh);
  if (clip.title.trim()) drawTitle(ctx, clip, width, height);
  ctx.restore();
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / 1280, height / 720);
  const fontSize = Math.max(14, clip.titleSize * scale);
  const maxWidth = width * 0.82;
  ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const paragraphs = clip.title.slice(0, 500).split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (
        ctx.measureText((line ? line + " " : "") + word).width > maxWidth &&
        line
      ) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line || !paragraph) lines.push(line);
  }
  const visible = lines.slice(0, 6),
    lineHeight = fontSize * 1.25,
    block = visible.length * lineHeight;
  const middle =
    clip.titlePosition === "top"
      ? height * 0.12 + block / 2
      : clip.titlePosition === "center"
        ? height / 2
        : height * 0.88 - block / 2;
  const y0 = middle - ((visible.length - 1) * lineHeight) / 2;
  const pad = fontSize * 0.5;
  const textWidth = Math.min(
    maxWidth,
    Math.max(...visible.map((line) => ctx.measureText(line).width), 0),
  );
  ctx.fillStyle = "rgba(8,12,7,0.72)";
  const x = (width - textWidth) / 2 - pad,
    y = middle - block / 2 - pad * 0.35;
  ctx.beginPath();
  ctx.roundRect(x, y, textWidth + pad * 2, block + pad * 0.7, fontSize * 0.22);
  ctx.fill();
  ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(clip.titleColor)
    ? clip.titleColor
    : "#ffffff";
  visible.forEach((line, index) =>
    ctx.fillText(line, width / 2, y0 + index * lineHeight, maxWidth),
  );
}
