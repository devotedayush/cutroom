import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { uid, type Asset } from "../model";

/** Reads only the selected local Blob; no upload or network request is made. */
export async function importMedia(file: File): Promise<Asset> {
  const url = URL.createObjectURL(file);
  let input: Input | undefined;
  try {
    const base = {
      id: uid(),
      name: file.name,
      file,
      url,
      size: file.size,
      lastModified: file.lastModified,
    };
    if (file.type.startsWith("image/")) {
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = Math.max(
          1,
          Math.round((320 * image.height) / image.width),
        );
        canvas
          .getContext("2d")!
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        return {
          ...base,
          kind: "image",
          duration: 5,
          width: image.width,
          height: image.height,
          hasAudio: false,
          thumbnail: canvas.toDataURL("image/jpeg", 0.8),
        };
      } finally {
        image.close();
      }
    }
    input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const video = await input.getPrimaryVideoTrack();
    if (!video || !(await video.canDecode()))
      throw new Error(
        "This video codec cannot be decoded in this browser. Try an H.264 MP4 or VP8 WebM file.",
      );
    const duration = await input.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("This file has no readable video duration.");
    const audio = await input.getPrimaryAudioTrack();
    if (audio && !(await audio.canDecode()))
      throw new Error(
        "This file’s audio codec is unsupported in this browser. Convert the audio to AAC or Opus first.",
      );
    const sink = new CanvasSink(video, { width: 320, poolSize: 1 });
    const frame = await sink.getCanvas(Math.min(duration / 4, 1));
    if (!frame) throw new Error("Could not read a video frame.");
    const thumb = document.createElement("canvas");
    thumb.width = frame.canvas.width;
    thumb.height = frame.canvas.height;
    thumb.getContext("2d")!.drawImage(frame.canvas, 0, 0);
    return {
      ...base,
      kind: "video",
      duration,
      width: video.displayWidth,
      height: video.displayHeight,
      hasAudio: !!audio,
      thumbnail: thumb.toDataURL("image/jpeg", 0.8),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    input?.dispose();
  }
}
