import { test } from "node:test";
import assert from "node:assert/strict";

function createEntity(name, type) {
  const normalizedName = String(name).trim();
  if (!normalizedName) {
    throw new Error("BUSINESS_ENTITY_NAME_REQUIRED");
  }
  const entityId = `E${String((createEntity.counter += 1)).padStart(6, "0")}`;
  const item = { entityId, name: normalizedName, type };
  entities.push(item);
  return item;
}
createEntity.counter = 0;

function updateEntity(entityId, nextName, nextType) {
  const current = entities.find((entry) => entry.entityId === entityId);
  if (!current) {
    throw new Error("BUSINESS_ENTITY_NOT_FOUND");
  }
  if (nextName !== undefined) {
    const normalizedName = String(nextName).trim();
    if (!normalizedName) {
      throw new Error("BUSINESS_ENTITY_NAME_REQUIRED");
    }
    current.name = normalizedName;
  }
  if (nextType !== undefined) {
    current.type = nextType;
  }
  return current;
}

function listEntities(input = {}) {
  return entities.filter((entry) => {
    if (input.type && entry.type !== input.type) {
      return false;
    }
    if (input.query && !entry.name.toLowerCase().includes(String(input.query).toLowerCase())) {
      return false;
    }
    return true;
  });
}

function createRelation(ownerId, targetId, sharePercent) {
  if (!ownerId || !targetId || ownerId === targetId) {
    throw new Error("BUSINESS_OWNERSHIP_SELF_REFERENCE");
  }
  if (!(sharePercent > 0 && sharePercent <= 100)) {
    throw new Error("BUSINESS_OWNERSHIP_SHARE_INVALID");
  }
  const total = relations
    .filter((entry) => entry.targetEntityId === targetId)
    .reduce((acc, entry) => acc + entry.sharePercent, 0);
  if (total + sharePercent > 100) {
    throw new Error("BUSINESS_OWNERSHIP_SHARE_EXCEEDED");
  }
  const relation = {
    relationId: `R${String((createRelation.counter += 1)).padStart(6, "0")}`,
    ownerEntityId: ownerId,
    targetEntityId: targetId,
    sharePercent
  };
  relations.push(relation);
  return relation;
}
createRelation.counter = 0;

const entities = [];
const relations = [];

test("entity registry validation supports create, update and filter", () => {
  const person = createEntity("Anders AB", "person");
  const company = createEntity("Ninja Invest", "aktiebolag");

  const updated = updateEntity(person.entityId, "Anders Aktiebolag", "aktiebolag");
  assert.equal(updated.name, "Anders Aktiebolag");

  const filteredByType = listEntities({ type: "aktiebolag" });
  assert.equal(filteredByType.length, 2);

  const filteredByText = listEntities({ query: "Ninja" });
  assert.equal(filteredByText.length, 1);
  assert.equal(filteredByText[0].entityId, company.entityId);
});

test("entity registry relation rules prevent inconsistent ownership", () => {
  const owner = createEntity("Eget bolag", "person");
  const target = createEntity("Barnbolaget", "aktiebolag");

  createRelation(owner.entityId, target.entityId, 60);
  const second = createRelation(owner.entityId, target.entityId, 40);
  assert.equal(second.sharePercent, 40);

  assert.throws(() => createRelation(target.entityId, owner.entityId, 0), {
    message: "BUSINESS_OWNERSHIP_SHARE_INVALID"
  });
  assert.throws(() => createRelation(owner.entityId, owner.entityId, 10), {
    message: "BUSINESS_OWNERSHIP_SELF_REFERENCE"
  });
  assert.throws(() => createRelation(target.entityId, target.entityId, 1), {
    message: "BUSINESS_OWNERSHIP_SELF_REFERENCE"
  });
});

