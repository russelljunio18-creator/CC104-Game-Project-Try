# Group demonstration guide

Target 10–15 minutes, adjusted to your instructor's instructions. These speaking assignments are a proposed rehearsal plan, not evidence that the members have presented or reviewed the final additions.

| Speaker | Suggested time | What to explain and demonstrate |
| --- | --- | --- |
| Jared | 2–3 minutes | Introduce the game objective, show HTML areas and preserved IDs, and explain how the Add click calls queue logic and redraws through jQuery. |
| Eric | 2–3 minutes | Explain local Bootstrap versus custom CSS, show narrow/wide layouts, and demonstrate offline refresh. Point out the local jQuery script and stylesheet paths. |
| Fred | 3 minutes | Show the array of customer objects, unique numbering, `push`, and read-only `queue[0]` peek. Add #1–#4 and explain the front/back order. |
| Russ | 3–4 minutes | Explain `shift`, the empty/completion guards, the returned customer and Last served, success at 10, and Reset. Demonstrate them. |

## Rehearsal sequence

1. Open `index.html` offline and start empty. Try Serve: explain why no count changes.
2. Add three students. Explain why peek reports #1 without changing waiting count.
3. Serve #1; add #4. Explain queue #2, #3, #4 and served 1/10.
4. Show the actual queue functions and the jQuery handlers. Distinguish stored state from displayed text.
5. Reach 10 served. Show disabled Add/Serve and explain why queue functions also reject further operations.
6. Reset. Show empty state and numbering restarting at #1.
7. Describe a real development issue: integrating required libraries while supporting offline launch. Explain the local vendor files and how offline browser checks verified them.
8. Mention AI assistance honestly and explain the final additions in your own words.

## Questions everyone should be able to answer

- Why is this FIFO rather than LIFO?
- Why does a student's number stay the same after the front customer leaves?
- What is the difference between peek and dequeue?
- Why is waiting count derived from `queue.length`?
- What does `null` tell the interface?
- Why is dequeue with an array's `shift()` O(n)?
- Why does Reset also clear Last served and feedback?
- What happens if students remain waiting after the tenth serve?
- Which parts are Bootstrap, custom CSS, plain JavaScript, and jQuery?

## Still required from the team

Review the final AI-assisted additions, perform a personal walkthrough on each member's computer, record all four participants, upload the video using the team's account, add its actual link to the README, and submit the required materials. Confirm the deadline, section, group number, and full names with the instructor. These are not yet recorded as completed.
