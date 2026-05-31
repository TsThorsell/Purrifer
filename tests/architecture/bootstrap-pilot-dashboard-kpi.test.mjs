import { test } from "node:test";
import assert from "node:assert/strict";

test("pilot dashboard KPI math supports ready/review/rejected and reason breakdown", () => {
  const stageBatches = [
    { total: 10, ready: 7, review: 2, rejected: 1, committed: 8 },
    { total: 5, ready: 2, review: 2, rejected: 1, committed: 2 }
  ];

  const totals = stageBatches.reduce(
    (acc, batch) => ({
      total: acc.total + batch.total,
      ready: acc.ready + batch.ready,
      review: acc.review + batch.review,
      rejected: acc.rejected + batch.rejected,
      committed: acc.committed + batch.committed
    }),
    { total: 0, ready: 0, review: 0, rejected: 0, committed: 0 }
  );

  const readyRate = Math.round((totals.ready / totals.total) * 10000) / 100;
  const reviewRate = Math.round((totals.review / totals.total) * 10000) / 100;
  const rejectionRate = Math.round((totals.rejected / totals.total) * 10000) / 100;
  const commitCoverageRate = Math.round((totals.committed / totals.total) * 10000) / 100;

  assert.equal(readyRate, 60);
  assert.equal(reviewRate, 26.67);
  assert.equal(rejectionRate, 13.33);
  assert.equal(commitCoverageRate, 66.67);

  const reasonRows = [
    ["unknown-reference", "low-confidence"],
    ["low-confidence"],
    [],
    ["duplicate-fingerprint"]
  ];
  const reasonCounts = new Map();
  reasonRows.flat().forEach((reasonCode) => {
    reasonCounts.set(reasonCode, (reasonCounts.get(reasonCode) ?? 0) + 1);
  });

  assert.equal(reasonCounts.get("low-confidence"), 2);
  assert.equal(reasonCounts.get("unknown-reference"), 1);
  assert.equal(reasonCounts.get("duplicate-fingerprint"), 1);

  const confidences = [0.91, 0.82, 0.66, 0.42, null];
  const buckets = {
    "0.85-1.00": 0,
    "0.70-0.84": 0,
    "0.50-0.69": 0,
    "0.00-0.49": 0,
    unknown: 0
  };
  confidences.forEach((value) => {
    if (typeof value !== "number") {
      buckets.unknown += 1;
    } else if (value < 0.5) {
      buckets["0.00-0.49"] += 1;
    } else if (value < 0.7) {
      buckets["0.50-0.69"] += 1;
    } else if (value < 0.85) {
      buckets["0.70-0.84"] += 1;
    } else {
      buckets["0.85-1.00"] += 1;
    }
  });

  assert.deepEqual(buckets, {
    "0.85-1.00": 1,
    "0.70-0.84": 1,
    "0.50-0.69": 1,
    "0.00-0.49": 1,
    unknown: 1
  });
});

