import { test } from "node:test";
import assert from "node:assert/strict";

function budgetVsActual(row) {
  const varianceAmount = row.actualAmount - row.budgetAmount;
  const variancePercent = row.budgetAmount !== 0 ? (varianceAmount / Math.abs(row.budgetAmount)) * 100 : 0;
  return { ...row, varianceAmount, variancePercent };
}

function yearOverYear(currentAmount, previousAmount) {
  const deltaAmount = currentAmount - previousAmount;
  const deltaPercent = previousAmount !== 0 ? (deltaAmount / Math.abs(previousAmount)) * 100 : 0;
  return { deltaAmount, deltaPercent };
}

test("reports-lite budget/yoy calculations and uncertainty flag", () => {
  const budgetRow = budgetVsActual({ budgetAmount: 1000, actualAmount: 1200 });
  assert.equal(budgetRow.varianceAmount, 200);
  assert.equal(Math.round(budgetRow.variancePercent), 20);

  const yoy = yearOverYear(900, 1200);
  assert.equal(yoy.deltaAmount, -300);
  assert.equal(Math.round(yoy.deltaPercent), -25);

  const missingBudget = { uncertainty: "high", uncertaintyReason: "Budgetunderlag saknas for kategorin." };
  assert.equal(missingBudget.uncertainty, "high");
  assert.match(missingBudget.uncertaintyReason, /Budgetunderlag saknas/);
});
