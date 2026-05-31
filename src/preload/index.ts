import { contextBridge, ipcRenderer } from "electron";
import { documentInboxChannels, type DocumentInboxApi } from "@features/document-inbox/contracts";
import { documentReviewChannels, type DocumentReviewApi } from "@features/document-review/contracts";
import { entityRegistryChannels, type EntityRegistryApi } from "@features/entity-registry/contracts";
import {
  invoiceAndPaymentChannels,
  type InvoiceAndPaymentApi
} from "@features/invoice-and-payment/contracts";
import {
  obligationsAndCasesChannels,
  type ObligationsAndCasesApi
} from "@features/obligations-and-cases/contracts";
import { searchAndIndexChannels, type SearchAndIndexApi } from "@features/search-and-index/contracts";
import { reportsLiteChannels, type ReportsLiteApi } from "@features/reports-lite/contracts";
import { retirementBaselineChannels, type RetirementBaselineApi } from "@features/retirement-baseline/contracts";
import { transactionImportChannels, type TransactionImportApi } from "@features/transaction-import/contracts";
import { holdingsAndEventsChannels, type HoldingsAndEventsApi } from "@features/holdings-and-events/contracts";
import { bootstrapIntakeChannels, type RawIngestApi } from "@features/bootstrap-intake/contracts";
import {
  bootstrapPreprocessChannels,
  type BootstrapPreprocessApi
} from "@features/bootstrap-preprocess/contracts";
import { bootstrapStageChannels, type BootstrapStageApi } from "@features/bootstrap-stage/contracts";
import { bootstrapReviewChannels, type BootstrapReviewApi } from "@features/bootstrap-review/contracts";
import { bootstrapCommitChannels, type BootstrapCommitApi } from "@features/bootstrap-commit/contracts";
import { bootstrapAuditChannels, type BootstrapAuditApi } from "@features/bootstrap-audit/contracts";
import {
  bootstrapPilotDashboardChannels,
  type BootstrapPilotDashboardApi
} from "@features/bootstrap-pilot-dashboard/contracts";
import { shellCoreChannels, type ShellCoreApi } from "@features/shell-core/contracts";
import {
  voucherAndProofChannels,
  type VoucherAndProofApi
} from "@features/voucher-and-proof/contracts";
import type { IpcResult } from "@app/shared/errors/AppError";

async function invokeIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (result.ok) {
    return result.data;
  }
  throw new Error(`[${result.error.code}] ${result.error.message}`);
}

const shellCoreApi: ShellCoreApi = {
  listJobs: () => invokeIpc(shellCoreChannels.listJobs)
};

const documentInboxApi: DocumentInboxApi = {
  listInboxItems: () => invokeIpc(documentInboxChannels.listInboxItems),
  getInboxItem: (documentId: string) =>
    invokeIpc(documentInboxChannels.getInboxItem, documentId),
  selectAndIngestFiles: () => invokeIpc(documentInboxChannels.selectAndIngestFiles),
  ingestDocuments: (payloads) =>
    invokeIpc(documentInboxChannels.ingestDocuments, payloads),
  ingestClipboardText: (text: string) =>
    invokeIpc(documentInboxChannels.ingestClipboardText, text),
  openStoredDocument: (documentId: string) =>
    invokeIpc(documentInboxChannels.openStoredDocument, documentId)
};

const documentReviewApi: DocumentReviewApi = {
  extractDocumentFields: (documentId: string) =>
    invokeIpc(documentReviewChannels.extractDocumentFields, documentId),
  extractDocumentTables: (documentId: string) =>
    invokeIpc(documentReviewChannels.extractDocumentTables, documentId),
  updateFieldRegion: (documentId: string, fieldKey: string, region) =>
    invokeIpc(documentReviewChannels.updateFieldRegion, documentId, fieldKey, region),
  saveFieldTemplate: (input) => invokeIpc(documentReviewChannels.saveFieldTemplate, input),
  saveTableTemplate: (input) => invokeIpc(documentReviewChannels.saveTableTemplate, input)
};

const entityRegistryApi: EntityRegistryApi = {
  createEntity: (name, type) => invokeIpc(entityRegistryChannels.createEntity, name, type),
  listEntities: () => invokeIpc(entityRegistryChannels.listEntities),
  getEntityDetails: (entityId) => invokeIpc(entityRegistryChannels.getEntityDetails, entityId),
  createOwnershipRelation: (ownerEntityId, targetEntityId, sharePercent) =>
    invokeIpc(
      entityRegistryChannels.createOwnershipRelation,
      ownerEntityId,
      targetEntityId,
      sharePercent
    ),
  createAccount: (entityId, name) => invokeIpc(entityRegistryChannels.createAccount, entityId, name)
};

