import type { IpcMainInvokeEvent } from "electron";
import type { ShellCoreService } from "@features/shell-core/main/ShellCoreService";
import type { DocumentInboxService } from "@features/document-inbox/main/DocumentInboxService";
import type { VoucherAndProofService } from "@features/voucher-and-proof/main/VoucherAndProofService";
import type { DocumentReviewService } from "@features/document-review/main/DocumentReviewService";
import type { EntityRegistryService } from "@features/entity-registry/main/EntityRegistryService";
import type { InvoiceAndPaymentService } from "@features/invoice-and-payment/main/InvoiceAndPaymentService";
import type { ObligationsAndCasesService } from "@features/obligations-and-cases/main/ObligationsAndCasesService";
import type { SearchAndIndexService } from "@features/search-and-index/main/SearchAndIndexService";
import type { ReportsLiteService } from "@features/reports-lite/main/ReportsLiteService";
import type { RetirementBaselineService } from "@features/retirement-baseline/main/RetirementBaselineService";
import type { TransactionImportService } from "@features/transaction-import/main/TransactionImportService";
import type { HoldingsAndEventsService } from "@features/holdings-and-events/main/HoldingsAndEventsService";
import type { BootstrapIntakeService } from "@features/bootstrap-intake/main/BootstrapIntakeService";
import type { BootstrapPreprocessService } from "@features/bootstrap-preprocess/main/BootstrapPreprocessService";
import type { BootstrapStageService } from "@features/bootstrap-stage/main/BootstrapStageService";
import type { BootstrapReviewService } from "@features/bootstrap-review/main/BootstrapReviewService";
import type { BootstrapCommitService } from "@features/bootstrap-commit/main/BootstrapCommitService";
import type { BootstrapAuditService } from "@features/bootstrap-audit/main/BootstrapAuditService";
import type { BootstrapPilotDashboardService } from "@features/bootstrap-pilot-dashboard/main/BootstrapPilotDashboardService";
import type { ModuleSchemaIssueCode } from "@app/registry/moduleSchema";

export type IpcPermission = "public" | "restricted";

export interface MainIpcHandlerSpec {
  channel: string;
  permission: IpcPermission;
  requiresWindow?: boolean;
  validate?: (args: unknown[]) => void;
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown> | unknown;
}

export interface MainSliceHost {
  sliceId: string;
  schemaVersion?: string;
  allowedChannels: readonly string[];
  handlers: MainIpcHandlerSpec[];
}

export interface MainHostFactoryResult {
  sliceId: string;
  host: MainSliceHost;
}

export interface MainHostDiscoveryIssue {
  code:
    | "INVALID_HOST_ENTRY"
    | "HANDLER_CHANNEL_NOT_ALLOWED"
    | "HANDLER_HANDLER_MISSING"
    | "DUPLICATE_CHANNEL"
    | "MODULE_LOAD_FAILURE"
    | "HOST_FACTORY_FAILURE"
    | ModuleSchemaIssueCode;
  severity: "warning" | "error";
  sliceId: string;
  channel?: string;
  message: string;
}

export interface MainHostDiscoveryResult {
  hosts: MainSliceHost[];
  issues: MainHostDiscoveryIssue[];
}

export type MainHostFactory = (context: MainHostContext) => MainSliceHost | null | undefined;

export interface MainHostContext {
  shellCoreService: ShellCoreService;
  documentInboxService: DocumentInboxService;
  voucherAndProofService: VoucherAndProofService;
  documentReviewService: DocumentReviewService;
  entityRegistryService: EntityRegistryService;
  invoiceAndPaymentService: InvoiceAndPaymentService;
  obligationsAndCasesService: ObligationsAndCasesService;
  searchAndIndexService: SearchAndIndexService;
  reportsLiteService: ReportsLiteService;
  retirementBaselineService: RetirementBaselineService;
  transactionImportService: TransactionImportService;
  holdingsAndEventsService: HoldingsAndEventsService;
  bootstrapIntakeService: BootstrapIntakeService;
  bootstrapPreprocessService: BootstrapPreprocessService;
  bootstrapStageService: BootstrapStageService;
  bootstrapReviewService: BootstrapReviewService;
  bootstrapCommitService: BootstrapCommitService;
  bootstrapAuditService: BootstrapAuditService;
  bootstrapPilotDashboardService: BootstrapPilotDashboardService;
}
