import { test } from "node:test";
import assert from "node:assert/strict";

function deriveLandingDeviationView(items) {
  if (items.length === 0) {
    return { empty: true, rows: [] };
  }

  const rows = items.slice(0, 6).map((item) => ({
    caseId: item.caseId,
    rule: item.rule,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    status: item.status,
    priority: item.rule === "overdue-unpaid" ? "high" : item.rule === "due-soon" ? "medium" : "low"
  }));

  return { empty: false, rows };
}

function triggerDrilldown(item) {
  return {
    route: "obligations-and-cases",
    targetCaseId: item.caseId,
    targetSourceId: item.sourceId
  };
}

test("landing panel shows deviations, empty status, and drilldown target", () => {
  const sample = [
    {
      caseId: "DC000001",
      rule: "overdue-unpaid",
      sourceType: "obligation",
      sourceId: "O000001",
      status: "new"
    },
    {
      caseId: "DC000002",
      rule: "inbox-no-action",
      sourceType: "inbox-item",
      sourceId: "D000123",
      status: "new"
    }
  ];

  const withData = deriveLandingDeviationView(sample);
  assert.equal(withData.empty, false);
  assert.equal(withData.rows.length, 2);
  assert.equal(withData.rows[0].priority, "high");
  assert.equal(withData.rows[1].priority, "low");

  const empty = deriveLandingDeviationView([]);
  assert.equal(empty.empty, true);
  assert.equal(empty.rows.length, 0);

  const drilldown = triggerDrilldown(sample[0]);
  assert.equal(drilldown.route, "obligations-and-cases");
  assert.equal(drilldown.targetCaseId, "DC000001");
  assert.equal(drilldown.targetSourceId, "O000001");
});
