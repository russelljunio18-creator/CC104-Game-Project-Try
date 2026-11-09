/* =====================================================================
   Campus Canteen: Lunch Line

   This file has five parts:
     1. GAME DATA        - the queue and the counters
     2. CHARACTERS       - names, dialogue and sounds (cosmetic only)
     3. QUEUE LOGIC      - enqueue / dequeue / peek / reset (no screen code!)
     4. AUDIO            - one player, one clip at a time
     5. DISPLAY + EVENTS - jQuery draws the screen and listens for clicks

   The queue logic never touches the page. The display code only READS the
   data and draws it. That keeps the data structure easy to explain.
   ===================================================================== */


/* ---------- 1. GAME DATA ---------- */
let queue = [];              // index 0 is the FRONT of the line, the last index is the BACK
let nextQueueNumber = 1;     // the number the next arrival will get
let servedCount = 0;         // successful serves so far
let lastServedCustomer = null;
let servedCustomers = []; // Students seated at the lunch table, in serving order.
const SERVED_TARGET = 10;    // serve this many students to win

// Only used for the "pop in" animation of the newest card.
let lastAddedNumber = null;


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


/* ---------- 3. QUEUE LOGIC ---------- */
function enqueueCustomer() {
  if (servedCount >= SERVED_TARGET) {
    return null;
  }

  const customer = { number: nextQueueNumber };
  queue.push(customer);
  nextQueueNumber++;

  return customer;
}

function dequeueCustomer() {
  if (queue.length === 0 || servedCount >= SERVED_TARGET) {
    return null;
  }

  const customer = queue.shift();
  servedCount++;
  servedCustomers.push(customer);

  return customer;
}

function peekCustomer() {
  if (queue.length === 0) {
    return null;
  }

  return queue[0];
}

// Reset the data first; the click handler then redraws the interface.
function resetGame() {
  stopCharacterAudio();
  queue = [];
  nextQueueNumber = 1;
  servedCount = 0;
  lastServedCustomer = null;
  servedCustomers = [];
}


/* ---------- 4. AUDIO ---------- */
let audioPlaybackId = 0;
let speakingCustomerNumber = null;

function stopCharacterAudio() {
  audioPlaybackId++;
  speakingCustomerNumber = null;
  const audio = document.getElementById("character-audio");
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  $("#sound-status").text($("#sound-enabled").prop("checked")
    ? "The front student speaks when it is their turn." : "Character sounds are off.");
}

function playCharacterAudio(customer) {
  // One player speaks for the front student only.
  stopCharacterAudio();
  if (!$("#sound-enabled").prop("checked")) return;
  speakingCustomerNumber = customer.number;
  const profile = characterIndex(customer);
  const audio = document.getElementById("character-audio");
  const playbackId = audioPlaybackId;
  audio.src = STUDENT_SOUNDS[profile];
  $("#sound-status").text(customerLabel(customer) + " is talking at the counter.");
  // Called from a player action when a new customer reaches the front.
  audio.play().catch(function (error) {
    if (playbackId === audioPlaybackId && error.name !== "AbortError") {
      $("#sound-status").text("Audio could not play. You can keep playing the game.");
    }
  });
}


// Adding behind the front does not restart or replace the current speaker.
// Keep this out of updateDisplay(): peek and rendering must remain read-only.
function syncFrontAudio() {
  const front = peekCustomer();
  if (!$("#sound-enabled").prop("checked") || front === null || servedCount >= SERVED_TARGET) {
    stopCharacterAudio();
    return;
  }
  if (speakingCustomerNumber !== front.number) playCharacterAudio(front);
}

/* ---------- 5. DISPLAY + EVENTS ---------- */

// Shows a message in the feedback box. kind is "ok" (green), "warn" (amber) or nothing (neutral).
function setFeedback(message, kind) {
  $("#feedback-message")
    .text(message)
    .removeClass("feedback-ok feedback-warn")
    .addClass(kind ? "feedback-" + kind : "");
}

// Builds one student card for the waiting line.
// isFront / isBack decide which tag(s) the card wears.
function buildStudentCard(customer, isFront, isBack) {
  const card = $("<li>").addClass("student-card card");
  if (isFront) card.addClass("is-front");
  if (isBack) card.addClass("is-back");
  if (customer.number === lastAddedNumber) card.addClass("is-new");

  // FRONT / BACK tags (a one-student line is both at the same time)
  if (isFront || isBack) {
    const tags = $("<span>").addClass("position-tags");
    if (isFront) $("<span>").addClass("badge rounded-pill position-tag tag-front").text("Front").appendTo(tags);
    if (isBack) $("<span>").addClass("badge rounded-pill position-tag tag-back").text("Back").appendTo(tags);
    card.append(tags);
  }

  const portrait = $("<span>").addClass(portraitClass(customer)).attr("aria-hidden", "true");
  const details = $("<div>").addClass("student-details");
  $("<span>").addClass("student-name")
    .text(STUDENT_NAMES[characterIndex(customer)]).appendTo(details);
  $("<span>").addClass("student-number").text("Student #" + customer.number).appendTo(details);
  $("<span>").addClass("student-mood")
    .text(STUDENT_MOODS[characterIndex(customer)]).appendTo(details);
  card.append(portrait, details);
  return card;
}

// Long lines scroll sideways. Show a hint only when something is off-screen.
function updateLaneHint() {
  const lane = document.getElementById("waiting-line");
  $("#lane-hint").prop("hidden", lane.scrollWidth <= lane.clientWidth + 1);
}

