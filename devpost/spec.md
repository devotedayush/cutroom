---
doc: spec
status: approved
---
# Cutroom — Technical Spec

## How This Works, In Plain Language
The browser opens local files and remembers the edit decisions. The preview draws the selected source section and title. Export decodes the chosen sections, draws the same composition, encodes frames and audio, and downloads a movie. No media-processing server is involved.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`: local File → asset metadata/object URL → ordered Clip records → shared composition renderer → preview or encoder → downloaded video Blob.

## Stack
Recommended React + TypeScript + Vite for a static app. Mediabunny for local decoding/encoding and muxing. Native canvas and Web Audio. Runtime-check encoders rather than promise universal MP4.
- https://react.dev/
- https://www.typescriptlang.org/docs/
- https://vite.dev/guide/
- https://mediabunny.dev/guide/
- https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API

## Where It Runs and How Someone Tries It
Current desktop Chrome recommended. Node 20+ for development. `npm install`, `npm run dev -- --host 127.0.0.1`, open printed localhost URL. `npm run build` creates static dist. No API keys. Public repository and short public video are required for submission. The learner explicitly chose localhost running and no hosted deployment.

## Look and Feel
Carries approved `prd.md > Look and Feel`: CSS custom properties, charcoal workbench, lime active controls, accessible focus rings and responsive panel stacking.

## Components
### Editor Workspace
Implements `prd.md > Timeline Editing`, `Titles and Framing`: App composes asset bin, preview, inspector and timeline. State transitions are immutable; undo snapshots edit data, not media bytes.
### Media Import and Samples
Implements `prd.md > Import and Samples`: metadata probing and local thumbnails. Generate sample footage within the project; no third-party copyright assets.
### Composition and Playback
Implements `prd.md > Playback`: shared canvas composition geometry and title drawing; sequence/source time mapping. Keep output consistent with preview.
### Video Export
Implements `prd.md > Export`: Mediabunny sinks/sources; determine supported formats, render frames with exact timestamps, concatenate trimmed audio, encode and mux into a downloadable file. Release resources on cancel/failure.
### Project Storage
Implements `prd.md > Project Files`: validated versioned edit document; media relinking by file metadata. No credentials or personal context in saves.

## Data Model
Asset: id, name, type, duration, dimensions, File/Blob and ephemeral object URL. Clip: id, assetId, in/out, title/style, volume, fit. Project: version, name, ratio and ordered clips. Selection, playback and rendering progress are transient. Media stays local.

## File Structure
```
src/
  App.tsx              # workbench and editing controls
  styles.css           # visual system and responsive layout
  model.ts             # types and timeline operations
  render.ts            # shared canvas composition
  media/import.ts      # local metadata and thumbnails
  media/demo.ts        # generated sample footage
  media/export.ts      # encoding and muxing
  storage.ts           # validated portable projects
  main.tsx             # bootstrap
public/                # project-owned static assets
scripts/               # meaningful verification helpers
devpost/               # scope, requirements, spec, checklist, app map
```

## External Services and Dependencies
No runtime external APIs, authentication or paid services. npm supplies build dependencies. Optional static hosting only serves application files.

## Important Failure Modes
- Browser lacks encoder → disable unsupported choice, explain supported alternatives.
- Source is corrupt or missing → explicit error/relink prompt; retain edit decisions.
- Long/high-resolution source → bounded PoC output resolution and visible progress/cancel; avoid claiming unlimited performance.

## What Was Simplified and Why
Single sequence rather than professional multi-track NLE. Local media rather than uploads. Browser-supported formats rather than silently promising every codec. These are the approved proof-of-concept boundaries.

## Decisions and Open Issues
Learner chose the reference and requested parallel GPT-6.1 Sol implementation. Stack follows the approved implementation plan. The browser codec uncertainty was investigated early, then verified through actual WebM/MP4 exports, output frames and decoded audio. No learner-specific technical uncertainty has been established.

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

## Learner Steering — Privacy and Studio Inspiration
The learner clarified the selling point: “A private, browser-native video editor. Your media never leaves your machine.” This is the primary kernel. Remotion Studio is an interface reference for composition metadata and frame controls; no Remotion code/assets/runtime are incorporated. Production app-shell caching enables reopening the editor offline after its first successful load; the service worker caches only shipped application assets, never selected media or project files.

## Sharing and Submission Artifacts
Source repository: https://github.com/devotedayush/cutroom (public, anonymous source/planning/license checks passed). Local app: http://127.0.0.1:5178/ . Hosted deployment omitted by request. Public 60-second demo: https://youtu.be/WUMLKrP4yd4 . Submitted project: https://devpost.com/software/cutroom-mntc70 . Devpost submission confirmation was verified on 27 October 2026 before the deadline.
