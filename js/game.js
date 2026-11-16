/* =====================================================================
   Campus Canteen: Lunch Line

   This file has seven parts:
     1. GAME DATA    - the queue, the counters and the settings
     2. CHARACTERS   - names, dialogue and sounds (cosmetic only)
     3. QUEUE LOGIC  - enqueue / dequeue / peek (no screen code!)
     4. GAME RULES   - arrivals, serving, walk-outs, win and lose, reset
     5. AUDIO        - one voice clip at a time, plus tiny sound effects
     6. DISPLAY      - jQuery draws the data on the screen
     7. CLOCK+EVENTS - the timer and the button clicks

   Parts 3 and 4 never touch the page. Part 6 only READS the data and
   draws it. That keeps the data structure easy to explain.
   ===================================================================== */


/* ---------- 1. GAME DATA ---------- */
let queue = [];              // index 0 is the FRONT of the line, the last index is the REAR
let nextQueueNumber = 1;     // the unique number the next arrival will get
let servedCount = 0;         // students served the right food
let angryCount = 0;          // students who ran out of patience and walked out

let shiftState = "menu";     // "menu", "playing", "won" or "lost"
let lostReason = "";         // "angry" (3 walk-outs) or "line" (line was full)
let currentMode = "normal";  // which row of MODES is in use
let counterBusy = false;     // true for a moment while a meal is handed over
let arrivalClock = 0;        // milliseconds since the last student arrived
let arrivalsSoFar = 0;       // how many students have arrived this shift

const SERVED_TARGET = 10;    // serve this many students to win
const MAX_ANGRY = 3;         // this many walk-outs ends the shift
const MAX_LINE = 6;          // the line holds this many; one more arrival ends the shift

const TICK_MS = 100;         // the game clock ticks 10 times a second
const SERVE_TIME_MS = 1200;  // time to hand over one meal
const OPENING_RUSH = 3;      // the first few students arrive close together...
const RUSH_GAP_MS = 800;     // ...this far apart, so a line forms right away

// arrivalMs: time between students. patienceMs: how long the FRONT student waits.
// wrongPenalty: how many times faster patience drains after a wrong food.
const MODES = {
  easy:   { label: "Easy",   arrivalMs: 4000, patienceMs: 14000, wrongPenalty: 1.5 },
  normal: { label: "Normal", arrivalMs: 3000, patienceMs: 10000, wrongPenalty: 2 },
  hard:   { label: "Hard",   arrivalMs: 2000, patienceMs: 7000,  wrongPenalty: 2.5 }
};

// One food button is drawn for each entry. The id matches a picture in js/sprites.js.
const FOODS = [
  { id: "siomai", name: "Siomai Rice" },
  { id: "adobo",  name: "Chicken Adobo" },
  { id: "pancit", name: "Pancit Canton" },
  { id: "sago",   name: "Sago't Gulaman" }
];


/* ---------- 2. CHARACTERS ---------- */
// Cosmetic profiles repeat every five arrivals; the unique queue number still identifies each student.
const STUDENT_NAMES = ["Reden", "Baron", "Busseng", "Insan", "Neneng B"];
const STUDENT_MOODS = [
  "🥴",
  "Nasaan ang sabaw?!",
  "Walang kanen busseng??",
  "Mekus mekus mo na 'yan insan",
  "'Ma ano ulam?"
];

// Each slot matches the name/dialogue arrays; these local clips work offline.
const STUDENT_SOUNDS = [
  "assets/audio/reden.mp3",
  "assets/audio/baron.mp3",
  "assets/audio/busseng.mp3",
  "assets/audio/insan.mp3",
  "assets/audio/neneng-b.mp3"
];

// Student #1 -> character 0, #2 -> 1, ... #6 -> 0 again.
function characterIndex(customer) {
  return (customer.number - 1) % STUDENT_NAMES.length;
}

function customerLabel(customer) {
  return STUDENT_NAMES[characterIndex(customer)] + " #" + customer.number;
}

// CSS class that picks this character's photo (portrait-0 ... portrait-4).
function portraitClass(customer) {
  return "student-portrait portrait-" + characterIndex(customer);
}

