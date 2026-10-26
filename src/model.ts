export type Ratio = "16:9" | "9:16" | "1:1";
export type Fit = "contain" | "cover";
export type TitlePosition = "top" | "center" | "bottom";
export interface Asset {
  id: string;
  name: string;
  kind: "video" | "image";
  file: File | Blob;
  url: string;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
  thumbnail: string;
  size: number;
  lastModified: number;
  demo?: boolean;
}
export interface Clip {
  id: string;
  assetId: string;
  in: number;
  out: number;
  title: string;
  titlePosition: TitlePosition;
  titleSize: number;
  titleColor: string;
  fit: Fit;
  volume: number;
}
export interface Project {
  version: 1;
  name: string;
  ratio: Ratio;
  clips: Clip[];
}
export const MAX_DURATION = 180;
export const MIN_CLIP_DURATION = 0.1;
export const DEFAULT_PROJECT: Project = {
  version: 1,
  name: "Untitled project",
  ratio: "16:9",
  clips: [],
};
export function uid(): string {
  return crypto.randomUUID();
}
export function clipDuration(clip: Clip): number {
  return Math.max(0, clip.out - clip.in);
}
export function projectDuration(project: Project): number {
  return project.clips.reduce((n, clip) => n + clipDuration(clip), 0);
}
export function createClip(asset: Asset): Clip {
  return {
    id: uid(),
    assetId: asset.id,
    in: 0,
    out: Math.min(asset.duration, 15),
    title: "",
    titlePosition: "bottom",
    titleSize: 44,
    titleColor: "#ffffff",
    fit: "contain",
    volume: 1,
  };
}
export function locateClip(
  clips: Clip[],
  time: number,
): {
  clip: Clip;
  index: number;
  start: number;
  localTime: number;
  sourceTime: number;
} | null {
  if (!clips.length || !Number.isFinite(time)) return null;
  let start = 0;
  const t = Math.max(0, time);
  for (let i = 0; i < clips.length; i++) {
    const duration = clipDuration(clips[i]);
    if (t < start + duration || i === clips.length - 1) {
      const localTime = Math.max(
        0,
        Math.min(t - start, Math.max(0, duration - 0.00001)),
      );
      return {
        clip: clips[i],
        index: i,
        start,
        localTime,
        sourceTime: clips[i].in + localTime,
      };
    }
    start += duration;
  }
  return null;
}
export function clipStart(clips: Clip[], id: string): number {
  let time = 0;
  for (const clip of clips) {
    if (clip.id === id) return time;
    time += clipDuration(clip);
  }
  return 0;
}
export function splitClip(project: Project, time: number): Project {
  const point = locateClip(project.clips, time);
  if (
    !point ||
    point.localTime < MIN_CLIP_DURATION ||
    clipDuration(point.clip) - point.localTime < MIN_CLIP_DURATION
  )
    return project;
  const splitAt = point.clip.in + point.localTime;
  const clips = [...project.clips];
  clips.splice(
    point.index,
    1,
    { ...point.clip, out: splitAt },
    { ...point.clip, id: uid(), in: splitAt },
  );
  return { ...project, clips };
}
export function moveClip(
  project: Project,
  id: string,
  direction: -1 | 1,
): Project {
  const from = project.clips.findIndex((c) => c.id === id),
    to = from + direction;
  if (from < 0 || to < 0 || to >= project.clips.length) return project;
  const clips = [...project.clips];
  [clips[from], clips[to]] = [clips[to], clips[from]];
  return { ...project, clips };
}
export function formatTime(seconds: number, precise = false): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0),
    mins = Math.floor(safe / 60),
    secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}${precise ? "." + String(Math.floor((safe % 1) * 100)).padStart(2, "0") : ""}`;
}
export function dimensions(ratio: Ratio): { width: number; height: number } {
  return ratio === "9:16"
    ? { width: 720, height: 1280 }
    : ratio === "1:1"
      ? { width: 960, height: 960 }
      : { width: 1280, height: 720 };
}
