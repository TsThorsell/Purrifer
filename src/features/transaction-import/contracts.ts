export type ImportFileType = "csv" | "xlsx";

export interface ImportedTransactionRow {
  rowNumber: number;
  date?: string;
  description?: string;
  amount?: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface ImportPreview {
  batchId: string;
  fileName: string;
  fileType: ImportFileType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportedTransactionRow[];
}

export interface ImportBatchSummary {
  batchId: string;
  fileName: string;
  fileType: ImportFileType;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ImportBatchDetails extends ImportBatchSummary {
  rows: ImportedTransactionRow[];
}

export type ImportObjectType =
  | "leverantorsfaktura"
  | "betalhandelse"
  | "verifikat"
  | "atagande"
  | "arende"
  | "innehavshandelse"
  | "ovrigt";

export interface ImportReviewEntity {
  entityId: string;
  name: string;
}

export interface ImportReviewAccount {
  accountId: string;
  entityId: string;
  name: string;
}

export interface ImportRowMapping {
  batchId: string;
  rowNumber: number;
  entityId?: string;
  accountId?: string;
  objectType?: ImportObjectType;
  updatedAt: string;
}

export interface ImportReviewRow extends ImportedTransactionRow {
  mapping?: ImportRowMapping;
  isMapped: boolean;
}

export interface ImportReview {
  batch: ImportBatchDetails;
  entities: ImportReviewEntity[];
  accounts: ImportReviewAccount[];
  rows: ImportReviewRow[];
}

export interface SaveImportRowMappingInput {
  batchId: string;
  rowNumber: number;
  entityId: string;
  accountId: string;
  objectType: ImportObjectType;
}

export interface ImportCommitRow {
  rowNumber: number;
  entityId: string;
  accountId: string;
  objectType: ImportObjectType;
}

export interface ImportCommitResult {
  commitId: string;
  batchId: string;
  committedAt: string;
  totalRows: number;
  committedRows: number;
  rows: ImportCommitRow[];
}

export interface TransactionImportApi {
  selectAndPreviewImportFile(): Promise<ImportPreview | null>;
  listImportBatches(): Promise<ImportBatchSummary[]>;
  getImportBatch(batchId: string): Promise<ImportBatchDetails>;
  getImportReview(batchId: string): Promise<ImportReview>;
  saveImportRowMapping(input: SaveImportRowMappingInput): Promise<ImportRowMapping>;
  commitImportBatch(batchId: string): Promise<ImportCommitResult>;
}

export const transactionImportChannels = {
  selectAndPreviewImportFile: "transaction-import:select-and-preview-file",
  listImportBatches: "transaction-import:list-batches",
  getImportBatch: "transaction-import:get-batch",
  getImportReview: "transaction-import:get-import-review",
  saveImportRowMapping: "transaction-import:save-row-mapping",
  commitImportBatch: "transaction-import:commit-batch"
} as const;
