# Cutroom

A browser-local video editing proof of concept: import video or images, trim and arrange clips, add titles, preview and export a movie.

## Run

Requires Node.js 20.19+ or 22.12+ and a current desktop Chrome browser.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5178). No API keys, accounts or processing server are required. The production build caches its application shell after first load, so it can reopen offline. The cache excludes selected media and project files. Updates wait for existing editing tabs to close, avoiding interruptions to unsaved work.

```sh
npm test
npm run build
npm run test:offline
npm run preview
```

## Editing

Use the generated sample project or import local files. Add clips to the timeline, select a clip, adjust its in/out points, split or reorder, edit its title and framing, then export. Source audio follows the selected sections and volume. Encoder availability is checked at runtime; supported choices vary by browser and operating system.

## Local files and project backups

Media is processed in the browser; the app has no media-upload endpoint or analytics. Save the project file to keep edit decisions. The portable project does not contain source media; retain the originals and relink them when reopening. Browser object URLs are temporary. Download your final video and keep your source files.

## Boundaries

This is a short-video proof of concept with one linear video sequence, per-clip titles, source audio and three output aspect ratios. Export is capped at 180 seconds and uses browser-supported encoding. It is not a professional multi-track editor. Automatic transcription, cloud collaboration, arbitrary codecs and advanced effects are outside this build.

## Architecture

- `src/model.ts`: timeline data, time mapping, split/reorder and output geometry.
- `src/App.tsx`: editing workspace and playback.
- `src/render.ts`: shared canvas framing and title rendering for preview/export.
- `src/media/`: local import, generated original samples, decoding/encoding.
- `src/storage.ts`: versioned project validation, save/open and media relinking.
- `devpost/`: scope, requirements, technical plan, build evidence and app map.

## Inspiration and provenance

The learner selected [EditDatVid](https://github.com/cneuralnetwork/editdatvid) as a functional reference. This project started in a new folder during Build With AI Basics and uses an original implementation. No source code, brand assets or footage were copied from the reference. Standard dependencies are listed in `package.json`; sample visuals and sound are generated locally by this code.

Planning and build workflow: [Devpost Learn Skill Pack](https://github.com/challengepost/learn-ai-basics), installed in `.agents/skills/`. Its planning documents are in `devpost/`. Personal learning context is ignored by Git.

## License

MIT. Dependency licenses remain with their respective owners. Devpost submission copy and reflections must be written by the entrant.

Runtime license notices and source availability are included under [`public/licenses/`](public/licenses/NOTICE.txt), including Mediabunny's MPL-2.0 notice.
