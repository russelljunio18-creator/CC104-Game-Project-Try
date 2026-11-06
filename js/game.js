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