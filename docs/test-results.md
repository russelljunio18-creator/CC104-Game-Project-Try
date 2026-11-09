# Verification record

Automated checks performed by the assistant on the completed game using a headless Microsoft Edge browser, local file:// launch, browser networking disabled, and Playwright 1.62.1. Viewports: 1280 x 900 and 375 x 900.

| Check | Result |
| --- | --- |
| Empty initial queue, zero counts, no next/last customer | PASS at both widths |
| Serve empty: exact feedback, no successful serve counted | PASS at both widths |
| Add #1–#4 in order; unique sequential numbers | PASS at both widths |
| Repeated peek leaves queue unchanged | PASS at both widths |
| Serve removes front; updates Last served, next, waiting and served | PASS at both widths |
| Add after serving retains numbering and order | PASS at both widths |
| Reset during play and after success; repeated Reset | PASS at both widths |
| Serve when empty preserves Last served and served count | PASS at both widths |
| Tenth successful serve completes the game; two remaining students stay visible | PASS at both widths |
| Completion disables Add/Serve; direct queue calls return null with no mutation | PASS at both widths |
| Offline refresh starts a fresh game | PASS at both widths |
| No horizontal page overflow | PASS at both widths |
| Local Bootstrap styles and jQuery available offline | PASS |
| No browser console/page errors and no HTTP requests | PASS |

The assistant visually inspected the narrow gameplay and wide success screenshots. The checks are repeatable with tests/offline.cjs. They do not prove compatibility with every browser or replace each member's explanation and personal walkthrough.

## Human review status

Earlier HTML, styling, enqueue, and dequeue reviews were reported by the user in the project chats. The final AI-assisted Serve/Reset integration and documentation have automated verification, but no new human approval has been claimed. Each member should read the final diff and rehearse the demo guide. The group recording, instructor deadline confirmation, and submission remain outstanding.


## Asset integration verification

The full offline gameplay checks were repeated after the artwork update at 1280px and 375px: all passed. Both local PNG assets load without network access. Four cards retain #1–#4 arrival order with four portrait elements; empty-state humor hides while the queue is populated; serving #1 displays portrait 0 at the counter. The assistant visually inspected wide and narrow screenshots. Images and captions do not change FIFO, numbering, completion, or reset logic.

## Member meme update
The full offline suite passed at both widths after replacing profiles 1-3. Checks also verify all three supplied photos load, each profile uses its expected file, exact dialogue is rendered, and serving student 1 carries the matching line to the counter. The narrow-screen meme lineup was visually inspected.

## Five named profiles
Offline checks passed at 1280px and 375px after adding Insan and Neneng B. Verified all five names and exact dialogues, both new local images, named peek and Last served, Neneng B at customer 5, and Bisaya again at customer 6. FIFO, completion, and reset checks remain passing.

## Large Peek preview
Offline checks passed at both widths. Verified the preview picture exceeds 200px, all five pictures match their front customer and exact dialogue, repeated rendering changes no queue state, and empty/reset states hide and clear the preview. The phone layout was visually inspected.

## Reden and character audio
The gameplay suite and tests/audio.cjs passed at 1280px and 375px. All five actual local MP3s decoded and advanced playback offline in a muted test browser. Verified single-player switching, rapid arrivals, stop on Reset, sound toggle, no autoplay on load/re-enable/peek/Serve, and graceful playback rejection without losing an enqueue. No HTTP requests or browser errors. Mapping was explicitly confirmed by the user; this test checks playback, not independent recognition of song content.


## Interface redesign verification
Run with Google Chrome (headless) from file://, networking disabled, Playwright. The original `tests/offline.cjs` and `tests/audio.cjs` passed unmodified before and after the redesign. The new `tests/layout.cjs` passed at 1280x900, 768x900, 390x844, 360x640 and 320x640.

| Check | Result |
| --- | --- |
| Empty states: line, peek, last served, success banner, feedback hint | PASS |
| Invalid Serve: amber feedback, counts unchanged | PASS |
| FRONT only on first card, BACK only on last, both on a lone student; tags move after Serve | PASS |
| Progress bar value/aria and caption at 0, 1 and 10 served; success banner and disabled Add/Serve at 10; Reset clears all | PASS |
| Long line (14 students): scrolls sideways inside its box, hint appears, Add scrolls to Back, Serve returns to Front | PASS |
| Phones 360px and wider: controls pinned to bottom; front card visible above them | PASS |
| Phones at 320x640: controls pinned and usable, no overflow; only the top of the front card fits above the bar | Known limit |
| Desktop: controls beside the line, on screen without scrolling | PASS |
| No horizontal page overflow in any state | PASS |
| Keyboard: skip link, Tab order, Space/Enter on all buttons, 3px focus ring, lane reachable by keyboard | PASS |
| Reduced motion: no pop-in animation; with motion allowed the newest card animates | PASS |
| Portraits use background-size contain; mascots keep their aspect ratio | PASS |
| No remote URLs in source, no console errors, no HTTP requests | PASS |
| Text/background contrast, computed for 20 colour pairs (lowest 5.77:1) | PASS (WCAG AA) |

Not tested: real phones or Safari/Firefox, a screen reader, and listening to the audio (playback is verified through the audio element, with the browser muted). Screenshots were inspected visually in headless Chrome.

## Adoption verification — 2026-11-09
The approved redesign was applied to the existing repository while preserving assets. All three suites (offline.cjs, audio.cjs, layout.cjs) passed locally in Microsoft Edge. Layout widths: 1280, 768, 390, 360, and 320px. Gameplay and actual offline audio playback: 1280 and 375px. Keyboard, reduced motion, long queue scrolling, reset, completion, and absence of HTTP requests were verified.

## Front-only voice and Lunch Table
Verified actual offline clips follow the front across all five profiles, rear arrivals and peek never restart audio, mute/resume follows the current front, and empty queue/completion/Reset stop playback. Verified FIFO seating history, no seat on invalid serve, all 10 seats at success, clearing on Reset, rapid actions, failure isolation, and reduced-motion support. Gameplay, audio, and layout suites passed. Earlier Add-trigger audio descriptions above are historical and superseded by this behavior.
