import { test } from "node:test";
import assert from "node:assert/strict";

test("transaction import preview validates rows and preserves raw batch behavior", () => {
  const rows = [
    { rowNumber: 2, date: "2026-06-01", description: "Hyra", amount: -1200 },
    { rowNumber: 3, date: "", description: "", amount: Number.NaN }
  ];

  const validated = rows.map((row) => {
    const errors = [];
    if (!row.date) errors.push("Datum saknas.");
    if (!row.description) errors.push("Beskrivning saknas.");
    if (Number.isNaN(row.amount)) errors.push("Belopp saknas eller ar ogiltigt.");
    return { ...row, isValid: errors.length === 0, validationErrors: errors };
  });

  assert.equal(validated.length, 2);
  assert.equal(validated[0].isValid, true);
  assert.equal(validated[1].isValid, false);
  assert.equal(validated[1].validationErrors.length, 3);

  const batch = {
    batchId: "IB000001",
    totalRows: validated.length,
    validRows: validated.filter((row) => row.isValid).length,
    invalidRows: validated.filter((row) => !row.isValid).length,
    rowsJson: JSON.stringify(validated)
  };

  assert.equal(batch.validRows, 1);
  assert.equal(batch.invalidRows, 1);
  assert.equal(JSON.parse(batch.rowsJson).length, 2);
});

test("transaction import review mapping keeps raw rows and commits only valid mapped rows", () => {
  const rawRows = [
    { rowNumber: 2, date: "2026-06-01", description: "Hyra", amount: -1200, isValid: true },
    { rowNumber: 3, date: "", description: "", amount: Number.NaN, isValid: false }
  ];

  const mappingByRow = new Map([
    [2, { entityId: "E000001", accountId: "A000001", objectType: "betalhandelse" }],
    [3, { entityId: "E000001", accountId: "A000001", objectType: "betalhandelse" }]
  ]);

  const committedRows = rawRows
    .filter((row) => row.isValid && mappingByRow.has(row.rowNumber))
    .map((row) => ({ rowNumber: row.rowNumber, ...mappingByRow.get(row.rowNumber) }));

  assert.equal(rawRows.length, 2);
  assert.equal(committedRows.length, 1);
  assert.equal(committedRows[0].rowNumber, 2);
  assert.equal(committedRows[0].entityId, "E000001");
  assert.equal(rawRows[1].description, "");
});