function foodName(foodId) {
  for (let i = 0; i < FOODS.length; i++) {
    if (FOODS[i].id === foodId) return FOODS[i].name;
  }
  return "";
}

function randomFoodId() {
  return FOODS[Math.floor(Math.random() * FOODS.length)].id;
}


/* ---------- 3. QUEUE LOGIC ---------- */
// ENQUEUE: a new student joins the REAR of the line.
function enqueueCustomer() {
  if (shiftState !== "playing" || queue.length >= MAX_LINE) {
    return null;                       // shift is closed, or the line is full
  }

  const customer = {
    number: nextQueueNumber,           // unique, never reused in a shift
    order: randomFoodId(),             // the food they want
    patience: MODES[currentMode].patienceMs, // drains only while they are at the FRONT
    annoyed: false                     // becomes true after a wrong food
  };
  queue.push(customer);
  nextQueueNumber++;

  return customer;
}

// DEQUEUE: the FRONT student leaves the line. Nobody else can leave first.
function dequeueCustomer() {
  if (queue.length === 0) {
    return null;
  }

  return queue.shift();
}

// PEEK: look at the FRONT student without removing them.
function peekCustomer() {
  if (queue.length === 0) {
    return null;
  }

  return queue[0];
}


/* ---------- 4. GAME RULES ---------- */
function startShift(modeId) {
  resetGame();
  currentMode = modeId;
  shiftState = "playing";
}

function endShift(result, reason) {
  shiftState = result;   // "won" or "lost"
  lostReason = reason;
  stopClock();
}

// A student reaches the door. If the line is already full, the shift is lost.
function customerArrives() {
  if (shiftState !== "playing") {
    return null;
  }
  if (queue.length >= MAX_LINE) {
    endShift("lost", "line");
    return null;
  }

  arrivalsSoFar++;
  return enqueueCustomer();
}

// The player taps a food button. Only the FRONT student can be served (FIFO).
// Returns "closed", "busy", "empty", "wrong" or "served".
function serveFood(foodId) {
  if (shiftState !== "playing") return "closed";
  if (counterBusy) return "busy";

  const front = peekCustomer();
  if (front === null) return "empty";       // guard: nobody to serve

  if (front.order !== foodId) {
    front.annoyed = true;                   // they stay, and lose patience faster
    return "wrong";
  }

  dequeueCustomer();
  servedCount++;
  if (servedCount >= SERVED_TARGET) {
    endShift("won", "");
  }
  return "served";
}

// The FRONT student ran out of patience, so they are dequeued without a meal.
function frontCustomerWalksOut() {
  const customer = dequeueCustomer();
  if (customer === null) {
    return null;
  }

  angryCount++;
  if (angryCount >= MAX_ANGRY) {
    endShift("lost", "angry");
  }
  return customer;
}

// Only the FRONT student's patience drains. Returns true when it has run out.
function drainFrontPatience() {
  const front = peekCustomer();
  if (front === null) {
    return false;
  }

  const speed = front.annoyed ? MODES[currentMode].wrongPenalty : 1;
  front.patience -= TICK_MS * speed;
  return front.patience <= 0;
}

// Put every piece of game data back to its starting value.
function resetGame() {
  stopClock();
  queue = [];
  nextQueueNumber = 1;
  servedCount = 0;
  angryCount = 0;
  shiftState = "menu";
  lostReason = "";
  counterBusy = false;
  arrivalClock = 0;
  arrivalsSoFar = 0;
}


/* ---------- 5. AUDIO ---------- */
let soundOn = true;
let audioPlaybackId = 0;
let speakingCustomerNumber = null;