const invoiceAndPaymentApi: InvoiceAndPaymentApi = {
  createInvoiceDraft: (input) => invokeIpc(invoiceAndPaymentChannels.createInvoiceDraft, input),
  createPaymentEvent: (input) => invokeIpc(invoiceAndPaymentChannels.createPaymentEvent, input),
  listInvoices: () => invokeIpc(invoiceAndPaymentChannels.listInvoices),
  listPaymentEvents: () => invokeIpc(invoiceAndPaymentChannels.listPaymentEvents),
  matchPaymentToInvoice: (invoiceId, paymentId, amount) =>
    invokeIpc(invoiceAndPaymentChannels.matchPaymentToInvoice, invoiceId, paymentId, amount)
};

const obligationsAndCasesApi: ObligationsAndCasesApi = {
  createObligation: (input) => invokeIpc(obligationsAndCasesChannels.createObligation, input),
  updateObligation: (input) => invokeIpc(obligationsAndCasesChannels.updateObligation, input),
  listObligations: () => invokeIpc(obligationsAndCasesChannels.listObligations),
  getObligationDetails: (obligationId) =>
    invokeIpc(obligationsAndCasesChannels.getObligationDetails, obligationId),
  createCase: (input) => invokeIpc(obligationsAndCasesChannels.createCase, input),
  updateCase: (input) => invokeIpc(obligationsAndCasesChannels.updateCase, input),
  listCases: (obligationId) => invokeIpc(obligationsAndCasesChannels.listCases, obligationId),
  getCaseDetails: (caseId) => invokeIpc(obligationsAndCasesChannels.getCaseDetails, caseId),
  createChecklistItem: (input) => invokeIpc(obligationsAndCasesChannels.createChecklistItem, input),
  completeChecklistItem: (input) =>
    invokeIpc(obligationsAndCasesChannels.completeChecklistItem, input),
  runDeviationScan: () => invokeIpc(obligationsAndCasesChannels.runDeviationScan),
  listDeviationCases: () => invokeIpc(obligationsAndCasesChannels.listDeviationCases)
};

const voucherAndProofApi: VoucherAndProofApi = {
  listVouchers: () => invokeIpc(voucherAndProofChannels.listVouchers),
  getVoucher: (voucherId: string) =>
    invokeIpc(voucherAndProofChannels.getVoucher, voucherId),
  listVoucherCandidates: () =>
    invokeIpc(voucherAndProofChannels.listVoucherCandidates),
  createVoucherFromDocument: (documentId: string) =>
    invokeIpc(voucherAndProofChannels.createVoucherFromDocument, documentId),
  setVoucherVerificationStatus: (voucherId: string, status) =>
    invokeIpc(voucherAndProofChannels.setVoucherVerificationStatus, voucherId, status),
  exportVoucherBackup: (voucherId: string) =>
    invokeIpc(voucherAndProofChannels.exportVoucherBackup, voucherId),
  openVoucherSourceDocument: (voucherId: string) =>
    invokeIpc(voucherAndProofChannels.openVoucherSourceDocument, voucherId)
};

const searchAndIndexApi: SearchAndIndexApi = {
  searchAll: (query: string) => invokeIpc(searchAndIndexChannels.searchAll, query),
  rebuildSearchIndex: () => invokeIpc(searchAndIndexChannels.rebuildSearchIndex)
};

const reportsLiteApi: ReportsLiteApi = {
  listEntityLedger: (entityId: string, fromDate?: string, toDate?: string) =>
    invokeIpc(reportsLiteChannels.listEntityLedger, entityId, fromDate, toDate),
  getEntityBalanceSnapshot: (entityId: string, asOfDate?: string) =>
    invokeIpc(reportsLiteChannels.getEntityBalanceSnapshot, entityId, asOfDate),
  getBudgetComparison: (entityId: string, year: number, month?: number) =>
    invokeIpc(reportsLiteChannels.getBudgetComparison, entityId, year, month),
  getYearOverYearComparison: (entityId: string, year: number, month?: number) =>
    invokeIpc(reportsLiteChannels.getYearOverYearComparison, entityId, year, month),
  getPeriodDecisionView: (
    entityId: string,
    periodAFromDate: string,
    periodAToDate: string,
    periodBFromDate: string,
    periodBToDate: string
  ) =>
    invokeIpc(
      reportsLiteChannels.getPeriodDecisionView,
      entityId,
      periodAFromDate,
      periodAToDate,
      periodBFromDate,
      periodBToDate
    )
};
const retirementBaselineApi: RetirementBaselineApi = {
  saveRetirementAssumptions: (input) =>
    invokeIpc(retirementBaselineChannels.saveRetirementAssumptions, input),
  getRetirementScenario: (entityId: string) =>
    invokeIpc(retirementBaselineChannels.getRetirementScenario, entityId),
  approveRetirementScenario: (input) =>
    invokeIpc(retirementBaselineChannels.approveRetirementScenario, input),
  listRetirementScenarios: (entityId: string) =>
    invokeIpc(retirementBaselineChannels.listRetirementScenarios, entityId),
  compareRetirementScenarios: (entityId: string, leftScenarioId: string, rightScenarioId: string) =>
    invokeIpc(
      retirementBaselineChannels.compareRetirementScenarios,
      entityId,
      leftScenarioId,
      rightScenarioId
    )
};

