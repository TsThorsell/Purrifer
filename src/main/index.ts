import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PythonBridge } from "@app/python/PythonBridge";
import { runIpcHandler } from "@app/shared/ipc/ipcHandler";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import { documentInboxChannels } from "@features/document-inbox/contracts";
import { DocumentInboxService } from "@features/document-inbox/main/DocumentInboxService";
import { FileDocumentStore } from "@features/document-inbox/main/FileDocumentStore";
import { JsonDocumentInboxRepository } from "@features/document-inbox/main/JsonDocumentInboxRepository";
import { documentReviewChannels } from "@features/document-review/contracts";
import { DocumentReviewService } from "@features/document-review/main/DocumentReviewService";
import { entityRegistryChannels, type EntityType } from "@features/entity-registry/contracts";
import { EntityRegistryService } from "@features/entity-registry/main/EntityRegistryService";
import {
  invoiceAndPaymentChannels,
  type PaymentMethod
} from "@features/invoice-and-payment/contracts";
import { InvoiceAndPaymentService } from "@features/invoice-and-payment/main/InvoiceAndPaymentService";
import { obligationsAndCasesChannels } from "@features/obligations-and-cases/contracts";
import { searchAndIndexChannels } from "@features/search-and-index/contracts";
import { reportsLiteChannels } from "@features/reports-lite/contracts";
import { retirementBaselineChannels } from "@features/retirement-baseline/contracts";
import { transactionImportChannels } from "@features/transaction-import/contracts";
import { holdingsAndEventsChannels } from "@features/holdings-and-events/contracts";
import { bootstrapIntakeChannels } from "@features/bootstrap-intake/contracts";
import { bootstrapPreprocessChannels } from "@features/bootstrap-preprocess/contracts";
import { bootstrapStageChannels } from "@features/bootstrap-stage/contracts";
import { bootstrapReviewChannels } from "@features/bootstrap-review/contracts";
import { bootstrapCommitChannels } from "@features/bootstrap-commit/contracts";
import { bootstrapAuditChannels } from "@features/bootstrap-audit/contracts";
import { bootstrapPilotDashboardChannels } from "@features/bootstrap-pilot-dashboard/contracts";
import type {
  CompleteChecklistItemInput,
  CreateCaseInput,
  CreateChecklistItemInput,
  CreateObligationInput,
  UpdateCaseInput,
  UpdateObligationInput
} from "@features/obligations-and-cases/contracts";
import { ObligationsAndCasesRepository } from "@features/obligations-and-cases/main/ObligationsAndCasesRepository";
import {
  ObligationsAndCasesService
} from "@features/obligations-and-cases/main/ObligationsAndCasesService";
import { shellCoreChannels } from "@features/shell-core/contracts";
import { ShellCoreService } from "@features/shell-core/main/ShellCoreService";
import { SearchAndIndexRepository } from "@features/search-and-index/main/SearchAndIndexRepository";
import { SearchAndIndexService } from "@features/search-and-index/main/SearchAndIndexService";
import { ReportsLiteRepository } from "@features/reports-lite/main/ReportsLiteRepository";
import { ReportsLiteService } from "@features/reports-lite/main/ReportsLiteService";
import { RetirementBaselineRepository } from "@features/retirement-baseline/main/RetirementBaselineRepository";
import { RetirementBaselineService } from "@features/retirement-baseline/main/RetirementBaselineService";
import { TransactionImportRepository } from "@features/transaction-import/main/TransactionImportRepository";
import { TransactionImportService } from "@features/transaction-import/main/TransactionImportService";
import { HoldingsAndEventsRepository } from "@features/holdings-and-events/main/HoldingsAndEventsRepository";
import { HoldingsAndEventsService } from "@features/holdings-and-events/main/HoldingsAndEventsService";
import { BootstrapIntakeRepository } from "@features/bootstrap-intake/main/BootstrapIntakeRepository";
import { BootstrapIntakeService } from "@features/bootstrap-intake/main/BootstrapIntakeService";
import { BootstrapPreprocessRepository } from "@features/bootstrap-preprocess/main/BootstrapPreprocessRepository";
import { BootstrapPreprocessService } from "@features/bootstrap-preprocess/main/BootstrapPreprocessService";
import { BootstrapStageRepository } from "@features/bootstrap-stage/main/BootstrapStageRepository";
import { BootstrapStageService } from "@features/bootstrap-stage/main/BootstrapStageService";
import { BootstrapReviewRepository } from "@features/bootstrap-review/main/BootstrapReviewRepository";
import { BootstrapReviewService } from "@features/bootstrap-review/main/BootstrapReviewService";
import { BootstrapCommitRepository } from "@features/bootstrap-commit/main/BootstrapCommitRepository";
import { BootstrapCommitService } from "@features/bootstrap-commit/main/BootstrapCommitService";
import { BootstrapAuditRepository } from "@features/bootstrap-audit/main/BootstrapAuditRepository";
import { BootstrapAuditService } from "@features/bootstrap-audit/main/BootstrapAuditService";
import { BootstrapPilotDashboardRepository } from "@features/bootstrap-pilot-dashboard/main/BootstrapPilotDashboardRepository";
import { BootstrapPilotDashboardService } from "@features/bootstrap-pilot-dashboard/main/BootstrapPilotDashboardService";
import { voucherAndProofChannels } from "@features/voucher-and-proof/contracts";
import { JsonVoucherRepository } from "@features/voucher-and-proof/main/JsonVoucherRepository";
import { VoucherAndProofService } from "@features/voucher-and-proof/main/VoucherAndProofService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEV_RUNTIME_TTL_MS = 24 * 60 * 60 * 1000;

