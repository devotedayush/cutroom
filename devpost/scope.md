---
doc: scope
status: approved
---
# Cutroom
An original browser-local editor inspired by EditDatVid and Remotion Studio. The learner accepted Cutroom as the project name.

## The Unique Kernel
A private, browser-native video editor. The learner’s central promise is “Your media never leaves your machine.” The proof is local import, editing and a playable offline export.

## Who It's For
Audience in the approved scope: builders and creators assembling a short product/demo video from screen recordings and clips.

## The Core Loop
Open a sample project or import local video → choose useful sections → reorder clips → add titles → preview → export a real video.

## Inspiration & Identity
User-selected reference: https://github.com/cneuralnetwork/editdatvid. Inspect its public description as inspiration; do not reuse source or assets. Approved design: dark, focused editing workspace, restrained lime accent, media bin, preview, inspector and timeline.

## Why This Matters to the Learner
The learner wants to build a similar tool and enter Build With AI Basics. The learner subsequently requested localhost-only running; hosted deployment is omitted.

## What "Working" Looks Like
Import two local clips, trim them, put them in a chosen order, add a title and download a playable movie containing those exact decisions. Include a labeled sample project so the loop is immediately testable.

## The POC Boundary
Approved: single linear video sequence; video/image import; trim, split, reorder, remove, undo/redo; title overlay per clip; output ratio; local save/open; preview and browser video export. No required server or API keys.

## Later
Advanced multi-track mixing, automatic transcription, transitions, keyframes, professional color grading, collaboration.

## Explicitly Cut
Reusing the existing reference code: new-project requirement. A full professional NLE: too large for this proof. Cloud rendering/accounts: unnecessary to the core local-editing proof.

## Review Status
The learner approved the displayed direction with “looks good,” clarified the privacy kernel, and delegated manual review to Luna.

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

## Learner Steering — Privacy and Studio Inspiration
The learner clarified the selling point: “A private, browser-native video editor. Your media never leaves your machine.” This is the primary kernel. Remotion Studio is an interface reference for composition metadata and frame controls; no Remotion code/assets/runtime are incorporated. Production app-shell caching enables reopening the editor offline after its first successful load; the service worker caches only shipped application assets, never selected media or project files.