function stopCharacterAudio() {
  audioPlaybackId++;
  speakingCustomerNumber = null;
  const audio = document.getElementById("character-audio");
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function playCharacterAudio(customer) {
  // One player speaks for the front student only.
  stopCharacterAudio();
  if (!soundOn) return;
  speakingCustomerNumber = customer.number;
  const audio = document.getElementById("character-audio");
  audio.src = STUDENT_SOUNDS[characterIndex(customer)];
  // A missing or blocked clip must never stop the game.
  audio.play().catch(function () {});
}

// The voice follows the FRONT of the queue. When the front student is served
// or walks out, their clip is cut off and the next student's clip starts.
// Students joining the rear never restart the current speaker.
function syncFrontAudio() {
  const front = peekCustomer();
  if (!soundOn || front === null || shiftState !== "playing") {
    stopCharacterAudio();
    return;
  }
  if (speakingCustomerNumber !== front.number) playCharacterAudio(front);
}

// Short beeps made by the browser itself, so no extra sound files are needed.
let audioContext = null;
const SFX_NOTES = {
  good:  [[660, 0], [880, 90]],
  bad:   [[200, 0], [150, 120]],
  angry: [[180, 0], [140, 140], [110, 280]],
  win:   [[523, 0], [659, 120], [784, 240], [1047, 360]],
  lose:  [[392, 0], [330, 180], [262, 360]],
  tap:   [[520, 0]]
};

function playSfx(name) {
  if (!soundOn) return;
  try {
    const AudioMaker = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioMaker();
    const notes = SFX_NOTES[name];
    for (let i = 0; i < notes.length; i++) {
      const start = audioContext.currentTime + notes[i][1] / 1000;
      const beep = audioContext.createOscillator();
      const volume = audioContext.createGain();
      beep.type = "square";
      beep.frequency.value = notes[i][0];
      volume.gain.setValueAtTime(0.05, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      beep.connect(volume);
      volume.connect(audioContext.destination);
      beep.start(start);
      beep.stop(start + 0.15);
    }
  } catch (error) {
    // Sound effects are optional; the game keeps running without them.
  }
}


/* ---------- 6. DISPLAY ---------- */
const STAGE_WIDTH = 960;
const STAGE_HEIGHT = 540;
const SLOT_START_X = 262;    // where the FRONT student stands
const SLOT_GAP_X = 100;      // space between students in line
const ENTRANCE_X = 985;      // just outside the door on the right
const WALK_MS = 600;         // matches the CSS transition on .student

let selectedMode = "normal"; // the mode highlighted on the menu
let tutorialSeen = false;    // How to Play opens once before the first shift
let startAfterHowTo = false;

// Shrinks or grows the fixed-size stage so the whole game fits the window.
function fitStage() {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
  $("#stage").css("transform", "translate(-50%, -50%) scale(" + scale + ")");
}

function slotX(index) {
  return SLOT_START_X + index * SLOT_GAP_X;
}

// Shows a message in the feedback box. kind is "ok" (green), "warn" (amber) or nothing.
function setFeedback(message, kind) {
  $("#feedback-message")
    .text(message)
    .removeClass("feedback-ok feedback-warn")
    .addClass(kind ? "feedback-" + kind : "");
}

// Shows one of the full-screen panels ("menu", "howto", "end") or none of them.
function showScreen(name) {
  $("#screen-menu").prop("hidden", name !== "menu");
  $("#screen-howto").prop("hidden", name !== "howto");
  $("#screen-end").prop("hidden", name !== "end");
}

// Builds the food buttons and the wall menu from the FOODS list.
function buildFoodButtons() {
  for (let i = 0; i < FOODS.length; i++) {
    const button = $("<button>").attr("type", "button")
      .addClass("px-btn food-button")
      .attr("data-food", FOODS[i].id);
    $("<img>").attr("src", SPRITES[FOODS[i].id]).attr("alt", "").appendTo(button);
    $("<span>").addClass("food-button-name").text(FOODS[i].name).appendTo(button);
    $("<kbd>").text(i + 1).appendTo(button);
    $("#food-bar").append(button);

    $("<img>").attr("src", SPRITES[FOODS[i].id]).attr("alt", "").appendTo("#menu-board-items");
  }
  $("#server-sprite").attr("src", SPRITES.server);
}

// Builds one student for the waiting line. They start outside the door.
function buildStudent(customer) {
  const student = $("<div>").addClass("student")
    .attr("id", "student-" + customer.number)
    .attr("data-number", customer.number)
    .css("left", ENTRANCE_X + "px");

  const bubble = $("<span>").addClass("student-bubble");
  $("<img>").attr("src", SPRITES[customer.order]).attr("alt", foodName(customer.order)).appendTo(bubble);

  $("<span>").addClass("student-emote").attr("aria-hidden", "true").appendTo(student);
  student.append(bubble);
  $("<span>").addClass(portraitClass(customer)).addClass("student-head").appendTo(student);
  $("<span>").addClass("student-body body-" + characterIndex(customer))
    .append($("<span>").addClass("student-number").text("#" + customer.number))
    .appendTo(student);
  $("<span>").addClass("student-legs").append("<i></i><i></i>").appendTo(student);
  return student;
}

// Moves a student to a place in line with a short walking animation.
function walkStudentTo(student, x) {
  if (student.data("x") === x) return;
  student.data("x", x).addClass("is-walking").css("left", x + "px");
  window.setTimeout(function () {
    if (student.data("x") === x) student.removeClass("is-walking");
  }, WALK_MS);
}

// Walks through the queue from FRONT to REAR and places each student in order.
function renderLine() {
  for (let i = 0; i < queue.length; i++) {
    let student = $("#student-" + queue[i].number);
    if (student.length === 0) {
      student = buildStudent(queue[i]).appendTo("#line");
      student[0].offsetWidth;          // let the browser place them at the door first
    }
    student.toggleClass("is-front", i === 0);
    student.toggleClass("is-annoyed", queue[i].annoyed);
    walkStudentTo(student, slotX(i));
  }

  $("#waiting-empty").prop("hidden", queue.length > 0 || shiftState !== "playing");
  $("#tag-front").prop("hidden", queue.length === 0);
  $("#tag-rear").prop("hidden", queue.length < 2)
    .css("left", slotX(Math.max(queue.length - 1, 0)) + "px");
}

// A dequeued student leaves the screen: happy with a meal, or angry without one.
function studentLeaves(customer, mood) {
  const student = $("#student-" + customer.number);
  student.removeAttr("id").removeClass("is-front is-walking")
    .addClass(mood === "happy" ? "is-leaving is-happy" : "is-leaving is-angry");
  student.find(".student-emote").text(mood === "happy" ? "♥" : "💢");
  window.setTimeout(function () { student.remove(); }, 1000);
}

// A small label that floats up from the counter, such as "+1" or "Mali!".
function floatText(text, kind) {
  const label = $("<span>").addClass("float-text float-" + kind).text(text).appendTo("#float-layer");
  window.setTimeout(function () { label.remove(); }, 1000);
}

// The served meal drops onto the counter for a moment.
function showCounterPlate(foodId) {
  $("#counter-plate").attr("src", SPRITES[foodId]).prop("hidden", false)
    .removeClass("is-dropping");
  document.getElementById("counter-plate").offsetWidth;   // restart the animation
  $("#counter-plate").addClass("is-dropping");
}

function updatePatienceBar() {
  const front = peekCustomer();
  let percent = 0;
  if (front !== null) {
    percent = Math.max(0, front.patience / MODES[currentMode].patienceMs * 100);
  }
  $("#patience-bar").css("width", percent + "%")
    .toggleClass("is-low", percent < 35)
    .toggleClass("is-annoyed", front !== null && front.annoyed);
  $("#patience-track").attr("aria-valuenow", Math.round(percent));
}

function updateDisplay() {
  // --- Waiting line: every student in arrival order
  renderLine();

  // --- Counters
  $("#served-count").text(servedCount);
  $("#served-target").text(SERVED_TARGET);
  $("#waiting-count").text(queue.length);
  $("#waiting-limit").text(MAX_LINE);
  $("#angry-count").text(angryCount);
  $("#angry-limit").text(MAX_ANGRY);
  $("#mode-label").text(MODES[currentMode].label);

  // --- Peek: the student at the front (never removed here)
  const nextCustomer = peekCustomer();

  $("#peek-portrait").prop("hidden", nextCustomer === null);
  $("#peek-placeholder").prop("hidden", nextCustomer !== null);
  if (nextCustomer === null) {
    $("#next-student").text("None");
    $("#next-order").text("No order yet");
    $("#peek-portrait").attr("class", "student-portrait");
    $("#order-text").text(shiftState === "playing"
      ? "Nobody at the counter. The next student is on the way..."
      : "Start a shift to open the counter.");
  } else {
    $("#next-student").text(customerLabel(nextCustomer));
    $("#next-order").text("Wants: " + foodName(nextCustomer.order));
    $("#peek-portrait").attr("class", portraitClass(nextCustomer));

    const line = nextCustomer.annoyed
      ? "Hindi 'yan ang order ko! "
      : STUDENT_MOODS[characterIndex(nextCustomer)] + " Pabili po ng ";
    $("#order-text").empty()
      .append(document.createTextNode(line))
      .append($("<strong>").addClass("order-food").text(foodName(nextCustomer.order)))
      .append(document.createTextNode(nextCustomer.annoyed ? " po." : "."));
  }
  updatePatienceBar();

  // --- Controls: food buttons rest while the counter is busy or the shift is closed
  $(".food-button").prop("disabled", shiftState !== "playing" || counterBusy);
  $("#restart-shift").prop("disabled", shiftState === "menu");
}

function showEndScreen() {
  const won = shiftState === "won";
  $("#end-dialog").toggleClass("is-won", won).toggleClass("is-lost", !won);
  $("#end-title").text(won ? "Shift complete!" : "Shift over...");
  if (won) {
    $("#end-reason").text("You served " + SERVED_TARGET + " students in first-in, first-out order.");
  } else if (lostReason === "line") {
    $("#end-reason").text("A student arrived but the line was already full (" + MAX_LINE + ").");
  } else {
    $("#end-reason").text(MAX_ANGRY + " students ran out of patience and walked out.");
  }
  $("#end-served").text(servedCount + "/" + SERVED_TARGET);
  $("#end-angry").text(angryCount + "/" + MAX_ANGRY);
  $("#end-mode").text(MODES[currentMode].label);
  showScreen("end");
  playSfx(won ? "win" : "lose");
}

// Called after any action that may have ended the shift.
function checkShiftEnded() {
  if (shiftState !== "won" && shiftState !== "lost") return;
  stopCharacterAudio();
  updateDisplay();
  window.setTimeout(function () {
    // Skip if the player already pressed Restart or Menu.
    if (shiftState === "won" || shiftState === "lost") showEndScreen();
  }, 700);
}

function updateModeButtons() {
  $(".mode-button").each(function () {
    $(this).attr("aria-pressed", $(this).data("mode") === selectedMode ? "true" : "false");
  });
  const mode = MODES[selectedMode];
  $("#mode-note").text(mode.label + ": a student every " + (mode.arrivalMs / 1000)
    + " s, patience " + (mode.patienceMs / 1000) + " s.");
}

function updateSoundButtons() {
  $(".sound-toggle").text(soundOn ? "Sound: On" : "Sound: Off")
    .attr("aria-pressed", soundOn ? "true" : "false");
}


/* ---------- 7. CLOCK + EVENTS ---------- */
let clockTimerId = null;

function startClock() {
  stopClock();
  clockTimerId = window.setInterval(gameTick, TICK_MS);
}

function stopClock() {
  if (clockTimerId !== null) {
    window.clearInterval(clockTimerId);
    clockTimerId = null;
  }
}

// A student arrives: enqueue them (or lose the shift if the line is full) and redraw.
function handleArrival() {
  const customer = customerArrives();
  if (customer !== null) {
    setFeedback(customerLabel(customer) + " joined the rear of the line.", "ok");
  } else if (shiftState === "lost") {
    setFeedback("The line was full. The shift is over.", "warn");
  }
  updateDisplay();
  syncFrontAudio();
  checkShiftEnded();
}

// The front student's patience ran out: dequeue them and redraw.
function handleWalkOut() {
  const customer = frontCustomerWalksOut();
  if (customer === null) return;
  studentLeaves(customer, "angry");
  floatText("Walk-out!", "bad");
  playSfx("angry");
  setFeedback(customerLabel(customer) + " waited too long and walked out.", "warn");
  updateDisplay();
  syncFrontAudio();
  checkShiftEnded();
}

// Runs every TICK_MS while a shift is open.
function gameTick() {
  if (shiftState !== "playing") return;

  // Arrivals: the opening rush comes quickly, then the mode sets the pace.
  arrivalClock += TICK_MS;
  const gap = arrivalsSoFar < OPENING_RUSH ? RUSH_GAP_MS : MODES[currentMode].arrivalMs;
  if (arrivalClock >= gap) {
    arrivalClock = 0;
    handleArrival();
  }

  // Patience: only the front student is timed.
  if (shiftState === "playing" && drainFrontPatience()) {
    handleWalkOut();
  }
  updatePatienceBar();
}

// A food button (or number key) was pressed.
function handleServe(foodId) {
  const front = peekCustomer();
  const result = serveFood(foodId);

  if (result === "closed" || result === "busy") {
    return;
  }

  if (result === "empty") {
    playSfx("bad");
    setFeedback("No students waiting. Nobody to serve yet.", "warn");
  } else if (result === "wrong") {
    playSfx("bad");
    floatText("Mali!", "bad");
    setFeedback("Wrong food! " + customerLabel(front) + " wants " + foodName(front.order)
      + ". Their patience now drops faster.", "warn");
  } else {
    // Served: the meal is handed over, then the counter is free again.
    counterBusy = true;
    window.setTimeout(function () {
      counterBusy = false;
      $("#counter-plate").prop("hidden", true);
      updateDisplay();
    }, SERVE_TIME_MS);

    playSfx("good");
    showCounterPlate(foodId);
    studentLeaves(front, "happy");
    floatText("+1", "good");
    setFeedback("Served " + customerLabel(front) + ". Enjoy your " + foodName(foodId) + "!", "ok");
  }

  updateDisplay();
  syncFrontAudio();
  checkShiftEnded();
}

// Clears the old scene and opens the counter in the chosen mode.
function beginShift() {
  stopCharacterAudio();
  startShift(selectedMode);
  $("#line").empty();
  $("#float-layer").empty();
  $("#counter-plate").prop("hidden", true);
  setFeedback("The counter is open. Serve the FRONT student first.");
  showScreen(null);
  handleArrival();          // the first student walks in right away
  startClock();
}

function backToMenu() {
  stopCharacterAudio();
  resetGame();
  $("#line").empty();
  $("#float-layer").empty();
  $("#counter-plate").prop("hidden", true);
  setFeedback("");
  updateDisplay();
  showScreen("menu");
}

$(function () {
  loadSprites();
  buildFoodButtons();
  fitStage();
  $(window).on("resize", fitStage);

  // --- Menu
  $(".mode-button").on("click", function () {
    selectedMode = $(this).data("mode");
    playSfx("tap");
    updateModeButtons();
  });

  $("#start-shift").on("click", function () {
    playSfx("tap");
    if (!tutorialSeen) {
      // First shift: show How to Play once, then start.
      tutorialSeen = true;
      startAfterHowTo = true;
      $("#howto-close").text("Start Shift");
      showScreen("howto");
    } else {
      beginShift();
    }
  });

  $("#open-howto").on("click", function () {
    startAfterHowTo = false;
    $("#howto-close").text("Got it");
    showScreen("howto");
  });

  $("#howto-close").on("click", function () {
    playSfx("tap");
    if (startAfterHowTo) {
      startAfterHowTo = false;
      beginShift();
    } else {
      showScreen("menu");
    }
  });

  // --- Serving
  $("#food-bar").on("click", ".food-button", function () {
    handleServe($(this).data("food"));
  });

  $(document).on("keydown", function (event) {
    const index = ["1", "2", "3", "4"].indexOf(event.key);
    if (index !== -1 && index < FOODS.length) handleServe(FOODS[index].id);
  });

  // --- Restart, reset and sound
  $("#restart-shift, #play-again").on("click", function () {
    beginShift();
  });

  $("#reset-game, #back-to-menu").on("click", function () {
    backToMenu();
  });

  $(".sound-toggle").on("click", function () {
    soundOn = !soundOn;
    updateSoundButtons();
    if (soundOn) {
      playSfx("tap");
      syncFrontAudio();
    } else {
      stopCharacterAudio();
    }
  });

  updateModeButtons();
  updateSoundButtons();
  updateDisplay();
  showScreen("menu");
});
