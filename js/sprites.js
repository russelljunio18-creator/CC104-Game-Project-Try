/* =====================================================================
   Campus Canteen: Lunch Line - pixel art (cosmetic only)

   Every picture below is original art drawn as a small grid of letters.
   Each letter is one pixel; PALETTE says which colour a letter means.
   drawSprite() paints a grid onto a hidden canvas and returns an image
   address that an <img> tag can show. No game rules live in this file.
   ===================================================================== */

const PALETTE = {
  k: "#2b1b17", // outline
  w: "#fffaf0", // rice / white
  g: "#cfd6d8", // plate grey
  h: "#9aa6aa", // plate shadow
  y: "#f6cf5b", // siomai / noodles
  o: "#e8872e", // orange
  b: "#8a4b2a", // adobo brown
  d: "#5a2d1a", // dark sauce
  n: "#4f9d55", // green garnish
  r: "#c8473c", // red
  c: "#f3d9a4", // cup / skin light
  t: "#c98d5a", // drink tan
  p: "#3a2a26", // sago pearl
  s: "#7fc4e8", // straw blue
  i: "#e8b98c", // skin
  a: "#f4f1e8", // apron
  e: "#2f7d5b", // uniform green
  m: "#6b3f2a", // hair
  l: "#ffffff"  // highlight
};

const SPRITE_GRIDS = {
  // Siomai Rice: rice mound on the left, two siomai on the right.
  siomai: [
    "................",
    "................",
    "....kkkk........",
    "...kwwwwk.......",
    "..kwwwwwwk.kkk..",
    "..kwwwwwwkkyoyk.",
    ".kwwwwwwwkyyyyyk",
    ".kwwwwwwkkkyyyyk",
    ".kwwwwwkyoykkkk.",
    ".kwwwwkyyyyyk...",
    "kkkkkkkyyyyykkkk",
    "kgggggggkkkggggk",
    ".kgggggggggggghk",
    "..khhhhhhhhhhk..",
    "...kkkkkkkkkk...",
    "................"
  ],
  // Chicken Adobo: brown chicken in dark sauce beside rice, in a bowl.
  adobo: [
    "................",
    "................",
    "................",
    "....kkk..kkkk...",
    "...kbbbkkwwwwk..",
    "..kbbdbbkwwwwwk.",
    ".kkbbbbdbkwwwwkk",
    "kddkbbbbkwwwwkgk",
    "kgddkkkkddwwkggk",
    "kggddddddddkgggk",
    "kgggkkkkkkkggggk",
    ".kggggggggggggk.",
    ".khggggggggggk..",
    "..khhhhhhhhhk...",
    "...kkkkkkkkk....",
    "................"
  ],
  // Pancit Canton: a pile of noodles with green and orange bits.
  pancit: [
    "................",
    "................",
    "................",
    ".....kkkkkk.....",
    "...kkyyoyyykk...",
    "..kyyoyynyyyyk..",
    ".kyynyyyyoyynyk.",
    ".kyyyyoyyyyyyok.",
    "kkyoyyynyyoyyykk",
    "kgkyyyyyyynyykgk",
    "kggkkkyyyykkkggk",
    "kgggggkkkkgggggk",
    ".kggggggggggghk.",
    "..khhhhhhhhhhk..",
    "...kkkkkkkkkk...",
    "................"
  ],
  // Sago't Gulaman: a tall cup with pearls and a straw.
  sago: [
    "..........ss....",
    ".........ss.....",
    "........ss......",
    "...kkkkkssskkk..",
    "...klllsslllck..",
    "...kttttsttttk..",
    "...kttpttttptk..",
    "....ktttptttk...",
    "....ktrttttrk...",
    "....kttptpttk...",
    "....kptttrtpk...",
    ".....ktpttpk....",
    ".....ktptrtk....",
    ".....kpttptk....",
    ".....kkkkkkk....",
    "................"
  ],
  // The canteen server who stands behind the counter (head and shoulders).
  server: [
    "....kkkkkkkk....",
    "...kaaaaaaaak...",
    "..kaaaaaaaaaak..",
    "..kmmmmmmmmmmk..",
    "..kmiiiiiiiimk..",
    "..kiikiiiikiik..",
    "..kiiiiiiiiiik..",
    "..kiiirrrriiik..",
    "...kiiiiiiiik...",
    "....kkiiiikk....",
    "..kkeekiikeekk..",
    ".keeeeakkaeeeek.",
    "keeeeaaaaaaeeeek",
    "keeeeaaaaaaeeeek",
    "keeeeaaaaaaeeeek",
    "kkkkkkkkkkkkkkkk"
  ]
};

// Paints one grid and returns it as an image address (a "data URL").
function drawSprite(name) {
  const grid = SPRITE_GRIDS[name];
  const canvas = document.createElement("canvas");
  canvas.width = grid[0].length;
  canvas.height = grid.length;
  const pen = canvas.getContext("2d");

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const colour = PALETTE[grid[row][col]];
      if (colour) {
        pen.fillStyle = colour;
        pen.fillRect(col, row, 1, 1);
      }
    }
  }
  return canvas.toDataURL();
}

// Drawn once when the page loads, then reused by every <img>.
const SPRITES = {};

function loadSprites() {
  for (const name in SPRITE_GRIDS) {
    SPRITES[name] = drawSprite(name);
  }
}
