---
doc: checklist
status: approved
---
# Build Checklist
Build mode: fast — learner approved the proposed direction and build order; requested GPT-6.1 Sol agents for speed.

## Slices
- [x] **1. A real local edit renders into a downloadable movie**
  Becomes usable: Sample clips can be trimmed, ordered, titled and exported as a playable video from the workbench.
  Why now: Export is the central risk and the distinctive local-editing proof; the scaffold belongs inside this working slice.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Export`
  Spec ref: `spec.md > Editor Workspace`, `spec.md > Composition and Playback`, `spec.md > Video Export`
  Build: Set up React/TypeScript/Vite, model and shared renderer; generated sample media; editing workbench; browser-local encoding with audio and supported formats.
  Verify (mechanical): Type-check/build; open app in Chrome; render a known short sample with title and trims; inspect decoded output duration, frames and audio.
  Learner check: Open the sample, change a title and trim, play it, export and review the file.
  Commit: `Build local editing and video export journey`

- [x] **2. Your own clips and portable projects work through the same journey**
  Becomes usable: Import personal local clips, save/open edit decisions, recover/relink media, and use undo/redo.
  Why now: Builds on verified sample export and closes the actual user workflow.
  PRD ref: `prd.md > Import and Samples`, `prd.md > Project Files`, `prd.md > Timeline Editing`
  Spec ref: `spec.md > Media Import and Samples`, `spec.md > Project Storage`, `spec.md > Data Model`
  Build: Import and validation, local thumbnails, bounded timeline edits, validated project file, clear media persistence/relink messages, keyboard/accessibility and error recovery.
  Verify (mechanical): Import synthetic A/B files, trim/split/reorder/title, export and decode; save/open project; exercise empty/corrupt input, undo/redo and cancellation; production build.
  Learner check: Try an actual local clip, save/open its project, and identify confusing or broken behavior.
  Commit: `Complete imports portable projects and editing safeguards`

## Hands-on Checkpoints
- [x] Early usable behavior explored — delegated manual browser review, as explicitly requested by the learner
- [x] Final kick-the-tires exploration and feedback completed — Luna independently exercised the UI; findings recorded in verification.md

## Final Review
- [x] Delegated final implementation review complete — user requested Luna to test in their place; no personal hands-on review is claimed

## Code Tour and App Map
- [ ] Personal learning activity — not performed; user requested delegated testing. Reference guide provided without claiming learner participation
- [ ] Optional personal edit/reflection — remains the learner’s own, not fabricated
- [x] `devpost/app-map.html` generated from finished code and provided as a reference
Activity and evidence: Source map provided; parent verified offline source-to-export flow; Luna performed delegated manual UI review. See verification.md.
Route and stops: media/import.ts#importMedia → model.ts#createClip/locateClip → render.ts#drawComposition → media/export.ts#exportProject/capTimeline → App.tsx export player/download.
Edit outcome: Browser test title, trims, split/reorder, framing and volume were verified in rendered output; no learner edit is claimed.
Reflection: not requested yet; personal answer belongs in ignored learner profile
Activity mode: delegated browser review and reference map, per learner instruction; personal learning activity not claimed.

## Revisions

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

### Verification completed
Production-browser offline import/edit/export/cancel/retry verified; WebM/MP4 output frames, duration, dimensions and audio inspected. See verification.md. The learner subsequently explicitly delegated hands-on testing to Luna; the delegated review is recorded above, with personal learning work kept distinct.

### Final revisions
- User made privacy the primary kernel; Remotion Studio informed composition metadata and frame controls.
- Explicit relink dialog replaced unreliable automatic asynchronous file picker.
- Offline cache now reads its own version and ignores static Vary:Origin; updates wait for live editing tabs to close.
- Split action label clarified as Split at playhead after manual-review feedback.
- Paused previews redraw only on relevant media/property events, reducing idle CPU work.
- Runtime third-party license notices and source availability included.
- Hosted deployment omitted at the learner’s explicit request; localhost retained. Public source publication separately authorized.
