export type RawIngestFileStatus = "new" | "duplicate" | "error";

export type DuplicateScope = "batch" | "existing" | "batch-and-existing";

export interface RawIngestBatchSummary {
  ingestBatchId: string;
  sourceSystem: string;
  createdAt: string;
  scannerDeviceName?: string;
  scannerProfile?: string;
  scanMode?: "simplex" | "duplex";
  feederMode?: "flatbed" | "adf";
  scanTimestamp?: string;
  totalDiscovered: number;
  totalNew: number;
  totalDuplicates: number;
  totalErrors: number;
}

export interface RawIngestFileResult {
  fullPath: string;
  fileType: string;
  sizeBytes: number;
  hash: string | null;
  scanTimestamp?: string;
  status: RawIngestFileStatus;
  duplicateScope?: DuplicateScope;
  errorMessage?: string;
}

export interface RawIngestBatchDetails extends RawIngestBatchSummary {
  sourceFolders: string[];
  files: RawIngestFileResult[];
}

export interface RawIngestStartInput {
  sourceSystem: string;
}

export interface ScannerCapabilities {
  driver: "twain-wia";
  deviceName: string;
  profile: string;
  supportsAdf: boolean;
  supportsDuplex: boolean;
}

export interface ScannerBatchInput {
  sourceSystem?: string;
  preferredDeviceName?: string;
  scannerProfile?: string;
  feederMode?: "flatbed" | "adf";
  scanMode?: "simplex" | "duplex";
}

export interface RawIngestApi {
  selectFoldersAndIngest(input: RawIngestStartInput): Promise<RawIngestBatchDetails | null>;
  getScannerCapabilities(): Promise<ScannerCapabilities>;
  scanToBatch(input?: ScannerBatchInput): Promise<RawIngestBatchDetails | null>;
  listBatches(): Promise<RawIngestBatchSummary[]>;
  getBatch(ingestBatchId: string): Promise<RawIngestBatchDetails>;
}

export const bootstrapIntakeChannels = {
  selectFoldersAndIngest: "bootstrap-intake:select-folders-and-ingest",
  getScannerCapabilities: "bootstrap-intake:get-scanner-capabilities",
  scanToBatch: "bootstrap-intake:scan-to-batch",
  listBatches: "bootstrap-intake:list-batches",
  getBatch: "bootstrap-intake:get-batch"
} as const;
