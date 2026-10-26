import test from "node:test";
import assert from "node:assert/strict";
import {
  clipDuration,
  projectDuration,
  locateClip,
  splitClip,
  moveClip,
  dimensions,
} from "./model.ts";
import type { Clip, Project } from "./model.ts";

const clip = (id: string, start = 2, end = 8): Clip => ({
  id,
  assetId: "asset-" + id,
  in: start,
  out: end,
  title: "Keep this",
  titlePosition: "bottom",
  titleSize: 44,
  titleColor: "#ffffff",
  fit: "contain",
  volume: 0.5,
});
const project = (...clips: Clip[]): Project => ({
  version: 1,
  name: "QA",
  ratio: "16:9",
  clips,
});

test("split preserves total duration, source continuity and clip properties without mutating input", () => {
  const original = project(clip("a"), clip("b", 1, 5));
  const before = structuredClone(original);
  const result = splitClip(original, 2.5);
  assert.deepEqual(original, before);
  assert.equal(result.clips.length, 3);
  assert.equal(projectDuration(result), projectDuration(original));
  assert.equal(result.clips[0].out, 4.5);
  assert.equal(result.clips[1].in, 4.5);
  assert.equal(result.clips[1].out, 8);
  assert.notEqual(result.clips[0].id, result.clips[1].id);
  assert.equal(result.clips[1].assetId, original.clips[0].assetId);
  assert.equal(result.clips[1].title, original.clips[0].title);
  for (const time of [0, 1, 2.49, 2.5, 4, 5.99, 6, 9]) {
    assert.equal(
      locateClip(result.clips, time)?.sourceTime,
      locateClip(original.clips, time)?.sourceTime,
    );
  }
});

test("split rejects boundary, outside, nonfinite and sub-minimum segments", () => {
  const original = project(clip("a"));
  for (const time of [-1, 0, 0.05, 5.95, 6, 100, NaN, Infinity])
    assert.equal(splitClip(original, time), original);
  assert.equal(splitClip(project(), 1).clips.length, 0);
});

test("timeline boundary belongs to next clip and maps to its source in point", () => {
  const clips = [clip("a", 2, 5), clip("b", 10, 14)];
  assert.equal(locateClip(clips, 2)?.sourceTime, 4);
  assert.equal(locateClip(clips, 3)?.clip.id, "b");
  assert.equal(locateClip(clips, 3)?.sourceTime, 10);
  assert.equal(locateClip(clips, -2)?.sourceTime, 2);
  assert.equal(locateClip(clips, NaN), null);
  assert.equal(locateClip([], 0), null);
});

test("reorder retains exact clip contents and total duration", () => {
  const original = project(clip("a"), clip("b", 3, 7), clip("c", 0, 2));
  const result = moveClip(original, "b", -1);
  assert.deepEqual(
    result.clips.map((c) => c.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(result.clips[0], original.clips[1]);
  assert.equal(projectDuration(result), 12);
  assert.deepEqual(
    original.clips.map((c) => c.id),
    ["a", "b", "c"],
  );
  assert.equal(moveClip(original, "a", -1), original);
  assert.equal(moveClip(original, "c", 1), original);
  assert.equal(moveClip(original, "missing", 1), original);
});

test("output sizes implement the three supported aspect ratios", () => {
  for (const [ratio, expected] of [
    ["16:9", 16 / 9],
    ["9:16", 9 / 16],
    ["1:1", 1],
  ] as const) {
    const size = dimensions(ratio);
    assert.equal(size.width / size.height, expected);
  }
  assert.equal(clipDuration(clip("bad", 8, 2)), 0);
});