const transactionImportApi: TransactionImportApi = {
  selectAndPreviewImportFile: () => invokeIpc(transactionImportChannels.selectAndPreviewImportFile),
  listImportBatches: () => invokeIpc(transactionImportChannels.listImportBatches),
  getImportBatch: (batchId: string) => invokeIpc(transactionImportChannels.getImportBatch, batchId),
  getImportReview: (batchId: string) => invokeIpc(transactionImportChannels.getImportReview, batchId),
  saveImportRowMapping: (input) => invokeIpc(transactionImportChannels.saveImportRowMapping, input),
  commitImportBatch: (batchId: string) => invokeIpc(transactionImportChannels.commitImportBatch, batchId)
};

const holdingsAndEventsApi: HoldingsAndEventsApi = {
  createHolding: (input) => invokeIpc(holdingsAndEventsChannels.createHolding, input),
  listHoldings: (entityId?: string) => invokeIpc(holdingsAndEventsChannels.listHoldings, entityId),
  getHoldingDetails: (holdingId: string) => invokeIpc(holdingsAndEventsChannels.getHoldingDetails, holdingId),
  createHoldingEvent: (input) => invokeIpc(holdingsAndEventsChannels.createHoldingEvent, input),
  getHoldingAnalysis: (holdingId: string) => invokeIpc(holdingsAndEventsChannels.getHoldingAnalysis, holdingId)
};
const bootstrapIntakeApi: RawIngestApi = {
  selectFoldersAndIngest: (input) => invokeIpc(bootstrapIntakeChannels.selectFoldersAndIngest, input),
  getScannerCapabilities: () => invokeIpc(bootstrapIntakeChannels.getScannerCapabilities),
  scanToBatch: (input) => invokeIpc(bootstrapIntakeChannels.scanToBatch, input),
  listBatches: () => invokeIpc(bootstrapIntakeChannels.listBatches),
  getBatch: (ingestBatchId: string) => invokeIpc(bootstrapIntakeChannels.getBatch, ingestBatchId)
};
const bootstrapPreprocessApi: BootstrapPreprocessApi = {
  runPreprocess: (input) => invokeIpc(bootstrapPreprocessChannels.runPreprocess, input),
  listPreprocessBatches: () => invokeIpc(bootstrapPreprocessChannels.listPreprocessBatches),
  getPreprocessBatch: (preprocessBatchId: string) =>
    invokeIpc(bootstrapPreprocessChannels.getPreprocessBatch, preprocessBatchId)
};
const bootstrapStageApi: BootstrapStageApi = {
  runStageGate: (input) => invokeIpc(bootstrapStageChannels.runStageGate, input),
  listStageBatches: () => invokeIpc(bootstrapStageChannels.listStageBatches),
  getStageBatch: (stageBatchId: string) => invokeIpc(bootstrapStageChannels.getStageBatch, stageBatchId)
};
const bootstrapReviewApi: BootstrapReviewApi = {
  listNeedsReviewQueue: (input) => invokeIpc(bootstrapReviewChannels.listNeedsReviewQueue, input),
  applyBulkAction: (input) => invokeIpc(bootstrapReviewChannels.applyBulkAction, input)
};
const bootstrapCommitApi: BootstrapCommitApi = {
  runCommit: (input) => invokeIpc(bootstrapCommitChannels.runCommit, input),
  listCommits: () => invokeIpc(bootstrapCommitChannels.listCommits),
  getCommit: (commitBatchId: string) => invokeIpc(bootstrapCommitChannels.getCommit, commitBatchId)
};
const bootstrapAuditApi: BootstrapAuditApi = {
  listAuditTrail: (filter) => invokeIpc(bootstrapAuditChannels.listAuditTrail, filter)
};
const bootstrapPilotDashboardApi: BootstrapPilotDashboardApi = {
  getDashboard: (filter) => invokeIpc(bootstrapPilotDashboardChannels.getDashboard, filter)
};

contextBridge.exposeInMainWorld("purrifer", {
  shellCore: shellCoreApi,
  documentInbox: documentInboxApi,
  documentReview: documentReviewApi,
  entityRegistry: entityRegistryApi,
  invoiceAndPayment: invoiceAndPaymentApi,
  obligationsAndCases: obligationsAndCasesApi,
  searchAndIndex: searchAndIndexApi,
  reportsLite: reportsLiteApi,
  retirementBaseline: retirementBaselineApi,
  transactionImport: transactionImportApi,
  holdingsAndEvents: holdingsAndEventsApi,
  bootstrapIntake: bootstrapIntakeApi,
  bootstrapPreprocess: bootstrapPreprocessApi,
  bootstrapStage: bootstrapStageApi,
  bootstrapReview: bootstrapReviewApi,
  bootstrapCommit: bootstrapCommitApi,
  bootstrapAudit: bootstrapAuditApi,
  bootstrapPilotDashboard: bootstrapPilotDashboardApi,
  voucherAndProof: voucherAndProofApi
});

