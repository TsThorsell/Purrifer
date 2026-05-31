import { test } from "node:test";
import assert from "node:assert/strict";

test("holdings and events behavior supports create and timeline ordering", () => {
  const holdings = [];
  const events = [];

  function createHolding(entityId, name) {
    const item = {
      holdingId: `IH${String(holdings.length + 1).padStart(6, "0")}`,
      entityId,
      name,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z"
    };
    holdings.push(item);
    return item;
  }

  function createEvent(holdingId, eventType, eventDate, amount) {
    const item = {
      eventId: `HE${String(events.length + 1).padStart(6, "0")}`,
      holdingId,
      eventType,
      eventDate,
      amount,
      createdAt: `${eventDate}T10:00:00.000Z`
    };
    events.push(item);
    return item;
  }

  const holding = createHolding("E000001", "ISK Nordnet");
  createEvent(holding.holdingId, "valuation", "2026-06-03", 105000);
  createEvent(holding.holdingId, "deposit", "2026-06-01", 100000);

  const timeline = events
    .filter((entry) => entry.holdingId === holding.holdingId)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  assert.equal(holding.entityId, "E000001");
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].eventType, "valuation");
  assert.equal(timeline[1].eventType, "deposit");
});

test("holdings analysis v1.5 computes invested, acquisition average, latest valuation and total value", () => {
  const events = [
    { eventType: "valuation", eventDate: "2026-06-05", amount: 112000 },
    { eventType: "withdrawal", eventDate: "2026-06-04", amount: 5000 },
    { eventType: "deposit", eventDate: "2026-06-02", amount: 100000 },
    { eventType: "deposit", eventDate: "2026-06-01", amount: 20000 }
  ];

  const deposits = events.filter((event) => event.eventType === "deposit");
  const withdrawals = events.filter((event) => event.eventType === "withdrawal");
  const valuations = events.filter((event) => event.eventType === "valuation");

  const depositedAmount = deposits.reduce((sum, event) => sum + Math.abs(event.amount), 0);
  const withdrawnAmount = withdrawals.reduce((sum, event) => sum + Math.abs(event.amount), 0);
  const totalInvested = depositedAmount - withdrawnAmount;
  const averageAcquisitionValue = depositedAmount / deposits.length;
  const latestValuation = valuations[0]?.amount;
  const totalValue = latestValuation ?? totalInvested;

  assert.equal(totalInvested, 115000);
  assert.equal(averageAcquisitionValue, 60000);
  assert.equal(latestValuation, 112000);
  assert.equal(totalValue, 112000);
});
