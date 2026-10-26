import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function worker() {
  const script = await readFile(
    new URL("../dist/sw.js", import.meta.url),
    "utf8",
  );
  const listeners = new Map<string, (event: any) => void>();
  const requests: { cache: string; url: string; options: any }[] = [];
  let fetches = 0;
  const cacheName = script.match(/const CACHE='([^']+)'/)?.[1];
  assert.ok(cacheName);
  const context = {
    URL,
    Request,
    self: {
      location: { origin: "https://editor.test" },
      addEventListener: (name: string, fn: any) => listeners.set(name, fn),
    },
    caches: {
      // A global lookup may select an older or waiting worker's index. The active worker must use its own cache.
      match: async () => ({ body: "wrong-version" }),
      open: async (name: string) => ({
        match: async (request: Request | string, options: any) => {
          const url =
            typeof request === "string"
              ? request
              : new URL(request.url).pathname;
          requests.push({ cache: name, url, options });
          return options.ignoreVary && name === cacheName
            ? { body: "active-version" }
            : undefined;
        },
      }),
    },
    fetch: async () => {
      fetches++;
      return { body: "network" };
    },
  };
  vm.runInNewContext(script, context);
  async function dispatch(request: any) {
    let response: Promise<any> | undefined;
    listeners.get("fetch")!({
      request,
      respondWith: (value: Promise<any>) => {
        response = value;
      },
    });
    return response ? await response : undefined;
  }
  return { dispatch, requests, getFetches: () => fetches, cacheName };
}

test("offline navigation uses active shell even with an older or waiting cache and Vary:Origin", async () => {
  const w = await worker();
  const response = await w.dispatch({
    method: "GET",
    url: "https://editor.test/",
    mode: "navigate",
  });
  assert.equal(response.body, "active-version");
  assert.equal(w.getFetches(), 0);
  assert.equal(w.requests[0].cache, w.cacheName);
});
test("known app assets match independently of Vary:Origin; user media and writes are not cached", async () => {
  const w = await worker();
  const response = await w.dispatch({
    method: "GET",
    url: "https://editor.test/icon.svg",
    mode: "cors",
  });
  assert.equal(response.body, "active-version");
  assert.equal(w.getFetches(), 0);
  assert.equal(
    await w.dispatch({
      method: "POST",
      url: "https://editor.test/project",
      mode: "cors",
    }),
    undefined,
  );
  assert.equal(
    await w.dispatch({
      method: "GET",
      url: "blob:https://editor.test/user-file",
      mode: "cors",
    }),
    undefined,
  );
  assert.equal(
    await w.dispatch({
      method: "GET",
      url: "https://editor.test/private-video.mp4",
      mode: "cors",
    }),
    undefined,
  );
  assert.equal(
    await w.dispatch({
      method: "GET",
      url: "https://external.test/video.mp4",
      mode: "cors",
    }),
    undefined,
  );
});
