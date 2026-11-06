let queue = [];
let nextQueueNumber = 1;
let servedCount = 0;

function enqueueCustomer() {
  if (servedCount >= 10) {
    return null;
  }

  const customer = { number: nextQueueNumber };
  queue.push(customer);
  nextQueueNumber++;

  return customer;
}

function dequeueCustomer() {
  if (queue.length === 0 || servedCount >= 10) {
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
}

$(function () {
  $("#add-student").on("click", function () {
    enqueueCustomer();
    updateDisplay();
  });

  updateDisplay();
});