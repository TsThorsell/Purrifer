export type StageStatus = "ready" | "needs-review" | "rejected";

export interface StageRunInput {
  preprocessBatchId: string;
}

export interface StageRecordDecision {
  recordId: string;
  recordType: string;
  sourceFileId: string;
  status: StageStatus;
  reasonCodes: string[];
}

export interface StageBatchSummary {
  stageBatchId: string;
  preprocessBatchId: string;
  createdAt: string;
  totalRecords: number;
  readyCount: number;
  needsReviewCount: number;
  rejectedCount: number;
}

export interface StageBatchDetails extends StageBatchSummary {
  decisions: StageRecordDecision[];
}

export interface BootstrapStageApi {
  runStageGate(input: StageRunInput): Promise<StageBatchDetails>;
  listStageBatches(): Promise<StageBatchSummary[]>;
  getStageBatch(stageBatchId: string): Promise<StageBatchDetails>;
}

export const bootstrapStageChannels = {
  runStageGate: "bootstrap-stage:run-gate",
  listStageBatches: "bootstrap-stage:list-batches",
  getStageBatch: "bootstrap-stage:get-batch"
} as const;