configureDevRuntimePaths();

let mainWindow: BrowserWindow | null = null;
const iconPath = path.resolve(__dirname, "../../assets/branding/purrifer-logo.ico");

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, "../preload/index.mjs"),
    path.join(__dirname, "../preload/index.js")
  ];
  const entry = candidates.find((candidate) => existsSync(candidate));
  if (!entry) {
    throw new Error(`Kunde inte hitta preload entrypoint. Letade i: ${candidates.join(", ")}`);
  }
  console.log(`[startup] preload entrypoint: ${entry}`);
  return entry;
}

function configureDevRuntimePaths() {
  if (!process.env.ELECTRON_RENDERER_URL) {
    return;
  }

  const runtimeBase = path.join(app.getPath("temp"), "purrifer-dev-runtime");
  const runtimeRoot = path.join(
    runtimeBase,
    String(process.pid)
  );

  // Best-effort cleanup: remove stale dev runtime directories without blocking startup.
  void cleanupStaleDevRuntimeDirs(runtimeBase, runtimeRoot).catch((reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.warn(`[purrifer-dev-runtime] cleanup skipped: ${message}`);
  });

  app.setPath("userData", path.join(runtimeRoot, "user-data"));
  app.setPath("sessionData", path.join(runtimeRoot, "session-data"));
  app.commandLine.appendSwitch("disk-cache-dir", path.join(runtimeRoot, "cache"));
}

async function cleanupStaleDevRuntimeDirs(runtimeBase: string, currentRuntimeRoot: string) {
  const entries = await readdir(runtimeBase, { withFileTypes: true });
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(runtimeBase, entry.name);
    if (path.resolve(entryPath) === path.resolve(currentRuntimeRoot)) {
      continue;
    }

    let entryStat;
    try {
      entryStat = await stat(entryPath);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.warn(`[purrifer-dev-runtime] unable to inspect ${entry.name}: ${message}`);
      continue;
    }

    if (now - entryStat.mtimeMs < DEV_RUNTIME_TTL_MS) {
      continue;
    }

    try {
      await rm(entryPath, { recursive: true, force: true });
      console.log(`[purrifer-dev-runtime] removed stale runtime dir: ${entry.name}`);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      console.warn(`[purrifer-dev-runtime] unable to remove ${entry.name}: ${message}`);
    }
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#efe7d8",
    title: "Purrifer",
    icon: iconPath,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
  } else {
    const rendererCandidates = [
      path.join(__dirname, "../renderer/index.html"),
      path.join(__dirname, "../../out/renderer/index.html"),
      path.join(__dirname, "../../../out/renderer/index.html")
    ];
    const rendererEntry = rendererCandidates.find((candidate) => existsSync(candidate));

    if (!rendererEntry) {
      throw new Error(
        `Kunde inte hitta renderer entrypoint. Letade i: ${rendererCandidates.join(", ")}`
      );
    }

    await mainWindow.loadFile(rendererEntry);
  }
}

