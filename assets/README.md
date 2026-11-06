# Campus Canteen artwork

Created with the built-in image-generation tool for this project. These locally bundled images work offline. No third-party character identities or external image URLs are used.

- `student-portraits.png`: one 2x2 atlas, displayed with CSS background positions. Portrait choice is `(customer.number - 1) % 4`, so the same student keeps the same portrait. Repeated portraits do not change unique queue numbers or FIFO order.
- `lunch-mascot.png`: rice graduate on a standard meal tray, used in the header and service counter.

The art and humorous captions are cosmetic. Required controls, feedback, and numbered identities remain readable. Portraits are decorative for assistive technology; student numbers provide identification.

## Exact generation prompts

### Student atlas

Use case: illustration-story. Create a square 2-by-2 sprite atlas of FOUR funny, friendly college student head-and-shoulder portraits for a simple school canteen browser game. Each portrait is centered in its own exact equal quadrant, with generous padding, no overlap. Top left: dark-haired student with huge excited eyes imagining lunch; top right: student with round glasses and amusingly serious hungry expression; bottom left: ponytailed student grinning with determination; bottom right: curly-haired student with sleepy half-closed eyes but a delighted smile. Diverse warm skin tones, navy-and-green simple school clothing. Clean flat cartoon sticker illustration, bold navy outlines, mint and warm cream accents. Each quadrant has the same solid pale cream #f5f7f2 background, no borders. No text, no numbers, no logos, no watermarks. Easily readable silhouettes at 64 pixels, consistent scale. Square atlas, equal 2x2 grid with centers at 25% and 75% of width/height.

### Lunch mascot

Use case: illustration-story. A single cheerful school lunch mascot for Campus Canteen: Lunch Line, a beginner-friendly browser game. A cute anthropomorphic mound of white rice with a tiny navy graduation cap, happy expressive eyes, a wide goofy grin, and little arms giving a thumbs-up, sitting on one green cafeteria tray with a piece of chicken and vegetables. Funny wholesome school-lunch energy. Clean flat cartoon sticker illustration with bold navy outlines, pale mint and warm cream details, simple large shapes, consistent with friendly college student cartoon portraits. Centered compact composition with generous padding on a solid pale cream #f5f7f2 square background. No text, logos, numbers, or watermarks. No additional characters or scene. Readable at small sizes.
