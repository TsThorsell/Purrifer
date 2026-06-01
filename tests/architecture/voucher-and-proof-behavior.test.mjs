import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const featureRoot = path.join(root, "src", "features", "voucher-and-proof");

function readFeatureSource(relativePath) {
  return readFileSync(path.join(featureRoot, relativePath), "utf8");
}

function readSharedSource(relativePath) {
  return readFileSync(path.join(root, "src", "app", "shared", "storage", relativePath), "utf8");
}

const contractSource = readFeatureSource("contracts.ts");
const mainHostSource = readFeatureSource(path.join("main", "mainHost.ts"));
const preloadHostSource = readFeatureSource(path.join("preload", "preloadHost.ts"));
const serviceSource = readFeatureSource(path.join("main", "VoucherAndProofService.ts"));
const repositorySource = readFeatureSource(path.join("main", "JsonVoucherRepository.ts"));
const pageSource = readFeatureSource(path.join("renderer", "VoucherAndProofPage.tsx"));
const dbSource = readSharedSource("SqliteDatabase.ts");

test("voucher-and-proof contracts expose PP-018 API", () => {
  assert.ok(contractSource.includes("VoucherDocumentRelation"), "Contract should export voucher document relation model");
  assert.ok(contractSource.includes("VoucherStatusHistoryEntry"), "Contract should export status history model");
  assert.ok(contractSource.includes("VoucherProofChainLink"), "Contract should export proof chain model");
  assert.ok(contractSource.includes("listVoucherRelations"), "Contract should expose listVoucherRelations");
  assert.ok(contractSource.includes("linkVoucherToDocument"), "Contract should expose linkVoucherToDocument");
  assert.ok(contractSource.includes("getVoucherStatusHistory"), "Contract should expose getVoucherStatusHistory");
  assert.ok(contractSource.includes("getVoucherProofChain"), "Contract should expose getVoucherProofChain");
});

test("voucher-and-proof main/preload hosts expose PP-018 IPC methods", () => {
  assert.ok(mainHostSource.includes("voucherAndProofChannels.listVoucherRelations"), "Main host should map listVoucherRelations channel");
  assert.ok(mainHostSource.includes("voucherAndProofChannels.linkVoucherToDocument"), "Main host should map linkVoucherToDocument channel");
  assert.ok(mainHostSource.includes("voucherAndProofChannels.getVoucherStatusHistory"), "Main host should map getVoucherStatusHistory channel");
  assert.ok(mainHostSource.includes("voucherAndProofChannels.getVoucherProofChain"), "Main host should map getVoucherProofChain channel");

  assert.ok(preloadHostSource.includes("listVoucherRelations"), "Preload host should expose listVoucherRelations method");
  assert.ok(preloadHostSource.includes("linkVoucherToDocument"), "Preload host should expose linkVoucherToDocument method");
  assert.ok(preloadHostSource.includes("getVoucherStatusHistory"), "Preload host should expose getVoucherStatusHistory method");
  assert.ok(preloadHostSource.includes("getVoucherProofChain"), "Preload host should expose getVoucherProofChain method");
});

test("voucher-and-proof service enforces PP-018 relation/state rules", () => {
  assert.ok(serviceSource.includes("BUSINESS_VOUCHER_PRIMARY_LINK_EXISTS"), "Service should guard duplicate primary source links");
  assert.ok(serviceSource.includes("BUSINESS_VOUCHER_DOCUMENT_LINK_DUPLICATE"), "Service should reject duplicate document relation");
  assert.ok(serviceSource.includes("insertStatusHistory"), "Service should persist status history entries");
  assert.ok(serviceSource.includes("setVoucherVerificationStatus"), "Service should support status transitions");
});

test("voucher-and-proof repository includes relation/history/proof persistence", () => {
  assert.ok(repositorySource.includes("voucher_document_relations"), "Repository should use voucher-document relation table");
  assert.ok(repositorySource.includes("voucher_status_history"), "Repository should use voucher status history table");
  assert.ok(repositorySource.includes("listVoucherProofChain"), "Repository should expose proof-chain query");
  assert.ok(repositorySource.includes("INSERT INTO voucher_status_history"), "Repository should insert status history rows");
});

test("voucher-and-proof migration registers voucher relation and history schema", () => {
  assert.ok(dbSource.includes("voucher_document_relations"), "Migration should create relation table");
  assert.ok(dbSource.includes("voucher_status_history"), "Migration should create history table");
  assert.ok(dbSource.includes("INSERT INTO schema_version(version) VALUES (23)"), "Migration should register schema version 23");
  assert.ok(dbSource.includes("ux_voucher_document_relations_primary_by_voucher"), "Migration should enforce single primary relation per voucher");
});

test("voucher-and-proof UI includes relation and proof sections for traceability", () => {
  assert.ok(pageSource.includes("Relaterade dokument"), "UI should render related documents section");
  assert.ok(pageSource.includes("Statushistorik"), "UI should render status history section");
  assert.ok(pageSource.includes("Beviskedja"), "UI should render proof chain section");
  assert.ok(pageSource.includes("linkVoucherToDocument"), "UI should call linkVoucherToDocument action");
});
