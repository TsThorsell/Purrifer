import type { InboxItemSummary } from "@features/document-inbox/contracts";

export type VoucherVerificationStatus = "full" | "half" | "accepted-incomplete";
export type VoucherRelationType = "primary-source" | "supporting-document";

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

export interface VoucherDocumentRelation {
  voucherId: string;
  documentId: string;
  documentFileName: string;
  relationType: VoucherRelationType;
  linkedBy: string;
  linkedAt: string;
}

export interface VoucherStatusHistoryEntry {
  historyId: number;
  voucherId: string;
  previousStatus: VoucherVerificationStatus | null;
  newStatus: VoucherVerificationStatus;
  reasonCode?: string;
  actor: string;
  changedAt: string;
}

export interface VoucherProofChainLink {
  commitBatchId: string;
  recordId: string;
  recordType: string;
  sourceFileId: string;
  stageStatus: string;
  stageCreatedAt: string;
  reviewActionStatus?: string;
  reviewNote?: string;
  reviewAt?: string;
  committedAt: string;
  objectType: string;
  objectId: string;
}

export interface VoucherAndProofApi {
  listVouchers(): Promise<VoucherSummary[]>;
  getVoucher(voucherId: string): Promise<VoucherDetails>;
  listVoucherCandidates(): Promise<VoucherCandidate[]>;
  createVoucherFromDocument(documentId: string): Promise<VoucherDetails>;
  listVoucherRelations(voucherId: string): Promise<VoucherDocumentRelation[]>;
  linkVoucherToDocument(
    voucherId: string,
    documentId: string,
    relationType?: VoucherRelationType
  ): Promise<VoucherDocumentRelation>;
  setVoucherVerificationStatus(
    voucherId: string,
    status: VoucherVerificationStatus
  ): Promise<VoucherDetails>;
  getVoucherStatusHistory(voucherId: string): Promise<VoucherStatusHistoryEntry[]>;
  getVoucherProofChain(voucherId: string): Promise<VoucherProofChainLink[]>;
  exportVoucherBackup(voucherId: string): Promise<VoucherBackupResult | null>;
  openVoucherSourceDocument(voucherId: string): Promise<void>;
}

export const voucherAndProofChannels = {
  listVouchers: "voucher-and-proof:list-vouchers",
  getVoucher: "voucher-and-proof:get-voucher",
  listVoucherCandidates: "voucher-and-proof:list-candidates",
  createVoucherFromDocument: "voucher-and-proof:create-from-document",
  listVoucherRelations: "voucher-and-proof:list-relations",
  linkVoucherToDocument: "voucher-and-proof:link-document",
  getVoucherStatusHistory: "voucher-and-proof:get-status-history",
  getVoucherProofChain: "voucher-and-proof:get-proof-chain",
  setVoucherVerificationStatus: "voucher-and-proof:set-verification-status",
  exportVoucherBackup: "voucher-and-proof:export-backup",
  openVoucherSourceDocument: "voucher-and-proof:open-source-document"
} as const;


