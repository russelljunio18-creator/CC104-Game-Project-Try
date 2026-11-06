let queue = [];
let nextQueueNumber = 1;
let servedCount = 0;
let lastServedCustomer = null;
const SERVED_TARGET = 10;

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
    card.text("Student #" + customer.number);
    $("#waiting-line").append(card);
  }

  $("#waiting-count").text(queue.length);

  const nextCustomer = peekCustomer();

  if (nextCustomer === null) {
    $("#next-student").text("None");
  } else {
    $("#next-student").text("#" + nextCustomer.number);
  }

  $("#served-count").text(servedCount);
  $("#last-served").text(lastServedCustomer === null
    ? "None" : "#" + lastServedCustomer.number);

  const completed = servedCount >= SERVED_TARGET;
  $("#add-student, #serve-student").prop("disabled", completed);
  $("#feedback-message").toggleClass("game-complete", completed);
}

$(function () {
  $("#add-student").on("click", function () {
    const customer = enqueueCustomer();
    if (customer !== null) {
      $("#feedback-message").text("Student #" + customer.number + " joined the back of the line.");
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
        : "Served student #" + customer.number + ". Enjoy your lunch!");
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