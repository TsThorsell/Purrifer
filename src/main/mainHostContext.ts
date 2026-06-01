import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import { DocumentInboxService } from "@features/document-inbox/main/DocumentInboxService";
import { FileDocumentStore } from "@features/document-inbox/main/FileDocumentStore";
import { JsonDocumentInboxRepository } from "@features/document-inbox/main/JsonDocumentInboxRepository";
import { DocumentReviewService } from "@features/document-review/main/DocumentReviewService";
import { EntityRegistryService } from "@features/entity-registry/main/EntityRegistryService";
import { InvoiceAndPaymentService } from "@features/invoice-and-payment/main/InvoiceAndPaymentService";
import { ObligationsAndCasesRepository } from "@features/obligations-and-cases/main/ObligationsAndCasesRepository";
import { ObligationsAndCasesService } from "@features/obligations-and-cases/main/ObligationsAndCasesService";
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
import { VoucherAndProofService } from "@features/voucher-and-proof/main/VoucherAndProofService";
import { JsonVoucherRepository } from "@features/voucher-and-proof/main/JsonVoucherRepository";
import { ShellCoreService } from "@features/shell-core/main/ShellCoreService";
import { PythonBridge } from "@app/python/PythonBridge";
import type { MainHostContext } from "@app/registry/mainHostTypes";

interface MainHostContextOptions {
  userDataPath: string;
  pythonBridgeScriptPath: string;
}

export function buildMainHostContext(options: MainHostContextOptions): MainHostContext {
  const sqliteDatabase = new SqliteDatabase(options.userDataPath);
  const sequenceStore = new FileSequenceStore(sqliteDatabase);

  const shellCoreService = new ShellCoreService();

  const repository = new JsonDocumentInboxRepository(sqliteDatabase);
  const documentStore = new FileDocumentStore(options.userDataPath);
  const documentInboxService = new DocumentInboxService(repository, documentStore, sequenceStore);

  const pythonBridge = new PythonBridge(options.pythonBridgeScriptPath);
  const documentReviewService = new DocumentReviewService(pythonBridge, sqliteDatabase);

  const entityRegistryService = new EntityRegistryService(sqliteDatabase, sequenceStore);
  const invoiceAndPaymentService = new InvoiceAndPaymentService(sqliteDatabase, sequenceStore);

  const obligationsRepository = new ObligationsAndCasesRepository(sqliteDatabase);
  const obligationsAndCasesService = new ObligationsAndCasesService(
    obligationsRepository,
    sequenceStore
  );

  const searchRepository = new SearchAndIndexRepository(sqliteDatabase);
  const searchAndIndexService = new SearchAndIndexService(searchRepository);

  const reportsRepository = new ReportsLiteRepository(sqliteDatabase);
  const reportsLiteService = new ReportsLiteService(reportsRepository);

  const retirementBaselineRepository = new RetirementBaselineRepository(sqliteDatabase);
  const retirementBaselineService = new RetirementBaselineService(retirementBaselineRepository, sequenceStore);

  const transactionImportRepository = new TransactionImportRepository(sqliteDatabase);
  const transactionImportService = new TransactionImportService(transactionImportRepository, sequenceStore);

  const holdingsRepository = new HoldingsAndEventsRepository(sqliteDatabase);
  const holdingsAndEventsService = new HoldingsAndEventsService(holdingsRepository, sequenceStore);

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

  const voucherRepository = new JsonVoucherRepository(sqliteDatabase);
  const voucherAndProofService = new VoucherAndProofService(voucherRepository, sequenceStore, documentInboxService);

  return {
    shellCoreService,
    documentInboxService,
    voucherAndProofService,
    documentReviewService,
    entityRegistryService,
    invoiceAndPaymentService,
    obligationsAndCasesService,
    searchAndIndexService,
    reportsLiteService,
    retirementBaselineService,
    transactionImportService,
    holdingsAndEventsService,
    bootstrapIntakeService,
    bootstrapPreprocessService,
    bootstrapStageService,
    bootstrapReviewService,
    bootstrapCommitService,
    bootstrapAuditService,
    bootstrapPilotDashboardService
  };
}
