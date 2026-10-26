import { MAX_DURATION, MIN_CLIP_DURATION, projectDuration } from "./model";
import type { Asset, Clip, Project, Ratio } from "./model";
import { importMedia } from "./media/import";

export interface MediaReference {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  kind: "video" | "image";
  duration: number;
  demo?: boolean;
}
export interface ProjectDocument {
  format: "cutroom-project";
  version: 1;
  project: Project;
  media: MediaReference[];
}

export function serializeProject(project: Project, assets: Asset[]): string {
  const used = new Set(project.clips.map((c) => c.assetId));
  const document: ProjectDocument = {
    format: "cutroom-project",
    version: 1,
    project,
    media: assets
      .filter((a) => used.has(a.id))
      .map(({ id, name, size, lastModified, kind, duration, demo }) => ({
        id,
        name,
        size,
        lastModified,
        kind,
        duration,
        ...(demo ? { demo: true } : {}),
      })),
  };
  return JSON.stringify(document, null, 2);
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}
export function parseProject(text: string): {
  project: Project;
  media: MediaReference[];
} {
  if (text.length > 2_000_000)
    throw new Error(
      "Project file is too large. Choose a Cutroom project file under 2 MB.",
    );
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid project JSON.");
  }
  if (
    !record(document) ||
    document.format !== "cutroom-project" ||
    document.version !== 1 ||
    !record(document.project) ||
    !Array.isArray(document.media)
  )
    throw new Error(
      "Unsupported project file. Choose a version 1 Cutroom project.",
    );
  const p = document.project;
  if (
    p.version !== 1 ||
    !boundedText(p.name, 120) ||
    !["16:9", "9:16", "1:1"].includes(p.ratio as string) ||
    !Array.isArray(p.clips) ||
    p.clips.length > 100 ||
    document.media.length > 100
  )
    throw new Error("Invalid project settings or too many clips.");
  const ids = new Set<string>();
  const media: MediaReference[] = document.media.map((item: unknown) => {
    if (
      !record(item) ||
      !boundedText(item.id, 100) ||
      !item.id ||
      ids.has(item.id) ||
      !boundedText(item.name, 255) ||
      !finite(item.size) ||
      item.size < 0 ||
      !finite(item.lastModified) ||
      item.lastModified < 0 ||
      !["video", "image"].includes(item.kind as string) ||
      !finite(item.duration) ||
      item.duration <= 0
    )
      throw new Error("Invalid or duplicate media reference.");
    ids.add(item.id);
    return {
      id: item.id,
      name: item.name,
      size: item.size,
      lastModified: item.lastModified,
      kind: item.kind as "video" | "image",
      duration: item.duration,
      ...(item.demo === true ? { demo: true } : {}),
    };
  });
  const clipIds = new Set<string>();
  const clips: Clip[] = p.clips.map((item: unknown) => {
    if (
      !record(item) ||
      !boundedText(item.id, 100) ||
      !item.id ||
      clipIds.has(item.id) ||
      !boundedText(item.assetId, 100) ||
      !ids.has(item.assetId) ||
      !finite(item.in) ||
      !finite(item.out) ||
      item.in < 0 ||
      item.out - item.in < MIN_CLIP_DURATION - 1e-8 ||
      !boundedText(item.title, 500) ||
      !["top", "center", "bottom"].includes(item.titlePosition as string) ||
      !finite(item.titleSize) ||
      item.titleSize < 14 ||
      item.titleSize > 120 ||
      typeof item.titleColor !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(item.titleColor) ||
      !["contain", "cover"].includes(item.fit as string) ||
      !finite(item.volume) ||
      item.volume < 0 ||
      item.volume > 1
    )
      throw new Error(
        "Invalid clip settings. Trim, title, framing or audio values are outside supported limits.",
      );
    const asset = media.find((m) => m.id === item.assetId)!;
    if (item.out > asset.duration + 0.01)
      throw new Error("A clip extends beyond its source media.");
    clipIds.add(item.id);
    return {
      id: item.id,
      assetId: item.assetId,
      in: item.in,
      out: item.out,
      title: item.title,
      titlePosition: item.titlePosition as Clip["titlePosition"],
      titleSize: item.titleSize,
      titleColor: item.titleColor,
      fit: item.fit as Clip["fit"],
      volume: item.volume,
    };
  });
  const project: Project = {
    version: 1,
    name: p.name,
    ratio: p.ratio as Ratio,
    clips,
  };
  if (projectDuration(project) > MAX_DURATION + 0.01)
    throw new Error(`Project exceeds the ${MAX_DURATION} second export limit.`);
  return { project, media };
}
export async function relinkAssets(
  refs: MediaReference[],
  files: File[],
): Promise<Asset[]> {
  const assets: Asset[] = [];
  try {
    for (const ref of refs) {
      const file =
        files.find(
          (f) =>
            f.name === ref.name &&
            f.size === ref.size &&
            (ref.lastModified === 0 || f.lastModified === ref.lastModified),
        ) ?? files.find((f) => f.name === ref.name && f.size === ref.size);
      if (!file)
        throw new Error(
          `Relink needed: choose the original file “${ref.name}”.`,
        );
      const asset = await importMedia(file);
      if (
        asset.kind !== ref.kind ||
        Math.abs(asset.duration - ref.duration) > 0.15
      ) {
        URL.revokeObjectURL(asset.url);
        throw new Error(`“${ref.name}” does not match the saved media.`);
      }
      assets.push({ ...asset, id: ref.id, demo: ref.demo });
    }
    return assets;
  } catch (error) {
    assets.forEach((a) => URL.revokeObjectURL(a.url));
    throw error;
  }
}
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
