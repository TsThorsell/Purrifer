import { test } from "node:test";
import assert from "node:assert/strict";

const obligationStatuses = ["draft", "active", "waiting", "done", "accepted-incomplete", "archived"];
const caseStatuses = ["new", "draft", "waiting", "done", "accepted-incomplete", "archived"];

test("case + checklist behavior requires obligation link and supports completion timestamp", () => {
  const obligations = [{ obligationId: "O000001", title: "Moms", status: "active" }];
  const cases = [];
  const checklist = [];

  function createCase(input) {
    if (!input.obligationId) {
      throw new Error("obligationId required");
    }
    const obligationExists = obligations.some((item) => item.obligationId === input.obligationId);
    if (!obligationExists) {
      throw new Error("obligation not found");
    }
    const created = {
      caseId: "C000001",
      obligationId: input.obligationId,
      title: input.title,
      status: input.status,
      createdAt: "2026-05-31T00:00:00.000Z",
      updatedAt: "2026-05-31T00:00:00.000Z"
    };
    cases.push(created);
    return created;
  }

  function createChecklistItem(input) {
    const caseExists = cases.some((item) => item.caseId === input.caseId);
    if (!caseExists) {
      throw new Error("case not found");
    }
    const item = {
      checklistItemId: "CL000001",
      caseId: input.caseId,
      label: input.label
    };
    checklist.push(item);
    return item;
  }

  function completeChecklistItem(input) {
    const item = checklist.find((entry) => entry.checklistItemId === input.checklistItemId);
    if (!item) {
      throw new Error("checklist not found");
    }
    item.completedAt = "2026-06-01T00:00:00.000Z";
    return item;
  }

  assert.throws(
    () => createCase({ title: "Deklaration", status: "new" }),
    /obligationId required/
  );
  assert.throws(
    () => createCase({ obligationId: "O000999", title: "Deklaration", status: "new" }),
    /obligation not found/
  );

  const createdCase = createCase({
    obligationId: "O000001",
    title: "Deklaration",
    status: "new"
  });
  assert.equal(caseStatuses.includes(createdCase.status), true);
  assert.equal(obligationStatuses.includes(obligations[0].status), true);

  const checklistItem = createChecklistItem({
    caseId: createdCase.caseId,
    label: "Samla underlag"
  });
  assert.equal(checklistItem.completedAt, undefined);

  const completed = completeChecklistItem({
    checklistItemId: checklistItem.checklistItemId
  });
  assert.match(completed.completedAt, /^2026-06-01/);
});