function registerHandlers() {
  const shellCoreService = new ShellCoreService();
  const userDataPath = app.getPath("userData");
  const sqliteDatabase = new SqliteDatabase(userDataPath);
  const repository = new JsonDocumentInboxRepository(sqliteDatabase);
  const documentStore = new FileDocumentStore(userDataPath);
  const sequenceStore = new FileSequenceStore(sqliteDatabase);
  const documentInboxService = new DocumentInboxService(repository, documentStore, sequenceStore);
  const voucherRepository = new JsonVoucherRepository(sqliteDatabase);
  const pythonBridge = new PythonBridge(path.resolve(__dirname, "../../scripts/python/document_engine.py"));
  const documentReviewService = new DocumentReviewService(pythonBridge, sqliteDatabase);
  const entityRegistryService = new EntityRegistryService(sqliteDatabase, sequenceStore);
  const invoiceAndPaymentService = new InvoiceAndPaymentService(sqliteDatabase, sequenceStore);
  const obligationsRepository = new ObligationsAndCasesRepository(sqliteDatabase);
  const obligationsService = new ObligationsAndCasesService(obligationsRepository, sequenceStore);
  const voucherService = new VoucherAndProofService(
    voucherRepository,
    sequenceStore,
    documentInboxService
  );
  const searchRepository = new SearchAndIndexRepository(sqliteDatabase);
  const searchService = new SearchAndIndexService(searchRepository);
  const reportsRepository = new ReportsLiteRepository(sqliteDatabase);
  const reportsService = new ReportsLiteService(reportsRepository);
  const retirementBaselineRepository = new RetirementBaselineRepository(sqliteDatabase);
  const retirementBaselineService = new RetirementBaselineService(retirementBaselineRepository, sequenceStore);
  const transactionImportRepository = new TransactionImportRepository(sqliteDatabase);
  const transactionImportService = new TransactionImportService(transactionImportRepository, sequenceStore);
  const holdingsRepository = new HoldingsAndEventsRepository(sqliteDatabase);
  const holdingsService = new HoldingsAndEventsService(holdingsRepository, sequenceStore);
  const bootstrapIntakeRepository = new BootstrapIntakeRepository(sqliteDatabase);
  const bootstrapIntakeService = new BootstrapIntakeService(bootstrapIntakeRepository, sequenceStore);
  const bootstrapPreprocessRepository = new BootstrapPreprocessRepository(sqliteDatabase);
  const bootstrapPreprocessService = new BootstrapPreprocessService(
    bootstrapPreprocessRepository,
    sequenceStore
  );
  const bootstrapStageRepository = new BootstrapStageRepository(sqliteDatabase);
  const bootstrapStageService = new BootstrapStageService(bootstrapStageRepository, sequenceStore);
  const bootstrapReviewRepository = new BootstrapReviewRepository(sqliteDatabase);
  const bootstrapReviewService = new BootstrapReviewService(bootstrapReviewRepository);
  const bootstrapCommitRepository = new BootstrapCommitRepository(sqliteDatabase);
  const bootstrapCommitService = new BootstrapCommitService(bootstrapCommitRepository, sequenceStore);
  const bootstrapAuditRepository = new BootstrapAuditRepository(sqliteDatabase);
  const bootstrapAuditService = new BootstrapAuditService(bootstrapAuditRepository);
  const bootstrapPilotDashboardRepository = new BootstrapPilotDashboardRepository(sqliteDatabase);
  const bootstrapPilotDashboardService = new BootstrapPilotDashboardService(bootstrapPilotDashboardRepository);

  ipcMain.handle(shellCoreChannels.listJobs, async (event) =>
    runIpcHandler(async () => shellCoreService.listJobs(), event)
  );

  ipcMain.handle(documentInboxChannels.listInboxItems, async (event) =>
    runIpcHandler(async () => documentInboxService.listInboxItems(), event)
  );
  ipcMain.handle(documentInboxChannels.getInboxItem, async (event, documentId: string) =>
    runIpcHandler(async () => documentInboxService.getInboxItem(documentId), event)
  );
  ipcMain.handle(documentInboxChannels.selectAndIngestFiles, async (event) =>
    runIpcHandler(async () => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("Ingen aktiv applikationsruta hittades for filval.");
      }
      return documentInboxService.selectAndIngestFiles(window);
    }, event)
  );
  ipcMain.handle(documentInboxChannels.ingestDocuments, async (event, payloads) =>
    runIpcHandler(async () => documentInboxService.ingestDocuments(payloads), event)
  );
  ipcMain.handle(documentInboxChannels.ingestClipboardText, async (event, text: string) =>
    runIpcHandler(async () => documentInboxService.ingestClipboardText(text), event)
  );
  ipcMain.handle(documentInboxChannels.openStoredDocument, async (event, documentId: string) =>
    runIpcHandler(async () => documentInboxService.openStoredDocument(documentId), event)
  );

  ipcMain.handle(voucherAndProofChannels.listVouchers, async (event) =>
    runIpcHandler(async () => voucherService.listVouchers(), event)
  );
  ipcMain.handle(voucherAndProofChannels.getVoucher, async (event, voucherId: string) =>
    runIpcHandler(async () => voucherService.getVoucher(voucherId), event)
  );
  ipcMain.handle(voucherAndProofChannels.listVoucherCandidates, async (event) =>
    runIpcHandler(async () => voucherService.listVoucherCandidates(), event)
  );
  ipcMain.handle(voucherAndProofChannels.createVoucherFromDocument, async (event, documentId: string) =>
    runIpcHandler(async () => voucherService.createVoucherFromDocument(documentId), event)
  );
  ipcMain.handle(
    voucherAndProofChannels.setVoucherVerificationStatus,
    async (event, voucherId: string, status) =>
      runIpcHandler(async () => voucherService.setVoucherVerificationStatus(voucherId, status), event)
  );
  ipcMain.handle(voucherAndProofChannels.exportVoucherBackup, async (event, voucherId: string) =>
    runIpcHandler(async () => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("Ingen aktiv applikationsruta hittades for backup-export.");
      }
      return voucherService.exportVoucherBackup(voucherId, window);
    }, event)
  );
  ipcMain.handle(voucherAndProofChannels.openVoucherSourceDocument, async (event, voucherId: string) =>
    runIpcHandler(async () => voucherService.openVoucherSourceDocument(voucherId), event)
  );

  ipcMain.handle(documentReviewChannels.extractDocumentFields, async (event, documentId: string) =>
    runIpcHandler(async () => documentReviewService.extractDocumentFields(documentId), event)
  );
  ipcMain.handle(documentReviewChannels.extractDocumentTables, async (event, documentId: string) =>
    runIpcHandler(async () => documentReviewService.extractDocumentTables(documentId), event)
  );
  ipcMain.handle(
    documentReviewChannels.updateFieldRegion,
    async (
      event,
      documentId: string,
      fieldKey: string,
      region: { x: number; y: number; width: number; height: number }
    ) => runIpcHandler(async () => documentReviewService.updateFieldRegion(documentId, fieldKey, region), event)
  );
  ipcMain.handle(documentReviewChannels.saveFieldTemplate, async (event, input: { templateKey: string; payloadJson: string }) =>
    runIpcHandler(async () => documentReviewService.saveFieldTemplate(input), event)
  );
  ipcMain.handle(documentReviewChannels.saveTableTemplate, async (event, input: { templateKey: string; payloadJson: string }) =>
    runIpcHandler(async () => documentReviewService.saveTableTemplate(input), event)
  );

  ipcMain.handle(entityRegistryChannels.createEntity, async (event, name: string, type: EntityType) =>
    runIpcHandler(async () => entityRegistryService.createEntity(name, type), event)
  );
  ipcMain.handle(entityRegistryChannels.listEntities, async (event) =>
    runIpcHandler(async () => entityRegistryService.listEntities(), event)
  );
  ipcMain.handle(entityRegistryChannels.getEntityDetails, async (event, entityId: string) =>
    runIpcHandler(async () => entityRegistryService.getEntityDetails(entityId), event)
  );
  ipcMain.handle(
    entityRegistryChannels.createOwnershipRelation,
    async (event, ownerEntityId: string, targetEntityId: string, sharePercent: number) =>
      runIpcHandler(
        async () =>
          entityRegistryService.createOwnershipRelation(ownerEntityId, targetEntityId, sharePercent),
        event
      )
  );
  ipcMain.handle(entityRegistryChannels.createAccount, async (event, entityId: string, name: string) =>
    runIpcHandler(async () => entityRegistryService.createAccount(entityId, name), event)
  );

  ipcMain.handle(
    invoiceAndPaymentChannels.createInvoiceDraft,
    async (
      event,
      input: {
        entityId: string;
        supplierName: string;
        grossAmount: number;
        netAmount: number;
        vatAmount: number;
      }
    ) => runIpcHandler(async () => invoiceAndPaymentService.createInvoiceDraft(input), event)
  );
  ipcMain.handle(
    invoiceAndPaymentChannels.createPaymentEvent,
    async (
      event,
      input: { entityId: string; amount: number; paymentMethod: PaymentMethod; paymentDate: string }
    ) => runIpcHandler(async () => invoiceAndPaymentService.createPaymentEvent(input), event)
  );
  ipcMain.handle(invoiceAndPaymentChannels.listInvoices, async (event) =>
    runIpcHandler(async () => invoiceAndPaymentService.listInvoices(), event)
  );
  ipcMain.handle(invoiceAndPaymentChannels.listPaymentEvents, async (event) =>
    runIpcHandler(async () => invoiceAndPaymentService.listPaymentEvents(), event)
  );
  ipcMain.handle(
    invoiceAndPaymentChannels.matchPaymentToInvoice,
    async (event, invoiceId: string, paymentId: string, amount: number) =>
      runIpcHandler(async () => invoiceAndPaymentService.matchPaymentToInvoice(invoiceId, paymentId, amount), event)
  );

  ipcMain.handle(obligationsAndCasesChannels.createObligation, async (event, input: CreateObligationInput) =>
    runIpcHandler(async () => obligationsService.createObligation(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.updateObligation, async (event, input: UpdateObligationInput) =>
    runIpcHandler(async () => obligationsService.updateObligation(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.listObligations, async (event) =>
    runIpcHandler(async () => obligationsService.listObligations(), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.getObligationDetails, async (event, obligationId: string) =>
    runIpcHandler(async () => obligationsService.getObligationDetails(obligationId), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.createCase, async (event, input: CreateCaseInput) =>
    runIpcHandler(async () => obligationsService.createCase(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.updateCase, async (event, input: UpdateCaseInput) =>
    runIpcHandler(async () => obligationsService.updateCase(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.listCases, async (event, obligationId?: string) =>
    runIpcHandler(async () => obligationsService.listCases(obligationId), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.getCaseDetails, async (event, caseId: string) =>
    runIpcHandler(async () => obligationsService.getCaseDetails(caseId), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.createChecklistItem, async (event, input: CreateChecklistItemInput) =>
    runIpcHandler(async () => obligationsService.createChecklistItem(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.completeChecklistItem, async (event, input: CompleteChecklistItemInput) =>
    runIpcHandler(async () => obligationsService.completeChecklistItem(input), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.runDeviationScan, async (event) =>
    runIpcHandler(async () => obligationsService.runDeviationScan(), event)
  );
  ipcMain.handle(obligationsAndCasesChannels.listDeviationCases, async (event) =>
    runIpcHandler(async () => obligationsService.listDeviationCases(), event)
  );

  ipcMain.handle(searchAndIndexChannels.searchAll, async (event, query: string) =>
    runIpcHandler(async () => searchService.searchAll(query), event)
  );
  ipcMain.handle(searchAndIndexChannels.rebuildSearchIndex, async (event) =>
    runIpcHandler(async () => searchService.rebuildSearchIndex(), event)
  );
  ipcMain.handle(
    reportsLiteChannels.listEntityLedger,
    async (event, entityId: string, fromDate?: string, toDate?: string) =>
      runIpcHandler(async () => reportsService.listEntityLedger(entityId, fromDate, toDate), event)
  );
  ipcMain.handle(
    reportsLiteChannels.getEntityBalanceSnapshot,
    async (event, entityId: string, asOfDate?: string) =>
      runIpcHandler(async () => reportsService.getEntityBalanceSnapshot(entityId, asOfDate), event)
  );
  ipcMain.handle(
    reportsLiteChannels.getBudgetComparison,
    async (event, entityId: string, year: number, month?: number) =>
      runIpcHandler(async () => reportsService.getBudgetComparison(entityId, year, month), event)
  );
  ipcMain.handle(
    reportsLiteChannels.getYearOverYearComparison,
    async (event, entityId: string, year: number, month?: number) =>
      runIpcHandler(async () => reportsService.getYearOverYearComparison(entityId, year, month), event)
  );
  ipcMain.handle(
    reportsLiteChannels.getPeriodDecisionView,
    async (
      event,
      entityId: string,
      periodAFromDate: string,
      periodAToDate: string,
      periodBFromDate: string,
      periodBToDate: string
    ) =>
      runIpcHandler(
        async () =>
          reportsService.getPeriodDecisionView(
            entityId,
            periodAFromDate,
            periodAToDate,
            periodBFromDate,
            periodBToDate
          ),
        event
      )
  );
  ipcMain.handle(retirementBaselineChannels.saveRetirementAssumptions, async (event, input) =>
    runIpcHandler(async () => retirementBaselineService.saveRetirementAssumptions(input), event)
  );
  ipcMain.handle(retirementBaselineChannels.getRetirementScenario, async (event, entityId: string) =>
    runIpcHandler(async () => retirementBaselineService.getRetirementScenario(entityId), event)
  );
  ipcMain.handle(retirementBaselineChannels.approveRetirementScenario, async (event, input) =>
    runIpcHandler(async () => retirementBaselineService.approveRetirementScenario(input), event)
  );
  ipcMain.handle(retirementBaselineChannels.listRetirementScenarios, async (event, entityId: string) =>
    runIpcHandler(async () => retirementBaselineService.listRetirementScenarios(entityId), event)
  );
  ipcMain.handle(
    retirementBaselineChannels.compareRetirementScenarios,
    async (event, entityId: string, leftScenarioId: string, rightScenarioId: string) =>
      runIpcHandler(
        async () =>
          retirementBaselineService.compareRetirementScenarios(
            entityId,
            leftScenarioId,
            rightScenarioId
          ),
        event
      )
  );
  ipcMain.handle(transactionImportChannels.selectAndPreviewImportFile, async (event) =>
    runIpcHandler(async () => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("Ingen aktiv applikationsruta hittades for import.");
      }
      return transactionImportService.selectAndPreviewImportFile(window);
    }, event)
  );
  ipcMain.handle(transactionImportChannels.listImportBatches, async (event) =>
    runIpcHandler(async () => transactionImportService.listImportBatches(), event)
  );
  ipcMain.handle(transactionImportChannels.getImportBatch, async (event, batchId: string) =>
    runIpcHandler(async () => transactionImportService.getImportBatch(batchId), event)
  );
  ipcMain.handle(transactionImportChannels.getImportReview, async (event, batchId: string) =>
    runIpcHandler(async () => transactionImportService.getImportReview(batchId), event)
  );
  ipcMain.handle(transactionImportChannels.saveImportRowMapping, async (event, input) =>
    runIpcHandler(async () => transactionImportService.saveImportRowMapping(input), event)
  );
  ipcMain.handle(transactionImportChannels.commitImportBatch, async (event, batchId: string) =>
    runIpcHandler(async () => transactionImportService.commitImportBatch(batchId), event)
  );
  ipcMain.handle(holdingsAndEventsChannels.createHolding, async (event, input) =>
    runIpcHandler(async () => holdingsService.createHolding(input), event)
  );
  ipcMain.handle(holdingsAndEventsChannels.listHoldings, async (event, entityId?: string) =>
    runIpcHandler(async () => holdingsService.listHoldings(entityId), event)
  );
  ipcMain.handle(holdingsAndEventsChannels.getHoldingDetails, async (event, holdingId: string) =>
    runIpcHandler(async () => holdingsService.getHoldingDetails(holdingId), event)
  );
  ipcMain.handle(holdingsAndEventsChannels.createHoldingEvent, async (event, input) =>
    runIpcHandler(async () => holdingsService.createHoldingEvent(input), event)
  );
  ipcMain.handle(holdingsAndEventsChannels.getHoldingAnalysis, async (event, holdingId: string) =>
    runIpcHandler(async () => holdingsService.getHoldingAnalysis(holdingId), event)
  );
  ipcMain.handle(bootstrapIntakeChannels.selectFoldersAndIngest, async (event, input) =>
    runIpcHandler(async () => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("Ingen aktiv applikationsruta hittades for batchingest.");
      }
      return bootstrapIntakeService.selectFoldersAndIngest(window, input);
    }, event)
  );
  ipcMain.handle(bootstrapIntakeChannels.getScannerCapabilities, async (event) =>
    runIpcHandler(async () => bootstrapIntakeService.getScannerCapabilities(), event)
  );
  ipcMain.handle(bootstrapIntakeChannels.scanToBatch, async (event, input) =>
    runIpcHandler(async () => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("Ingen aktiv applikationsruta hittades for scanning.");
      }
      return bootstrapIntakeService.scanToBatch(window, input);
    }, event)
  );
  ipcMain.handle(bootstrapIntakeChannels.listBatches, async (event) =>
    runIpcHandler(async () => bootstrapIntakeService.listBatches(), event)
  );
  ipcMain.handle(bootstrapIntakeChannels.getBatch, async (event, ingestBatchId: string) =>
    runIpcHandler(async () => bootstrapIntakeService.getBatch(ingestBatchId), event)
  );
  ipcMain.handle(bootstrapPreprocessChannels.runPreprocess, async (event, input) =>
    runIpcHandler(async () => bootstrapPreprocessService.runPreprocess(input), event)
  );
  ipcMain.handle(bootstrapPreprocessChannels.listPreprocessBatches, async (event) =>
    runIpcHandler(async () => bootstrapPreprocessService.listPreprocessBatches(), event)
  );
  ipcMain.handle(bootstrapPreprocessChannels.getPreprocessBatch, async (event, preprocessBatchId: string) =>
    runIpcHandler(async () => bootstrapPreprocessService.getPreprocessBatch(preprocessBatchId), event)
  );
  ipcMain.handle(bootstrapStageChannels.runStageGate, async (event, input) =>
    runIpcHandler(async () => bootstrapStageService.runStageGate(input), event)
  );
  ipcMain.handle(bootstrapStageChannels.listStageBatches, async (event) =>
    runIpcHandler(async () => bootstrapStageService.listStageBatches(), event)
  );
  ipcMain.handle(bootstrapStageChannels.getStageBatch, async (event, stageBatchId: string) =>
    runIpcHandler(async () => bootstrapStageService.getStageBatch(stageBatchId), event)
  );
  ipcMain.handle(bootstrapReviewChannels.listNeedsReviewQueue, async (event, input) =>
    runIpcHandler(async () => bootstrapReviewService.listNeedsReviewQueue(input), event)
  );
  ipcMain.handle(bootstrapReviewChannels.applyBulkAction, async (event, input) =>
    runIpcHandler(async () => bootstrapReviewService.applyBulkAction(input), event)
  );
  ipcMain.handle(bootstrapCommitChannels.runCommit, async (event, input) =>
    runIpcHandler(async () => bootstrapCommitService.runCommit(input), event)
  );
  ipcMain.handle(bootstrapCommitChannels.listCommits, async (event) =>
    runIpcHandler(async () => bootstrapCommitService.listCommits(), event)
  );
  ipcMain.handle(bootstrapCommitChannels.getCommit, async (event, commitBatchId: string) =>
    runIpcHandler(async () => bootstrapCommitService.getCommit(commitBatchId), event)
  );
  ipcMain.handle(bootstrapAuditChannels.listAuditTrail, async (event, filter) =>
    runIpcHandler(async () => bootstrapAuditService.listAuditTrail(filter), event)
  );
  ipcMain.handle(bootstrapPilotDashboardChannels.getDashboard, async (event, filter) =>
    runIpcHandler(async () => bootstrapPilotDashboardService.getDashboard(filter), event)
  );
}

app
  .whenReady()
  .then(async () => {
    registerHandlers();
    await createMainWindow();

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });
  })
  .catch((reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`[startup] ${message}`);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

