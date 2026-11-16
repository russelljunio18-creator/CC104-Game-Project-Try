# Verification record

This record covers the "shift" version of the game (walking students, food orders, patience, modes). It replaces the record for the earlier Add Student / Serve Student version.

Automated checks were performed by the AI assistant on 16 November 2026 using headless Google Chrome for Testing 153, a local `file://` launch, browser networking disabled, and Playwright 1.63.0. They ran on a copy of the project on a Linux machine, not on a team member's Windows computer.

## tests/offline.cjs — gameplay and queue (1280 x 720)

| Check | Result |
| --- | --- |
| Menu opens first; four food buttons in the agreed order; buttons disabled before a shift | PASS |
| All images load; a Bootstrap utility class is applied; `serveFood()` returns `"closed"` on the menu | PASS |
| How to Play opens from the menu, and once automatically before the first shift | PASS |
| First student is enqueued as #1 when the shift opens | PASS |
| Four arrivals get unique numbers 1–4 and are drawn left to right in that order | PASS |
| Waiting count, FRONT and REAR tags, and the peek panel match the queue | PASS |
| Repeated peek returns the same student and removes nobody | PASS |
| Wrong food: queue and served count unchanged, student marked annoyed, warning shown | PASS |
| Right food: only the front student is removed; served, next student, and feedback update | PASS |
| Counter busy after a serve: buttons disabled, `serveFood()` returns `"busy"`, then re-enabled | PASS |
| Empty queue: exact warning, served count unchanged, peek and dequeue return `null` | PASS |
| One clock tick lowers only the front student's patience by 100 ms | PASS |
| Patience at zero: the front student is dequeued, walk-outs +1, served unchanged | PASS |
| Three walk-outs end the shift as lost; a closed shift rejects enqueue; end screen shows 4/10 and 3/3 | PASS |
| Play again restores queue, counts, and numbering | PASS |
| Six students fit; a seventh arrival ends the shift as lost with the queue still at six | PASS |
| Ten correct serves, each removing the front student, end the shift as won; further serving returns `"closed"` | PASS |
| Back to menu resets all state, clears the line and the feedback | PASS |
| With the real clock running, three students arrive by themselves and a number key serves the front | PASS |
| Easy, Normal, Hard hold the agreed numbers; Hard shows on the top bar | PASS |
| No browser console or page errors and no HTTP requests | PASS |

## tests/audio.cjs — voice clips (1280 x 720)

| Check | Result |
| --- | --- |
| Exactly one audio player; silent on the menu | PASS |
| The first student's clip (`reden.mp3`) is loaded when they reach the front | PASS |
| Rear arrivals, a wrong food, and display refreshes do not restart the clip | PASS |
| Serving loads the next front student's clip; a walk-out does the same | PASS |
| Sound: Off clears the player; Sound: On loads the current front student's clip | PASS |
| Empty line and return to menu are silent | PASS |
| All five clip files can be loaded | PASS |

These checks confirm which clip is loaded into the player. Nobody listened to the output, so audible playback and the cut-off still need a human check with speakers on.

## tests/layout.cjs — one-screen layout

Viewports: 1280 x 720, 1920 x 1080, 960 x 540, and 667 x 375 (phone held sideways).

| Check | Result |
| --- | --- |
| The stage fits the window with no page scrolling, scaled by the smaller of width/960 and height/540 | PASS at all four |
| Menu buttons, the How to Play panel, and the end screen fit | PASS at all four |
| Six students, the food buttons, the top bar, and all panels are fully on screen | PASS at all four |
| Students stand left to right in arrival order, between the counter and the door | PASS at all four |
| FRONT tag sits under the first student and REAR tag under the last | PASS at all four |
| Resizing the window rescales the stage | PASS |

The assistant looked at the menu, full-line, wrong-food, served, and shift-complete screenshots at 1280 x 720. The other sizes were checked by measurement only.

## Not verified

- Play on a real Windows computer, in Edge, Firefox, or a phone browser.
- Audible sound: voice clips and beep effects.
- A portrait phone: the stage shrinks to fit the width and becomes small; the game is meant to be played in landscape.
- How hard each mode feels to a real player. The numbers come from the agreed table and have not been play-tested by a person.
- Fonts: the screenshots were made on a machine without Arial Black, so headings on Windows will look heavier than in the screenshots.

## Human review status

The team planned this redesign and chose its rules, but no member has reviewed the final code yet. Each member should read `js/game.js`, play all three modes, and rehearse with the demo guide. The group recording, instructor deadline confirmation, and submission remain outstanding.
