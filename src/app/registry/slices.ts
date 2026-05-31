import type { AppNavigationItem } from "./routes";
import { shellCoreManifest } from "@features/shell-core/slice.manifest";
import { searchAndIndexManifest } from "@features/search-and-index/slice.manifest";
import { reportsLiteManifest } from "@features/reports-lite/slice.manifest";
import { retirementBaselineManifest } from "@features/retirement-baseline/slice.manifest";
import { transactionImportManifest } from "@features/transaction-import/slice.manifest";
import { holdingsAndEventsManifest } from "@features/holdings-and-events/slice.manifest";
import { bootstrapIntakeManifest } from "@features/bootstrap-intake/slice.manifest";
import { bootstrapPreprocessManifest } from "@features/bootstrap-preprocess/slice.manifest";
import { bootstrapContractManifest } from "@features/bootstrap-contract/slice.manifest";
import { bootstrapStageManifest } from "@features/bootstrap-stage/slice.manifest";
import { bootstrapReviewManifest } from "@features/bootstrap-review/slice.manifest";
import { bootstrapCommitManifest } from "@features/bootstrap-commit/slice.manifest";
import { bootstrapAuditManifest } from "@features/bootstrap-audit/slice.manifest";
import { bootstrapPilotDashboardManifest } from "@features/bootstrap-pilot-dashboard/slice.manifest";
import { documentInboxManifest } from "@features/document-inbox/slice.manifest";
import { documentReviewManifest } from "@features/document-review/slice.manifest";
import { entityRegistryManifest } from "@features/entity-registry/slice.manifest";
import { invoiceAndPaymentManifest } from "@features/invoice-and-payment/slice.manifest";
import { obligationsAndCasesManifest } from "@features/obligations-and-cases/slice.manifest";
import { voucherAndProofManifest } from "@features/voucher-and-proof/slice.manifest";

export interface SliceManifest {
  sliceId: string;
  displayName: string;
  moduleDocPath: string;
  ownedAreas: string[];
  navigation: AppNavigationItem[];
}

export const sliceRegistry: SliceManifest[] = [
  shellCoreManifest,
  searchAndIndexManifest,
  reportsLiteManifest,
  retirementBaselineManifest,
  transactionImportManifest,
  bootstrapIntakeManifest,
  bootstrapPreprocessManifest,
  bootstrapStageManifest,
  bootstrapReviewManifest,
  bootstrapCommitManifest,
  bootstrapAuditManifest,
  bootstrapPilotDashboardManifest,
  bootstrapContractManifest,
  holdingsAndEventsManifest,
  documentInboxManifest,
  documentReviewManifest,
  entityRegistryManifest,
  invoiceAndPaymentManifest,
  obligationsAndCasesManifest,
  voucherAndProofManifest
];

export const appNavigation: AppNavigationItem[] = sliceRegistry.flatMap(
  (manifest) => manifest.navigation
);

