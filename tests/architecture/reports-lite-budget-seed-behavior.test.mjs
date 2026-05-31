import { test } from "node:test";
import assert from "node:assert/strict";

const SEEDED_STANDARD_CATEGORIES = [
  { key: "insurance", label: "Forsakring" },
  { key: "drift-energi", label: "Drift och energi" },
  { key: "lokal-hyra", label: "Lokal och hyra" },
  { key: "ovrigt", label: "Ovriga kostnader" }
];

test("reports-lite budget seed contains minimal standard categories", () => {
  assert.equal(SEEDED_STANDARD_CATEGORIES.length, 4);
  assert.deepEqual(SEEDED_STANDARD_CATEGORIES.map((entry) => entry.key), [
    "insurance",
    "drift-energi",
    "lokal-hyra",
    "ovrigt"
  ]);
  assert.equal(SEEDED_STANDARD_CATEGORIES.every((entry) => entry.label.length > 0), true);
});
