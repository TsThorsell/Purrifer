import { AppError } from "@app/shared/errors/AppError";
import type { BulkReviewActionInput, ListReviewQueueInput, ReviewActionResult, ReviewQueueItem } from "../contracts";
import { BootstrapReviewRepository } from "./BootstrapReviewRepository";

export class BootstrapReviewService {
  constructor(
    private readonly repository: BootstrapReviewRepository,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async listNeedsReviewQueue(input?: ListReviewQueueInput): Promise<ReviewQueueItem[]> {
    return this.repository.listNeedsReviewQueue(input?.stageBatchId?.trim() || undefined);
  }

  async applyBulkAction(input: BulkReviewActionInput): Promise<ReviewActionResult> {
    const stageBatchId = input.stageBatchId.trim();
    if (!stageBatchId) {
      throw new AppError({
        code: "BUSINESS_REVIEW_STAGE_BATCH_REQUIRED",
        message: "stageBatchId maste anges.",
        type: "business"
      });
    }

    if (input.recordIds.length === 0) {
      throw new AppError({
        code: "BUSINESS_REVIEW_RECORD_IDS_REQUIRED",
        message: "Minst ett record maste valjas for bulk action.",
        type: "business"
      });
    }

    const reviewNote = input.reviewNote.trim();
    if (!reviewNote) {
      throw new AppError({
        code: "BUSINESS_REVIEW_NOTE_REQUIRED",
        message: "Review-note ar obligatorisk for manuellt beslut.",
        type: "business"
      });
    }

    let updatedCount = 0;
    const createdAt = this.nowProvider().toISOString();

    for (const recordIdRaw of input.recordIds) {
      const recordId = recordIdRaw.trim();
      if (!recordId) {
        continue;
      }

      const exists = await this.repository.hasStageRecord(stageBatchId, recordId);
      if (!exists) {
        continue;
      }

      await this.repository.applyReviewAction({
        stageBatchId,
        recordId,
        actionStatus: input.actionStatus,
        reviewNote,
        createdAt
      });
      updatedCount += 1;
    }

    return { updatedCount };
  }
}
