import { test } from "node:test";
import assert from "node:assert/strict";

const orderedTypes = [
  "document",
  "voucher",
  "supplier-invoice",
  "payment-event",
  "obligation",
  "case"
];

function prepareVisible(results, objectTypeFilter, sortMode) {
  const filtered = objectTypeFilter === "all" ? results : results.filter((item) => item.objectType === objectTypeFilter);
  const sorted = [...filtered];

  if (sortMode === "date") {
    sorted.sort((left, right) => {
      const leftDate = left.sortDate ?? "";
      const rightDate = right.sortDate ?? "";
      if (leftDate && rightDate) {
        return rightDate.localeCompare(leftDate);
      }
      if (leftDate) return -1;
      if (rightDate) return 1;
      return left.title.localeCompare(right.title, "sv");
    });
  }

  return sorted;
}

function groupResults(results) {
  return orderedTypes
    .map((type) => ({ type, items: results.filter((item) => item.objectType === type) }))
    .filter((group) => group.items.length > 0);
}

function toTarget(item) {
  return {
    route: item.targetRoute,
    objectType: item.objectType,
    objectId: item.objectId
  };
}

test("search grouping, filtering, sorting and drill-in target", () => {
  const input = [
    { objectType: "voucher", objectId: "V1", title: "Verifikat 1", sortDate: "2026-05-01", targetRoute: "vouchers" },
    { objectType: "document", objectId: "D1", title: "Dokument 1", sortDate: "2026-06-02", targetRoute: "document-inbox" },
    { objectType: "case", objectId: "C1", title: "Arende 1", targetRoute: "obligations-and-cases" },
    { objectType: "document", objectId: "D2", title: "Dokument 2", sortDate: "2026-05-20", targetRoute: "document-inbox" }
  ];

  const groupedAll = groupResults(prepareVisible(input, "all", "relevance"));
  assert.deepEqual(groupedAll.map((group) => group.type), ["document", "voucher", "case"]);
  assert.equal(groupedAll[0].items.length, 2);

  const filtered = prepareVisible(input, "document", "relevance");
  assert.equal(filtered.length, 2);
  assert.equal(filtered.every((item) => item.objectType === "document"), true);

  const sortedByDate = prepareVisible(input, "all", "date");
  assert.equal(sortedByDate[0].objectId, "D1");
  assert.equal(sortedByDate[1].objectId, "D2");

  const target = toTarget(input[0]);
  assert.equal(target.route, "vouchers");
  assert.equal(target.objectType, "voucher");
  assert.equal(target.objectId, "V1");
});
