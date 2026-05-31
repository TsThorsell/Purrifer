export type ReviewActionStatus = "approved" | "accepted-incomplete" | "rejected";

export interface ReviewQueueItem {
  stageBatchId: string;
  recordId: string;
  recordType: string;
  sourceFileId: string;
  reasonCodes: string[];
}

export interface ListReviewQueueInput {
  stageBatchId?: string;
}

export interface BulkReviewActionInput {
  stageBatchId: string;
  recordIds: string[];
  actionStatus: ReviewActionStatus;
  reviewNote: string;
}

export interface ReviewActionResult {
  updatedCount: number;
}

export interface BootstrapReviewApi {
  listNeedsReviewQueue(input?: ListReviewQueueInput): Promise<ReviewQueueItem[]>;
  applyBulkAction(input: BulkReviewActionInput): Promise<ReviewActionResult>;
}

export const bootstrapReviewChannels = {
  listNeedsReviewQueue: "bootstrap-review:list-needs-review",
  applyBulkAction: "bootstrap-review:apply-bulk-action"
} as const;
