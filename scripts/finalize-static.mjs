import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve("dist");
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) await walk(full);
    else files.push("/" + path.relative(root, full).split(path.sep).join("/"));
  }
}
await walk(root);
const htmlPath = path.join(root, "index.html");
const policy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";
let html = await readFile(htmlPath, "utf8");
html = html.replace(
  '<meta charset="UTF-8"',
  `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta charset="UTF-8"`,
);
await writeFile(htmlPath, html);
const hasher = createHash("sha256");
for (const file of files.sort())
  hasher.update(await readFile(path.join(root, file)));
const version = hasher.digest("hex").slice(0, 16);
const shell = [
  "/",
  ...files.filter((f) => !f.endsWith(".map") && !f.endsWith("/sw.js")),
];
const sw = `// Only application-shell assets are cached. User media and project files never enter this cache. Updates wait for existing editing tabs to close.\nconst CACHE='cutroom-shell-${version}';\nconst ASSETS=${JSON.stringify(shell)};\nself.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))));});\nself.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cutroom-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});\nself.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(caches.match('/index.html').then(cached=>cached||fetch(request)));return;}if(!ASSETS.includes(url.pathname))return;event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>cached||fetch(request)));});\n`;
await writeFile(path.join(root, "sw.js"), sw);
console.log(
  `Prepared private offline shell ${version}: ${shell.length} application assets; no user media cache.`,
);
