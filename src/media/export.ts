import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";
import {
  dimensions,
  MAX_DURATION,
  projectDuration,
  type Asset,
  type Project,
} from "../model";
import { drawComposition } from "../render";
const FPS = 30,
  RATE = 48000;
const quality = new Quality({ bitrate: 4_000_000 });
function aborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Export canceled", "AbortError");
}
async function supports(format: "webm" | "mp4", width = 1280, height = 720) {
  try {
    return (
      (await canEncodeVideo(format === "webm" ? "vp8" : "avc", {
        width,
        height,
        frameRate: FPS,
        quality,
      })) &&
      (await canEncodeAudio(format === "webm" ? "opus" : "aac", {
        sampleRate: RATE,
        numberOfChannels: 2,
      }))
    );
  } catch {
    return false;
  }
}
export async function getExportCapabilities(): Promise<{
  webm: boolean;
  mp4: boolean;
}> {
  const [webm, mp4] = await Promise.all([supports("webm"), supports("mp4")]);
  return { webm, mp4 };
}
export async function exportProject({
  project,
  assets,
  format,
  onProgress,
  signal,
}: {
  project: Project;
  assets: Asset[];
  format: "webm" | "mp4";
  onProgress?: (n: number) => void;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; filename: string }> {
  const duration = projectDuration(project),
    { width, height } = dimensions(project.ratio);
  if (!duration || !Number.isFinite(duration) || duration > MAX_DURATION)
    throw new Error(`Choose a timeline between 0 and ${MAX_DURATION} seconds.`);
  aborted(signal);
  if (!(await supports(format, width, height)))
    throw new Error(
      `${format.toUpperCase()} export is unavailable in this browser. Try another available format or a recent Chrome browser.`,
    );
  const byId = new Map(assets.map((a) => [a.id, a]));
  for (const clip of project.clips) {
    const asset = byId.get(clip.assetId);
    if (!asset)
      throw new Error(
        "A timeline file is missing. Reimport it before exporting.",
      );
    if (
      !Number.isFinite(clip.in) ||
      !Number.isFinite(clip.out) ||
      clip.in < 0 ||
      clip.out <= clip.in ||
      (asset.kind === "video" && clip.out > asset.duration + 0.05)
    )
      throw new Error("A clip has invalid trim points.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  const target = new BufferTarget();
  const output = new Output({
    format: format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat(),
    target,
  });
  const video = new CanvasSource(canvas, {
    codec: format === "webm" ? "vp8" : "avc",
    quality,
  });
  const audio = new AudioBufferSource({
    codec: format === "webm" ? "opus" : "aac",
    quality: new Quality({ bitrate: 128000 }),
  });
  output.addVideoTrack(video, { frameRate: FPS });
  output.addAudioTrack(audio);
  let currentInput: Input | undefined, image: ImageBitmap | undefined;
  try {
    await output.start();
    let timelineStart = 0,
      frameIndex = 0;
    for (const clip of project.clips) {
      aborted(signal);
      const asset = byId.get(clip.assetId)!;
      const clipDuration = clip.out - clip.in,
        timelineEnd = timelineStart + clipDuration;
      let sink: CanvasSink | undefined;
      if (asset.kind === "image") image = await createImageBitmap(asset.file);
      else {
        currentInput = new Input({
          source: new BlobSource(asset.file),
          formats: ALL_FORMATS,
        });
        const track = await currentInput.getPrimaryVideoTrack();
        if (!track || !(await track.canDecode()))
          throw new Error(`Cannot decode ${asset.name}.`);
        // Fit once in the shared renderer, preserving the preview's exact matte color.
        sink = new CanvasSink(track, { poolSize: 1 });
      }
      // Use global frame boundaries so a sequence of fractional trims never accumulates rounding drift.
      const firstFrame = frameIndex;
      const frameEnd = Math.ceil((timelineEnd - 1e-8) * FPS);
      const times = Array.from({ length: frameEnd - firstFrame }, (_, i) =>
        Math.min(
          clip.out - 0.000001,
          clip.in + Math.max(0, (firstFrame + i) / FPS - timelineStart),
        ),
      );
      const frames = sink?.canvasesAtTimestamps(times);
      try {
        for (let n = firstFrame; n < frameEnd; n++) {
          aborted(signal);
          const next = frames ? await frames.next() : undefined;
          const wrapped = next?.value || undefined;
          const source = image ?? wrapped?.canvas;
          if (!source)
            throw new Error(`A frame could not be decoded from ${asset.name}.`);
          drawComposition(
            ctx,
            source,
            source.width,
            source.height,
            clip,
            width,
            height,
          );
          const stamp = n / FPS;
          await video.add(stamp, Math.min(1 / FPS, duration - stamp));
          frameIndex++;
          onProgress?.(
            0.75 * Math.min(1, frameIndex / Math.ceil(duration * FPS)),
          );
          if (n % 30 === 0)
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        await frames?.return();
      }
      // Every clip gets an exact sample-aligned audio segment, including silence for images/muted footage.
      const startSample = Math.round(timelineStart * RATE),
        endSample = Math.round(timelineEnd * RATE);
      const offline = new OfflineAudioContext(
        2,
        Math.max(1, endSample - startSample),
        RATE,
      );
      const audioTrack =
        currentInput && clip.volume > 0
          ? await currentInput.getPrimaryAudioTrack()
          : null;
      if (audioTrack) {
        if (!(await audioTrack.canDecode()))
          throw new Error(`Cannot decode the audio in ${asset.name}.`);
        const buffers = new AudioBufferSink(audioTrack).buffers(
          clip.in,
          clip.out,
        );
        for await (const part of buffers) {
          aborted(signal);
          const left = Math.max(clip.in, part.timestamp),
            right = Math.min(clip.out, part.timestamp + part.buffer.duration);
          if (right <= left) continue;
          const node = offline.createBufferSource(),
            gain = offline.createGain();
          node.buffer = part.buffer;
          gain.gain.value = Math.min(1, Math.max(0, clip.volume));
          node.connect(gain);
          gain.connect(offline.destination);
          node.start(left - clip.in, left - part.timestamp, right - left);
        }
      }
      aborted(signal);
      await audio.add(await offline.startRendering());
      currentInput?.dispose();
      currentInput = undefined;
      image?.close();
      image = undefined;
      timelineStart = timelineEnd;
    }
    video.close();
    audio.close();
    aborted(signal);
    onProgress?.(0.95);
    await output.finalize();
    aborted(signal);
    // Audio encoders can flush padding after the requested PCM timeline.
    // Keep only packets that contain timeline content so container duration matches the edit.
    const bytes = await capTimeline(target.buffer!, duration, format, signal);
    onProgress?.(1);
    const name =
      project.name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Cutroom";
    return {
      blob: new Blob([bytes], { type: `video/${format}` }),
      filename: `${name}.${format}`,
    };
  } catch (error) {
    try {
      await output.cancel();
    } catch {
      /* preserve original failure */
    }
    throw error;
  } finally {
    currentInput?.dispose();
    image?.close();
    canvas.width = canvas.height = 1;
  }
}

// This bounded desktop export holds a second compressed buffer while remuxing (about 90 MB
// at the 180s limit and 4 Mbps video rate), without decoding or duplicating raw frames.
async function capTimeline(
  bytes: ArrayBuffer,
  duration: number,
  format: "webm" | "mp4",
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const input = new Input({
    source: new BlobSource(new Blob([bytes])),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget(),
    output = new Output({
      target,
      format:
        format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat(),
    });
  try {
    const vt = await input.getPrimaryVideoTrack(),
      at = await input.getPrimaryAudioTrack();
    if (!vt || !at)
      throw new Error("Exported media tracks could not be finalized.");
    const video = new EncodedVideoPacketSource(
        format === "webm" ? "vp8" : "avc",
      ),
      audio = new EncodedAudioPacketSource(format === "webm" ? "opus" : "aac");
    output.addVideoTrack(video, { frameRate: FPS });
    output.addAudioTrack(audio);
    const vconfig = await vt.getDecoderConfig(),
      aconfig = await at.getDecoderConfig();
    if (!vconfig || !aconfig)
      throw new Error("Exported codec metadata is missing.");
    await output.start();
    for await (const packet of new EncodedPacketSink(vt).packets()) {
      aborted(signal);
      if (packet.timestamp >= duration - 1e-8) continue;
      await video.add(
        packet.clone({
          duration: Math.min(packet.duration, duration - packet.timestamp),
        }),
        { decoderConfig: vconfig },
      );
    }
    video.close();
    for await (const packet of new EncodedPacketSink(at).packets()) {
      aborted(signal);
      if (packet.timestamp >= duration - 1e-8) continue;
      await audio.add(
        packet.clone({
          duration: Math.min(packet.duration, duration - packet.timestamp),
        }),
        { decoderConfig: aconfig },
      );
    }
    audio.close();
    await output.finalize();
    aborted(signal);
    return target.buffer!;
  } catch (error) {
    try {
      await output.cancel();
    } catch {
      /* preserve original error */
    }
    throw error;
  } finally {
    input.dispose();
  }
}
