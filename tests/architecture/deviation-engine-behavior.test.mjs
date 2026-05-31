import { test } from "node:test";
import assert from "node:assert/strict";

test("deviation scan creates v1 deviation cases per rule and deduplicates", () => {
  const nowIso = "2026-06-01T08:00:00.000Z";
  const dueSoonWindowEnd = "2026-06-08";

  const obligations = [
    { obligationId: "O000001", title: "Moms Q2", dueDate: "2026-06-05", status: "active" },
    { obligationId: "O000002", title: "Arsavgift", dueDate: "2026-05-20", status: "active" }
  ];
  const inboxItems = [
    { documentId: "D000001", fileName: "kvitto.pdf", receivedAt: "2026-05-31T10:00:00.000Z" }
  ];
  const paidEntities = new Set();

  const deviations = [];
  const createdCases = [];

  function isDueSoon(obligation) {
    return obligation.dueDate >= "2026-06-01" && obligation.dueDate <= dueSoonWindowEnd;
  }

  function isOverdueUnpaid(obligation) {
    return obligation.dueDate < "2026-06-01" && !paidEntities.has(obligation.entityId);
  }

  function ensureDeviation(rule, sourceType, sourceId, caseTitle) {
    const existing = deviations.find(
      (item) => item.rule === rule && item.sourceType === sourceType && item.sourceId === sourceId
    );
    if (existing) {
      return null;
    }
    const caseId = `DC${String(createdCases.length + 1).padStart(6, "0")}`;
    createdCases.push({ caseId, title: caseTitle, status: "new" });
    deviations.push({
      caseId,
      rule,
      sourceType,
      sourceId,
      detectedAt: nowIso
    });
    return caseId;
  }

  function runScan() {
    const createdCaseIds = [];

    for (const obligation of obligations) {
      if (isDueSoon(obligation)) {
        const id = ensureDeviation("due-soon", "obligation", obligation.obligationId, "Forfallodatum narmar sig");
        if (id) createdCaseIds.push(id);
      }
      if (isOverdueUnpaid(obligation)) {
        const id = ensureDeviation(
          "overdue-unpaid",
          "obligation",
          obligation.obligationId,
          "Betalning saknas efter forfallodatum"
        );
        if (id) createdCaseIds.push(id);
      }
    }

    for (const inboxItem of inboxItems) {
      const id = ensureDeviation("inbox-no-action", "inbox-item", inboxItem.documentId, "Dokument utan atgard");
      if (id) createdCaseIds.push(id);
    }

    return {
      createdCount: createdCaseIds.length,
      createdCaseIds
    };
  }

  const firstRun = runScan();
  assert.equal(firstRun.createdCount, 3);
  assert.equal(new Set(firstRun.createdCaseIds).size, 3);

  const secondRun = runScan();
  assert.equal(secondRun.createdCount, 0);
  assert.equal(createdCases.length, 3);

  const rules = deviations.map((item) => item.rule);
  assert.equal(rules.includes("due-soon"), true);
  assert.equal(rules.includes("overdue-unpaid"), true);
  assert.equal(rules.includes("inbox-no-action"), true);
});
