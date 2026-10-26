import test from "node:test";
import assert from "node:assert/strict";
import { parseProject, serializeProject } from "./storage.ts";
import type { Asset, Project } from "./model.ts";

const makeDocument = () => ({
  format: "cutroom-project",
  version: 1,
  project: {
    version: 1,
    name: "QA project",
    ratio: "16:9",
    clips: [
      {
        id: "clip-a",
        assetId: "a",
        in: 1,
        out: 5,
        title: "A title",
        titlePosition: "bottom",
        titleSize: 44,
        titleColor: "#ffffff",
        fit: "contain",
        volume: 0.5,
      },
    ],
  },
  media: [
    {
      id: "a",
      name: "clip-a.mp4",
      size: 1234,
      lastModified: 100,
      kind: "video",
      duration: 6,
    },
  ],
});

test("project roundtrip saves used media metadata without files or object URLs", () => {
  const doc = makeDocument();
  const asset = {
    ...doc.media[0],
    file: new Blob(["media"]),
    url: "blob:private-url",
    width: 640,
    height: 360,
    thumbnail: "data:private-thumbnail",
    hasAudio: true,
  } as Asset;
  const unused = { ...asset, id: "unused", name: "unused.mp4" };
  const text = serializeProject(doc.project as Project, [asset, unused]);
  assert.doesNotMatch(text, /blob:private|data:private|unused|"file"/);
  assert.deepEqual(parseProject(text), {
    project: doc.project,
    media: doc.media,
  });
});

test("project parser rejects invalid JSON, unsupported versions and unsafe root shapes", () => {
  for (const text of [
    "not json",
    "null",
    "[]",
    "{}",
    '"text"',
    " ".repeat(2_000_001),
  ])
    assert.throws(() => parseProject(text));
  for (const mutate of [
    (d: any) => {
      d.version = 2;
    },
    (d: any) => {
      d.project.version = 2;
    },
    (d: any) => {
      d.format = "foreign";
    },
    (d: any) => {
      d.project.ratio = "4:3";
    },
    (d: any) => {
      d.project.name = "x".repeat(121);
    },
    (d: any) => {
      d.media = {};
    },
  ]) {
    const doc = makeDocument();
    mutate(doc);
    assert.throws(() => parseProject(JSON.stringify(doc)));
  }
});

test("rejects invalid trims, missing media, duplicate identifiers, excessive titles and nonfinite values", () => {
  const mutations: ((d: any) => void)[] = [
    (d) => {
      d.project.clips[0].in = -1;
    },
    (d) => {
      d.project.clips[0].out = 0.9;
    },
    (d) => {
      d.project.clips[0].out = 1.01;
    },
    (d) => {
      d.project.clips[0].out = 7;
    },
    (d) => {
      d.project.clips[0].assetId = "missing";
    },
    (d) => {
      d.project.clips.push({ ...d.project.clips[0] });
    },
    (d) => {
      d.media.push({ ...d.media[0] });
    },
    (d) => {
      d.project.clips[0].title = "x".repeat(501);
    },
    (d) => {
      d.project.clips[0].titleSize = 1000;
    },
    (d) => {
      d.project.clips[0].titleColor = "url(https://example.com)";
    },
    (d) => {
      d.project.clips[0].volume = 1.01;
    },
    (d) => {
      d.project.clips[0].volume = -0.1;
    },
    (d) => {
      d.project.clips[0].fit = "stretch";
    },
    (d) => {
      d.project.clips[0].out = Infinity;
    },
    (d) => {
      d.media[0].duration = NaN;
    },
    (d) => {
      d.media[0].size = -1;
    },
    (d) => {
      d.media[0].kind = "script";
    },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const doc = makeDocument();
    mutate(doc);
    assert.throws(
      () => parseProject(JSON.stringify(doc)),
      `mutation ${index} must be rejected`,
    );
  }
  assert.throws(() =>
    parseProject(
      JSON.stringify(makeDocument()).replace('"out":5', '"out":1e999'),
    ),
  );
});

test("rejects too many clips and excessive total duration", () => {
  const doc = makeDocument();
  doc.project.clips = Array.from({ length: 101 }, (_, i) => ({
    ...doc.project.clips[0],
    id: "clip-" + i,
    in: 0,
    out: 0.2,
  }));
  assert.throws(() => parseProject(JSON.stringify(doc)));
  doc.project.clips = Array.from({ length: 31 }, (_, i) => ({
    ...doc.project.clips[0],
    id: "clip-" + i,
    in: 0,
    out: 6,
  }));
  assert.throws(() => parseProject(JSON.stringify(doc)));
});

test("parser reconstructs known properties rather than trusting prototype-shaped extra input", () => {
  const text = JSON.stringify(makeDocument()).replace(
    '"title":"A title"',
    '"title":"<script>alert(1)</script>","__proto__":{"polluted":true},"url":"javascript:alert(1)"',
  );
  const result = parseProject(text);
  assert.equal(result.project.clips[0].title, "<script>alert(1)</script>");
  assert.equal(Object.hasOwn(result.project.clips[0], "__proto__"), false);
  assert.equal(Object.hasOwn(result.project.clips[0], "url"), false);
  assert.equal(
    Object.getPrototypeOf(result.project.clips[0]),
    Object.prototype,
  );
});