// Moves the scrollable line so the Front or the Back is in view.
function scrollLaneTo(end) {
  const lane = document.getElementById("waiting-line");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  lane.scrollTo({
    left: end === "back" ? lane.scrollWidth : 0,
    behavior: reduceMotion ? "auto" : "smooth"
  });
}

function updateDisplay() {
  // --- Waiting line: walk through the queue from front to back and draw a card for each student
  $("#waiting-line").empty();

  for (let i = 0; i < queue.length; i++) {
    const isFront = (i === 0);
    const isBack = (i === queue.length - 1);
    $("#waiting-line").append(buildStudentCard(queue[i], isFront, isBack));
  }

  $("#waiting-count").text(queue.length);
  $("#waiting-empty").prop("hidden", queue.length > 0);
  updateLaneHint();

  // --- Peek: the student at the front (never removed)
  const nextCustomer = peekCustomer();

  $("#peek-portrait, #peek-dialogue").prop("hidden", nextCustomer === null);
  $("#peek-placeholder").prop("hidden", nextCustomer !== null);
  if (nextCustomer === null) {
    $("#next-student").text("None");
    $("#peek-portrait").attr("class", "student-portrait");
    $("#peek-dialogue").text("");
  } else {
    $("#next-student").text(customerLabel(nextCustomer));
    $("#peek-portrait").attr("class", portraitClass(nextCustomer));
    $("#peek-dialogue").text(STUDENT_MOODS[characterIndex(nextCustomer)]);
  }

  // --- Service counter: the most recently served student
  $("#last-served").text(lastServedCustomer === null
    ? "None" : customerLabel(lastServedCustomer));

  $("#served-portrait").prop("hidden", lastServedCustomer === null);
  $("#served-placeholder").prop("hidden", lastServedCustomer !== null);
  if (lastServedCustomer !== null) {
    $("#served-portrait").attr("class", portraitClass(lastServedCustomer));
  }
  $("#served-joke").text(lastServedCustomer === null
    ? "The tray is ready. The students? Debatable."
    : STUDENT_MOODS[characterIndex(lastServedCustomer)]);

  // --- Lunch table: a separate history, never added back to the waiting queue.
  $("#lunch-guests").empty();
  for (const customer of servedCustomers) {
    const seat = $("<li>").addClass("lunch-seat");
    $("<span>").addClass(portraitClass(customer)).attr("aria-hidden", "true").appendTo(seat);
    $("<strong>").addClass("lunch-guest-name").text(customerLabel(customer)).appendTo(seat);
    $("<span>").addClass("lunch-plate").attr("aria-hidden", "true").text("🍛 🥄").appendTo(seat);
    $("<span>").addClass("lunch-status").text("Served · Enjoying lunch").appendTo(seat);
    seat.appendTo("#lunch-guests");
  }
  $("#lunch-empty").prop("hidden", servedCustomers.length > 0);
  $("#lunch-guests").prop("hidden", servedCustomers.length === 0);
  $("#lunch-count").text(servedCustomers.length);

  // --- Progress: counts, bar and success state
  const completed = servedCount >= SERVED_TARGET;
  $("#served-count").text(servedCount);
  $("#served-target").text(SERVED_TARGET);
  $("#served-progress-bar").css("width", (servedCount / SERVED_TARGET * 100) + "%");
  $("#served-progress-track")
    .attr("aria-valuenow", servedCount)
    .attr("aria-valuemax", SERVED_TARGET)
    .attr("aria-valuetext", servedCount + " of " + SERVED_TARGET + " students served");

  if (completed) {
    $("#progress-caption").text("Lunch rush complete!");
  } else if (servedCount === 0) {
    $("#progress-caption").text("Serve " + SERVED_TARGET + " students to finish the lunch rush.");
  } else {
    $("#progress-caption").text((SERVED_TARGET - servedCount) + " more to go!");
  }
  $("#progress-section").toggleClass("is-complete", completed);
  $("#success-banner").prop("hidden", !completed);

  // --- Controls: Add and Serve are off once the game is complete
  $("#add-student, #serve-student").prop("disabled", completed);
  $("#feedback-message").toggleClass("game-complete", completed);
}

$(function () {
  $("#add-student").on("click", function () {
    const customer = enqueueCustomer();
    if (customer !== null) {
      lastAddedNumber = customer.number;
      setFeedback(customerLabel(customer) + " joined the back of the line.", "ok");
      syncFrontAudio();
    }
    updateDisplay();
    if (customer !== null) scrollLaneTo("back");   // show the new arrival
  });

  $("#serve-student").on("click", function () {
    const customer = dequeueCustomer();
    if (customer === null) {
      // The data layer also guards completion, even if called without a button.
      if (servedCount < SERVED_TARGET) {
        setFeedback("No students waiting. Add a student first.", "warn");
      }
    } else {
      lastServedCustomer = customer;
      lastAddedNumber = null;
      setFeedback(servedCount >= SERVED_TARGET
        ? "Success! You served 10 students. Lunch rush complete! Select Reset to play again."
        : "Served " + customerLabel(customer) + ". Enjoy your lunch!", "ok");
    }
    updateDisplay();
    syncFrontAudio();
    if (customer !== null) scrollLaneTo("front");  // the next student is now at the front
  });

  $("#sound-enabled").on("change", function () {
    if (!this.checked) stopCharacterAudio();
    else syncFrontAudio();
  });

  $("#reset-game").on("click", function () {
    resetGame();
    lastAddedNumber = null;
    setFeedback("");
    updateDisplay();
  });

  // The "scroll sideways" hint depends on the window width.
  $(window).on("resize", updateLaneHint);

  updateDisplay();
});
