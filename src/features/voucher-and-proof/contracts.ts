import type { InboxItemSummary } from "@features/document-inbox/contracts";

export type VoucherVerificationStatus = "full" | "half" | "accepted-incomplete";

export interface VoucherSummary {
  voucherId: string;
  title: string;
  verificationStatus: VoucherVerificationStatus;
  createdAt: string;
  sourceDocumentId: string;
  sourceFileName: string;
}

export interface VoucherDetails extends VoucherSummary {
  sourceStoredPath: string;
  sourceMimeType: string;
  sourceReceivedAt: string;
  notes?: string;
}

export interface VoucherBackupResult {
  backupDirectory: string;
  metadataPath: string;
  sourcePath: string;
}

export interface VoucherCandidate extends InboxItemSummary {
  alreadyLinked: boolean;
}

export interface VoucherAndProofApi {
  listVouchers(): Promise<VoucherSummary[]>;
  getVoucher(voucherId: string): Promise<VoucherDetails>;
  listVoucherCandidates(): Promise<VoucherCandidate[]>;
  createVoucherFromDocument(documentId: string): Promise<VoucherDetails>;
  setVoucherVerificationStatus(
    voucherId: string,
    status: VoucherVerificationStatus
  ): Promise<VoucherDetails>;
  exportVoucherBackup(voucherId: string): Promise<VoucherBackupResult | null>;
  openVoucherSourceDocument(voucherId: string): Promise<void>;
}

export const voucherAndProofChannels = {
  listVouchers: "voucher-and-proof:list-vouchers",
  getVoucher: "voucher-and-proof:get-voucher",
  listVoucherCandidates: "voucher-and-proof:list-candidates",
  createVoucherFromDocument: "voucher-and-proof:create-from-document",
  setVoucherVerificationStatus: "voucher-and-proof:set-verification-status",
  exportVoucherBackup: "voucher-and-proof:export-backup",
  openVoucherSourceDocument: "voucher-and-proof:open-source-document"
} as const;

