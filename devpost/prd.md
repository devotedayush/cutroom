---
doc: prd
status: approved
---
# Cutroom — Product Requirements
Approved implementation of `scope.md > The Core Loop`, with the learner’s later privacy and localhost-only instructions applied.

## The Core Journey
1. Arrive in a working editor with a clearly labeled generated sample project.
2. Import supported local media; see thumbnails, duration and useful errors.
3. Add media to a linear sequence, select clips, trim in/out and reorder.
4. Add an editable title, choose canvas ratio and preview the sequence.
5. Export with progress/cancel. Open the resulting file and verify content and sound.
6. Save a portable edit-decision file; reopen it and relink original local files where needed.

## Screens and Layout
One editing workspace. Header: project name, local status, undo/redo, save/open and export. Left: media. Center: preview and transport. Right: selected clip inspector. Bottom: scrollable timeline with ruler and playhead. Smaller windows stack or collapse secondary panels.

## Look and Feel
Approved direction: warm charcoal, off-white text and acid-lime accent; clean sans-serif UI with monospaced timecodes. Dense but legible editing tool; no external media/font requests required. Reference establishes editing-workspace inspiration; the learner approved the displayed palette and direction.

## Features and Behavior
### Import and Samples
Local file picker and drop zone. Supported playable videos and images become assets. Reject unreadable media with a clear message. Generated sample assets are explicitly labeled and editable.
### Timeline Editing
Select, trim with numeric bounds, split at playhead, delete, move earlier/later and undo/redo. Clip durations remain positive; selections and playhead remain valid after edits.
### Titles and Framing
Per-clip title, position and size; contain/cover framing; 16:9, 9:16 and 1:1 output. Preview matches exported composition.
### Playback
Play/pause and seek the assembled timeline; source audio follows cuts and mute settings. Keyboard shortcuts ignore editable controls.
### Export
Download an actual encoded movie containing the sequence and overlays. Offer only codecs supported by the browser. Show progress, cancel and recoverable errors. Never silently substitute a format. No media upload or telemetry.
### Project Files
Save edit decisions as JSON, separate from original media. Explain relinking when opening. Validate imported project data before using it. Temporary browser object URLs are not durable project media.

## States and Boundaries
- Empty timeline: useful import/sample prompt; playback/export disabled.
- Unsupported input/encoder: explicit explanation; preserve current edit.
- Rendering: prevent conflicting edits; allow cancellation and clean up resources.
- Persistence: local edit decisions only unless explicitly saving media; clearly state reload/relink behavior.

## Product Decisions
Confirmed: original browser video-editor implementation, privacy as the selling point, dark editing workspace, local running, and hackathon submission preparation.

## What We're Building
One coherent local editing and export journey as above.

## Deferred From the POC
Multi-track audio, AI transcription, cloud accounts and publishing integrations.

## Open Questions
The name is Cutroom. Learner-authored submission prose and a public demonstration video remain open. Current Chrome runtime export was verified in both WebM and MP4; other browsers remain unverified.

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

## Learner Steering — Privacy and Studio Inspiration
The learner clarified the selling point: “A private, browser-native video editor. Your media never leaves your machine.” This is the primary kernel. Remotion Studio is an interface reference for composition metadata and frame controls; no Remotion code/assets/runtime are incorporated. Production app-shell caching enables reopening the editor offline after its first successful load; the service worker caches only shipped application assets, never selected media or project files.
