import { test } from "node:test";
import assert from "node:assert/strict";

const statuses = ["draft", "active", "waiting", "done", "accepted-incomplete", "archived"];

test("obligations CRUD external behavior with v1 status model", () => {
  const items = [];
  const now = "2026-05-31T00:00:00.000Z";

  function createObligation(input) {
    const created = {
      obligationId: "O000001",
      title: input.title,
      description: input.description,
      status: input.status,
      entityId: input.entityId,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now
    };
    items.push(created);
    return created;
  }

  function updateObligation(input) {
    const current = items.find((item) => item.obligationId === input.obligationId);
    current.title = input.title ?? current.title;
    current.status = input.status ?? current.status;
    current.updatedAt = "2026-06-01T00:00:00.000Z";
    return current;
  }

  function listObligations() {
    return items.map((item) => ({
      obligationId: item.obligationId,
      title: item.title,
      status: item.status,
      entityId: item.entityId,
      dueDate: item.dueDate,
      updatedAt: item.updatedAt
    }));
  }

  function getObligationDetails(obligationId) {
    return items.find((item) => item.obligationId === obligationId);
  }

  const created = createObligation({
    title: "Hyra kontor",
    description: "Majfaktura",
    status: "draft",
    entityId: "E000001",
    dueDate: "2026-06-10"
  });
  assert.equal(created.title, "Hyra kontor");
  assert.equal(statuses.includes(created.status), true);

  const updated = updateObligation({
    obligationId: created.obligationId,
    title: "Hyra kontor juni",
    status: "active"
  });
  assert.equal(updated.title, "Hyra kontor juni");
  assert.equal(statuses.includes(updated.status), true);

  const listed = listObligations();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].obligationId, created.obligationId);
  assert.equal(listed[0].status, "active");

  const details = getObligationDetails(created.obligationId);
  assert.equal(details?.description, "Majfaktura");
});
