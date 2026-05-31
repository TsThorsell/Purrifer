export interface PreprocessRunInput {
  ingestBatchId: string;
  sourceExportedAt?: string;
}

export interface PreprocessRunSummary {
  preprocessBatchId: string;
  ingestBatchId: string;
  schemaVersion: string;
  sourceSystem: string;
  sourceExportedAt?: string;
  createdAt: string;
  totalRecords: number;
  validationOk: boolean;
  validationErrorCount: number;
}

export interface PreprocessRunDetails extends PreprocessRunSummary {
  payloadJson: string;
}

export interface BootstrapPreprocessApi {
  runPreprocess(input: PreprocessRunInput): Promise<PreprocessRunDetails>;
  listPreprocessBatches(): Promise<PreprocessRunSummary[]>;
  getPreprocessBatch(preprocessBatchId: string): Promise<PreprocessRunDetails>;
}

export const bootstrapPreprocessChannels = {
  runPreprocess: "bootstrap-preprocess:run",
  listPreprocessBatches: "bootstrap-preprocess:list-batches",
  getPreprocessBatch: "bootstrap-preprocess:get-batch"
} as const;
