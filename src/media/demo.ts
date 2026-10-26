import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";
import type { Asset } from "../model";
import { importMedia } from "./import";
const W = 960,
  H = 540,
  FPS = 30,
  DURATION = 3;
function paint(ctx: CanvasRenderingContext2D, scene: number, t: number) {
  const palettes = [
    ["#10192b", "#2fd4b4"],
    ["#24143d", "#fa9c66"],
    ["#092e38", "#e0e7a3"],
  ];
  const [dark, light] = palettes[scene];
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, dark);
  gradient.addColorStop(1, scene === 1 ? "#7a3c69" : "#1f5464");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (scene === 0) {
    ctx.rotate(t * 0.12);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = i % 2 ? light : "#ffffff33";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 85 + i * 25, 50 + i * 20, i * 0.23, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = t * (0.3 + i * 0.1) + i;
      ctx.fillStyle = i % 2 ? "#ffffff" : light;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a) * (105 + i * 20),
        Math.sin(a) * (65 + i * 16),
        7 + i * 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (scene === 1) {
    for (let i = 0; i < 11; i++) {
      ctx.save();
      ctx.rotate(i * 0.2 + t * 0.18);
      ctx.strokeStyle = i % 2 ? light : "#ddbaff";
      ctx.lineWidth = 3;
      const s = 50 + i * 21;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
  } else {
    for (let band = 0; band < 9; band++) {
      ctx.beginPath();
      for (let x = -W / 2; x <= W / 2; x += 8) {
        const y =
          Math.sin(x * 0.008 + t * 1.4 + band * 0.5) * 48 + band * 30 - 120;
        x === -W / 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = band % 2 ? light : "#72c5ca";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(220, -120, 45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#ffffff9c";
  ctx.font = "13px monospace";
  ctx.fillText(`CUTROOM ORIGINALS / 0${scene + 1}`, 35, 35);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px system-ui";
  ctx.fillText(
    ["Orbital study", "Shape of motion", "Quiet frequency"][scene],
    35,
    H - 55,
  );
  ctx.font = "16px system-ui";
  ctx.fillStyle = "#ffffffb3";
  ctx.fillText(
    [
      "A little space to create.",
      "Find a different perspective.",
      "Make something worth a moment.",
    ][scene],
    37,
    H - 27,
  );
}
function soundtrack(scene: number) {
  const buffer = new AudioBuffer({
    length: DURATION * 48000,
    numberOfChannels: 2,
    sampleRate: 48000,
  });
  const chords = [
    [220, 330, 440],
    [261.63, 329.63, 392],
    [196, 293.66, 392],
  ][scene];
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      const t = i / 48000,
        envelope = Math.min(1, t * 8, (DURATION - t) * 8);
      data[i] =
        envelope *
        chords.reduce(
          (v, hz, j) =>
            v +
            Math.sin(2 * Math.PI * hz * t + channel * 0.12) * (0.035 / (j + 1)),
          0,
        ) *
        (0.85 + 0.15 * Math.sin(t * 3));
    }
  }
  return buffer;
}
/** Original generated visual studies with synthesized music; runs entirely on device. */
export async function createDemoMedia(): Promise<Asset[]> {
  const quality = new Quality({ bitrate: 1_800_000 });
  const webm =
    (await canEncodeVideo("vp8", {
      width: W,
      height: H,
      frameRate: FPS,
      quality,
    })) &&
    (await canEncodeAudio("opus", { numberOfChannels: 2, sampleRate: 48000 }));
  const mp4 =
    !webm &&
    (await canEncodeVideo("avc", {
      width: W,
      height: H,
      frameRate: FPS,
      quality,
    })) &&
    (await canEncodeAudio("aac", { numberOfChannels: 2, sampleRate: 48000 }));
  if (!webm && !mp4)
    throw new Error(
      "This browser cannot generate the demo video. Import your own supported clips or use a recent Chrome browser.",
    );
  const assets: Asset[] = [];
  try {
    for (let scene = 0; scene < 3; scene++) {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      const target = new BufferTarget(),
        output = new Output({
          target,
          format: webm ? new WebMOutputFormat() : new Mp4OutputFormat(),
        });
      const video = new CanvasSource(canvas, {
          codec: webm ? "vp8" : "avc",
          quality,
        }),
        audio = new AudioBufferSource({
          codec: webm ? "opus" : "aac",
          quality: new Quality({ bitrate: 96000 }),
        });
      output.addVideoTrack(video, { frameRate: FPS });
      output.addAudioTrack(audio);
      try {
        await output.start();
        for (let frame = 0; frame < DURATION * FPS; frame++) {
          paint(ctx, scene, frame / FPS);
          await video.add(frame / FPS, 1 / FPS);
          if (frame % 30 === 0)
            await new Promise<void>((r) => setTimeout(r, 0));
        }
        video.close();
        await audio.add(soundtrack(scene));
        audio.close();
        await output.finalize();
        const extension = webm ? "webm" : "mp4",
          name = [
            "01 Orbital study",
            "02 Shape of motion",
            "03 Quiet frequency",
          ][scene];
        const asset = await importMedia(
          new File([target.buffer!], `${name}.${extension}`, {
            type: `video/${extension}`,
          }),
        );
        assets.push({ ...asset, duration: DURATION, demo: true });
      } catch (error) {
        try {
          await output.cancel();
        } catch {
          /* preserve error */
        }
        throw error;
      } finally {
        canvas.width = canvas.height = 1;
      }
    }
    return assets;
  } catch (error) {
    for (const asset of assets) URL.revokeObjectURL(asset.url);
    throw error;
  }
}
