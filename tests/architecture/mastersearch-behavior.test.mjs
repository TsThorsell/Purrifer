import { test } from "node:test";
import assert from "node:assert/strict";

function rebuildIndex(objects) {
  return objects.map((item) => ({
    objectType: item.objectType,
    objectId: item.objectId,
    title: item.title,
    summary: item.summary,
    matchedText: `${item.title} ${item.summary} ${item.objectId}`.toLowerCase(),
    targetRoute: item.targetRoute
  }));
}

function searchAll(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return index.filter((row) => row.matchedText.includes(q));
}

function toNavigationTarget(result) {
  return {
    route: result.targetRoute,
    objectType: result.objectType,
    objectId: result.objectId
  };
}

test("mastersearch mvp returns multi-type hits, clickable target and rebuild refresh", () => {
  const datasetA = [
    { objectType: "document", objectId: "D1", title: "Hyra kvitto", summary: "Dokument", targetRoute: "document-inbox" },
    { objectType: "voucher", objectId: "V1", title: "Hyra verifikat", summary: "Verifikat full", targetRoute: "vouchers" },
    { objectType: "supplier-invoice", objectId: "I1", title: "Acme AB", summary: "Faktura unpaid", targetRoute: "invoice-and-payment" },
    { objectType: "payment-event", objectId: "P1", title: "Bankbetalning", summary: "Betalning 1000", targetRoute: "invoice-and-payment" },
    { objectType: "obligation", objectId: "O1", title: "Moms juni", summary: "Atagande active", targetRoute: "obligations-and-cases" },
    { objectType: "case", objectId: "C1", title: "Moms avvikelse", summary: "Arende new", targetRoute: "obligations-and-cases" }
  ];

  const indexA = rebuildIndex(datasetA);
  const hitsA = searchAll(indexA, "hyra");
  assert.equal(hitsA.length, 2);
  assert.equal(new Set(hitsA.map((item) => item.objectType)).size, 2);

  const nav = toNavigationTarget(hitsA[0]);
  assert.equal(typeof nav.route, "string");
  assert.equal(typeof nav.objectId, "string");

  const datasetB = [
    { objectType: "document", objectId: "D2", title: "Elnatskvitto", summary: "Dokument", targetRoute: "document-inbox" }
  ];
  const indexB = rebuildIndex(datasetB);
  const hitsBefore = searchAll(indexA, "elnatskvitto");
  const hitsAfter = searchAll(indexB, "elnatskvitto");

  assert.equal(hitsBefore.length, 0);
  assert.equal(hitsAfter.length, 1);
  assert.equal(hitsAfter[0].objectId, "D2");
});
