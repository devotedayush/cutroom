---
doc: scope
status: approved
---
# Video editor proof of concept
An original browser-local editor inspired by EditDatVid. “Cutroom” is a temporary internal folder/codename; final submission identity belongs to the learner.

## The Unique Kernel
Proposed: a focused short-demo editing workspace that turns local clips into a finished, titled video without sending the media to a server. Prove the whole journey with a playable exported file.

## Who It's For
Proposed audience: builders and creators assembling a short product/demo video from screen recordings and clips.

## The Core Loop
Open a sample project or import local video → choose useful sections → reorder clips → add titles → preview → export a real video.

## Inspiration & Identity
User-selected reference: https://github.com/cneuralnetwork/editdatvid. Inspect its public description as inspiration; do not reuse source or assets. Proposed design: dark, focused editing workspace, restrained lime accent, media bin, preview, inspector and timeline.

## Why This Matters to the Learner
The learner wants to build a similar tool and enter Build With AI Basics.

## What "Working" Looks Like
Import two local clips, trim them, put them in a chosen order, add a title and download a playable movie containing those exact decisions. Include a labeled sample project so the loop is immediately testable.

## The POC Boundary
Proposed: single linear video sequence; video/image import; trim, split, reorder, remove, undo/redo; title overlay per clip; output ratio; local save/open; preview and browser video export. No required server or API keys.

## Later
Advanced multi-track mixing, automatic transcription, transitions, keyframes, professional color grading, collaboration.

## Explicitly Cut
Reusing the existing reference code: new-project requirement. A full professional NLE: too large for this proof. Cloud rendering/accounts: unnecessary to the core local-editing proof.

## Review Status
Draft supplied for learner review; do not infer approval from silence. Product details above are agent recommendations rather than established learner choices.

## Approval Record
Learner replied “looks good” to the displayed workflow, visual direction and build proposal on 26 October 2026. Proceed in fast mode as requested. Technical implementation details are engineering choices within that approved boundary.

## Learner Steering — Privacy and Studio Inspiration
The learner clarified the selling point: “A private, browser-native video editor. Your media never leaves your machine.” This is the primary kernel. Remotion Studio is an interface reference for composition metadata and frame controls; no Remotion code/assets/runtime are incorporated. Production app-shell caching enables reopening the editor offline after its first successful load; the service worker caches only shipped application assets, never selected media or project files.
