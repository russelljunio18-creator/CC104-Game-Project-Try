# Group demonstration guide

Target 10–15 minutes, adjusted to your instructor's instructions. These speaking assignments are a proposed rehearsal plan, not evidence that the members have presented or reviewed the final code.

| Speaker | Suggested time | What to explain and demonstrate |
| --- | --- | --- |
| Jared | 2–3 minutes | Introduce the game objective and the three screens (menu, shift, end). Show the HTML areas in `index.html` and how a food button click reaches `handleServe()` through jQuery. |
| Eric | 2–3 minutes | Explain local Bootstrap versus custom CSS, the fixed stage that scales to the window, and how a student walks (CSS transition on `left`). Show that the game opens offline. |
| Fred | 3 minutes | Show the `queue` array of customer objects, unique numbering, `enqueueCustomer()` with `push`, and read-only `peekCustomer()`. Let four students arrive and point out FRONT, REAR, and the peek panel. |
| Russ | 3–4 minutes | Explain `dequeueCustomer()` with `shift`, `serveFood()` and its guards, wrong food, the patience walk-out, win at 10, the two ways to lose, and `resetGame()`. Demonstrate them. |

## Rehearsal sequence

1. Open `index.html` offline. Show the menu, pick Normal, select Start Shift, and read the How to Play panel.
2. Let three or four students walk in. Explain that each arrival is an enqueue at the REAR and gets the next unique number.
3. Point at NEXT STUDENT (PEEK). Explain that it reads `queue[0]` and the waiting count does not change.
4. Tap a wrong food on purpose. Show the warning, that nobody left the line, and that the patience bar turned red and drains faster.
5. Tap the right food. Explain that the front student was dequeued, Served went up, and everyone walked forward one place.
6. Try to "serve" the second student's order while a different student is in front. Explain why FIFO does not allow it.
7. Clear the line, then tap a food with nobody waiting. Show the empty-queue message and that Served did not change.
8. Reach 10 served and show "Shift complete!". Select Play again.
9. Lose on purpose: wait for three walk-outs, or play Hard and let a seventh student arrive at a full line. Explain both lose rules.
10. Open `js/game.js`. Show parts 3 and 4 (queue logic and game rules) and that they contain no jQuery. Then show `renderLine()` traversing the queue.
11. Describe a real development issue. One candidate: with a patience timer on every student, someone in the middle could leave first, which breaks FIFO. The fix was to time only the front student so every exit is a dequeue.
12. Mention AI assistance honestly and explain the code in your own words.

## Questions everyone should be able to answer

- Why is this FIFO rather than LIFO?
- Why does a student's number stay the same when the line moves forward?
- What is the difference between peek and dequeue?
- Why can't a student in the middle of the line be served, or walk out?
- What does `serveFood()` return, and what does the interface do with each answer?
- What does `null` from `enqueueCustomer()` or `dequeueCustomer()` tell the caller?
- Why is the waiting count taken from `queue.length`?
- Why is dequeue with an array's `shift()` O(n)?
- What exactly does `resetGame()` put back?
- What happens to students still waiting when the tenth student is served?
- What does `gameTick()` do every 100 milliseconds?
- Which parts are Bootstrap, custom CSS, plain JavaScript, and jQuery?

## Still required from the team

Review the final AI-assisted code, play the game on each member's computer (including with sound on), record all four participants, upload the video using the team's account, add its actual link to the README, and submit the required materials. Confirm the deadline, section, group number, and full names with the instructor. These are not yet recorded as completed.
