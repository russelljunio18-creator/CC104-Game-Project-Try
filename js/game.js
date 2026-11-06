let queue = [];
let nextQueueNumber = 1;
let servedCount = 0;
let lastServedCustomer = null;
const SERVED_TARGET = 10;

// Cosmetic profiles repeat; the unique queue number still identifies each student.
const STUDENT_NAMES = ["Bisaya", "Baron", "Busseng", "Insan", "Neneng B"];
const STUDENT_MOODS = [
  "May saging kayo?",
  "Nasaan ang sabaw?!",
  "Walang kanen busseng??",
  "Mekus mekus mo na 'yan insan",
  "'Ma ano ulam?"
];

function customerLabel(customer) {
  return STUDENT_NAMES[(customer.number - 1) % STUDENT_NAMES.length] + " #" + customer.number;
}

function portraitClass(customer) {
  return "student-portrait portrait-" + ((customer.number - 1) % STUDENT_MOODS.length);
}

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
  queue = [];
  nextQueueNumber = 1;
  servedCount = 0;
  lastServedCustomer = null;
}

function updateDisplay() {
  $("#waiting-line").empty();

  for (const customer of queue) {
    const card = $("<li>");
    card.addClass("student-card list-group-item");
    const portrait = $("<span>").addClass(portraitClass(customer)).attr("aria-hidden", "true");
    const details = $("<div>").addClass("student-details");
    $("<span>").addClass("student-name")
      .text(STUDENT_NAMES[(customer.number - 1) % STUDENT_NAMES.length]).appendTo(details);
    $("<span>").addClass("student-number").text("Student #" + customer.number).appendTo(details);
    $("<span>").addClass("student-mood")
      .text(STUDENT_MOODS[(customer.number - 1) % STUDENT_MOODS.length]).appendTo(details);
    card.append(portrait, details);
    $("#waiting-line").append(card);
  }

  $("#waiting-count").text(queue.length);
  $("#waiting-empty").prop("hidden", queue.length > 0);

  const nextCustomer = peekCustomer();

  $("#peek-portrait, #peek-dialogue").prop("hidden", nextCustomer === null);
  if (nextCustomer === null) {
    $("#next-student").text("None");
    $("#peek-portrait").attr("class", "student-portrait");
    $("#peek-dialogue").text("");
  } else {
    $("#next-student").text(customerLabel(nextCustomer));
    $("#peek-portrait").attr("class", portraitClass(nextCustomer));
    $("#peek-dialogue").text(STUDENT_MOODS[(nextCustomer.number - 1) % STUDENT_MOODS.length]);
  }

  $("#served-count").text(servedCount);
  $("#last-served").text(lastServedCustomer === null
    ? "None" : customerLabel(lastServedCustomer));

  $("#served-portrait").prop("hidden", lastServedCustomer === null);
  if (lastServedCustomer !== null) {
    $("#served-portrait").attr("class", portraitClass(lastServedCustomer));
  }
  $("#served-joke").text(lastServedCustomer === null
    ? "The tray is ready. The students? Debatable."
    : STUDENT_MOODS[(lastServedCustomer.number - 1) % STUDENT_MOODS.length]);

  const completed = servedCount >= SERVED_TARGET;
  $("#add-student, #serve-student").prop("disabled", completed);
  $("#feedback-message").toggleClass("game-complete", completed);
}

$(function () {
  $("#add-student").on("click", function () {
    const customer = enqueueCustomer();
    if (customer !== null) {
      $("#feedback-message").text(customerLabel(customer) + " joined the back of the line.");
    }
    updateDisplay();
  });

  $("#serve-student").on("click", function () {
    const customer = dequeueCustomer();
    if (customer === null) {
      // The data layer also guards completion, even if called without a button.
      if (servedCount < SERVED_TARGET) {
        $("#feedback-message").text("No students waiting. Add a student first.");
      }
    } else {
      lastServedCustomer = customer;
      $("#feedback-message").text(servedCount >= SERVED_TARGET
        ? "Success! You served 10 students. Lunch rush complete! Select Reset to play again."
        : "Served " + customerLabel(customer) + ". Enjoy your lunch!");
    }
    updateDisplay();
  });

  $("#reset-game").on("click", function () {
    resetGame();
    $("#feedback-message").text("");
    updateDisplay();
  });

  updateDisplay();
});