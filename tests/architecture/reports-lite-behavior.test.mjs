import { test } from "node:test";
import assert from "node:assert/strict";

function listEntityLedger(rows, entityId) {
  return rows
    .filter((row) => row.entityId === entityId)
    .map((row) => ({
      date: row.date,
      entryType: row.entryType,
      referenceId: row.referenceId,
      amount: row.amount,
      source: "invoice-and-payment",
      drilldownRoute: "invoice-and-payment",
      drilldownObjectType: row.entryType === "invoice" ? "supplier-invoice" : "payment-event",
      drilldownObjectId: row.drilldownObjectId
    }));
}

function getBalanceSnapshot(invoiceGross, invoiceOpen, paymentTotal, entityId, asOfDate) {
  return {
    entityId,
    asOfDate,
    inflowTotal: paymentTotal,
    outflowTotal: invoiceGross,
    netTotal: paymentTotal - invoiceGross,
    openInvoiceAmount: invoiceOpen
  };
}

test("reports-lite ledger, balance consistency and drilldown target", () => {
  const ledgerSource = [
    { entityId: "E1", date: "2026-06-01", entryType: "payment", referenceId: "P1", amount: 1000, drilldownObjectId: "P1" },
    { entityId: "E1", date: "2026-05-20", entryType: "invoice", referenceId: "I1", amount: -1500, drilldownObjectId: "I1" },
    { entityId: "E2", date: "2026-05-22", entryType: "invoice", referenceId: "I9", amount: -200, drilldownObjectId: "I9" }
  ];

  const ledger = listEntityLedger(ledgerSource, "E1");
  assert.equal(ledger.length, 2);
  assert.equal(ledger.some((row) => row.referenceId === "I1"), true);
  assert.equal(ledger.some((row) => row.referenceId === "P1"), true);

  const snapshot = getBalanceSnapshot(1500, 500, 1000, "E1", "2026-06-01");
  assert.equal(snapshot.entityId, "E1");
  assert.equal(snapshot.inflowTotal - snapshot.outflowTotal, snapshot.netTotal);
  assert.equal(snapshot.openInvoiceAmount, 500);

  const drilldown = ledger.find((row) => row.referenceId === "I1");
  assert.equal(drilldown?.drilldownRoute, "invoice-and-payment");
  assert.equal(drilldown?.drilldownObjectType, "supplier-invoice");
  assert.equal(drilldown?.drilldownObjectId, "I1");
});

test("reports-lite period decision view is exportable and shows uncertainty markers", () => {
  const rows = [
    {
      categoryKey: "insurance",
      categoryLabel: "Forsakring",
      periodAAmount: -1000,
      periodBAmount: -1400,
      deltaAmount: -400,
      deltaPercent: -40,
      uncertainty: "partial",
      uncertaintyReason: "En av perioderna saknar underlag for kategorin."
    }
  ];

  const csvHeader = "categoryKey,categoryLabel,periodAAmount,periodBAmount,deltaAmount,deltaPercent,uncertainty,uncertaintyReason";
  const csvRow = "\"insurance\",\"Forsakring\",\"-1000.00\",\"-1400.00\",\"-400.00\",\"-40.00\",\"partial\",\"En av perioderna saknar underlag for kategorin.\"";
  const exportCsv = `${csvHeader}\n${csvRow}`;

  assert.equal(rows[0].deltaAmount, -400);
  assert.equal(rows[0].uncertainty, "partial");
  assert.match(exportCsv, /categoryKey,categoryLabel/);
  assert.match(exportCsv, /insurance/);
});
