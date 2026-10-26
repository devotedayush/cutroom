---
doc: checklist
status: approved
---
# Build Checklist
Build mode: fast — learner approved the proposed direction and build order; requested GPT-6.1 Sol agents for speed.

## Slices
- [ ] **1. A real local edit renders into a downloadable movie**
  Becomes usable: Sample clips can be trimmed, ordered, titled and exported as a playable video from the workbench.
  Why now: Export is the central risk and the distinctive local-editing proof; the scaffold belongs inside this working slice.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Export`
  Spec ref: `spec.md > Editor Workspace`, `spec.md > Composition and Playback`, `spec.md > Video Export`
  Build: Set up React/TypeScript/Vite, model and shared renderer; generated sample media; editing workbench; browser-local encoding with audio and supported formats.
  Verify (mechanical): Type-check/build; open app in Chrome; render a known short sample with title and trims; inspect decoded output duration, frames and audio.
  Learner check: Open the sample, change a title and trim, play it, export and review the file.
  Commit: `Build local editing and video export journey`

- [ ] **2. Your own clips and portable projects work through the same journey**
  Becomes usable: Import personal local clips, save/open edit decisions, recover/relink media, and use undo/redo.
  Why now: Builds on verified sample export and closes the actual user workflow.
  PRD ref: `prd.md > Import and Samples`, `prd.md > Project Files`, `prd.md > Timeline Editing`
  Spec ref: `spec.md > Media Import and Samples`, `spec.md > Project Storage`, `spec.md > Data Model`
  Build: Import and validation, local thumbnails, bounded timeline edits, validated project file, clear media persistence/relink messages, keyboard/accessibility and error recovery.
  Verify (mechanical): Import synthetic A/B files, trim/split/reorder/title, export and decode; save/open project; exercise empty/corrupt input, undo/redo and cancellation; production build.
  Learner check: Try an actual local clip, save/open its project, and identify confusing or broken behavior.
  Commit: `Complete imports portable projects and editing safeguards`

## Hands-on Checkpoints
- [ ] Early usable behavior explored — first verified sample edit/export
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map
- [ ] Learning activity complete — trace local file through edit decisions to export, or learner-chosen alternative
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated from finished code, checked and shown
Activity and evidence: pending
Route and stops: pending actual paths/symbols
Edit outcome: pending
Reflection: not requested yet; personal answer belongs in ignored learner profile
Activity mode: pending

## Revisions

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

### Verification completed
Production-browser offline import/edit/export/cancel/retry verified; WebM/MP4 output frames, duration, dimensions and audio inspected. See verification.md. Learner checkpoints remain unchecked until actual feedback; no final readiness is inferred.
