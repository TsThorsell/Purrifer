import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

const root = process.cwd();
const featureRoot = path.join(root, "src", "features", "invoice-and-payment");

function readFeatureSource(relativePath) {
  return readFileSync(path.join(featureRoot, relativePath), "utf8");
}

function readSharedSource(relativePath) {
  return readFileSync(path.join(root, "src", "app", "shared", "storage", relativePath), "utf8");
}

const contractSource = readFeatureSource("contracts.ts");
const mainHostSource = readFeatureSource(path.join("main", "mainHost.ts"));
const preloadHostSource = readFeatureSource(path.join("preload", "preloadHost.ts"));
const serviceSource = readFeatureSource(path.join("main", "InvoiceAndPaymentService.ts"));
const pageSource = readFeatureSource(path.join("renderer", "InvoiceAndPaymentPage.tsx"));
const dbSource = readSharedSource("SqliteDatabase.ts");

test("invoice-and-payment contracts contain PP-015 API surface", () => {
  assert.ok(contractSource.includes("listInvoicePaymentHistory"), "Expected listInvoicePaymentHistory in contracts");
  assert.ok(contractSource.includes("acknowledgeInvoiceDeviation"), "Expected acknowledgeInvoiceDeviation in contracts");
  assert.ok(contractSource.includes("matchPaymentToInvoice(input"), "Expected matchPaymentToInvoice(input) signature");
  assert.ok(contractSource.includes("PaymentMatchHistory"), "Expected PaymentMatchHistory in contract exports");
});

test("invoice-and-payment main/preload hosts expose PP-015 channels", () => {
  assert.ok(mainHostSource.includes("invoiceAndPaymentChannels.listInvoicePaymentHistory"), "Main host must expose listInvoicePaymentHistory");
  assert.ok(mainHostSource.includes("invoiceAndPaymentChannels.acknowledgeInvoiceDeviation"), "Main host must expose acknowledgeInvoiceDeviation");
  assert.ok(preloadHostSource.includes("listInvoicePaymentHistory"), "Preload host must expose listInvoicePaymentHistory");
  assert.ok(preloadHostSource.includes("acknowledgeInvoiceDeviation"), "Preload host must expose acknowledgeInvoiceDeviation");
});

test("invoice-and-payment service logs and exposes match history actions", () => {
  assert.ok(serviceSource.includes("invoice_payment_activity_log"), "Service should write match history");
  assert.ok(serviceSource.includes("matchPaymentToInvoice(input"), "Service must implement matchPaymentToInvoice");
  assert.ok(serviceSource.includes("acknowledgeInvoiceDeviation(input"), "Service must implement deviation acknowledgement");
});

test("invoice-and-payment migration includes invoice/payment activity log table", () => {
  assert.ok(dbSource.includes("invoice_payment_activity_log"), "Migration source should include activity log table");
  assert.ok(dbSource.includes("INSERT INTO schema_version(version) VALUES (21)"), "Migration should register version 21");
  assert.ok(dbSource.includes("ix_invoice_payment_activity_log_action"), "Migration should include action index");
});

test("invoice-and-payment UI contains deviation workflow elements", () => {
  assert.ok(pageSource.includes("Avvikelseanteckning"), "UI should render deviation note workflow");
  assert.ok(pageSource.includes("acknowledgeDeviation"), "UI should call acknowledgeDeviation handler");
  assert.ok(pageSource.includes("Händelselogg"), "UI should render activity history list");
  assert.equal(pageSource.includes(")}→"), false, "Status delta formatting should not contain malformed syntax");
});

