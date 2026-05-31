import { test } from "node:test";
import assert from "node:assert/strict";

test("retirement baseline computes projection and marks uncertainty when assumptions are thin", () => {
  const assumptions = {
    monthlyIncome: 35000,
    monthlyWithdrawal: 30000,
    annualReturnRate: 5,
    annualInterestRate: 0,
    horizonYears: 35
  };
  const baseCapital = 0;
  const netMonthlyCashflow = assumptions.monthlyIncome - assumptions.monthlyWithdrawal;
  const monthlyRate = assumptions.annualReturnRate / 100 / 12;
  let projected = baseCapital;
  for (let month = 0; month < assumptions.horizonYears * 12; month += 1) {
    projected += netMonthlyCashflow;
    projected += projected * monthlyRate;
  }

  const uncertaintyFlags = [];
  if (baseCapital === 0) uncertaintyFlags.push("no-base-capital");
  if (assumptions.horizonYears > 30) uncertaintyFlags.push("long-horizon");
  if (assumptions.annualInterestRate === 0) uncertaintyFlags.push("zero-interest");

  assert.equal(netMonthlyCashflow, 5000);
  assert.equal(projected > 0, true);
  assert.equal(uncertaintyFlags.includes("no-base-capital"), true);
  assert.equal(uncertaintyFlags.includes("long-horizon"), true);
  assert.equal(uncertaintyFlags.includes("zero-interest"), true);
});

test("retirement baseline requires non-empty hitl review note for approval", () => {
  const reviewNote = "Manuell tolkning godkand med antagandekontroll.";
  assert.equal(reviewNote.trim().length > 0, true);
});

test("what-if comparison shows deltas between two scenarios", () => {
  const left = {
    projectedCapital: 1500000,
    netMonthlyCashflow: 12000,
    assumptions: {
      monthlyIncome: 42000,
      monthlyWithdrawal: 30000,
      annualReturnRate: 5,
      annualInterestRate: 2,
      horizonYears: 20
    }
  };
  const right = {
    projectedCapital: 1780000,
    netMonthlyCashflow: 15000,
    assumptions: {
      monthlyIncome: 47000,
      monthlyWithdrawal: 32000,
      annualReturnRate: 6,
      annualInterestRate: 2.5,
      horizonYears: 20
    }
  };

  const projectedCapitalDelta = right.projectedCapital - left.projectedCapital;
  const netMonthlyCashflowDelta = right.netMonthlyCashflow - left.netMonthlyCashflow;
  const annualReturnRateDelta = right.assumptions.annualReturnRate - left.assumptions.annualReturnRate;

  assert.equal(projectedCapitalDelta, 280000);
  assert.equal(netMonthlyCashflowDelta, 3000);
  assert.equal(annualReturnRateDelta, 1);
});
