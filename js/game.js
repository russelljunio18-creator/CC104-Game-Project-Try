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

function peekCustomer() {
  if (queue.length === 0) {
    return null;
  }

  return queue[0];
}

function updateDisplay() {
  const waitingLine = document.getElementById("waiting-line");
  waitingLine.textContent = "";

  for (const customer of queue) {
    const card = document.createElement("li");
    card.className = "student-card";
    card.textContent = "Student #" + customer.number;
    waitingLine.appendChild(card);
  }

  document.getElementById("waiting-count").textContent = queue.length;

  const nextCustomer = peekCustomer();

  if (nextCustomer === null) {
    document.getElementById("next-student").textContent = "None";
  } else {
    document.getElementById("next-student").textContent =
      "#" + nextCustomer.number;
  }

  document.getElementById("served-count").textContent = servedCount;
}

document.getElementById("add-student").addEventListener("click", function () {
  enqueueCustomer();
  updateDisplay();
});

updateDisplay();