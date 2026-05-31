import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type { BootstrapCommitInput, BootstrapCommitObject, BootstrapCommitResult, BootstrapCommitSummary } from "../contracts";
import { BootstrapCommitRepository } from "./BootstrapCommitRepository";

export class BootstrapCommitService {
  constructor(
    private readonly repository: BootstrapCommitRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async runCommit(input: BootstrapCommitInput): Promise<BootstrapCommitResult> {
    const stageBatchId = input.stageBatchId.trim();
    if (!stageBatchId) {
      throw new AppError({
        code: "BUSINESS_COMMIT_STAGE_BATCH_REQUIRED",
        message: "stageBatchId maste anges.",
        type: "business"
      });
    }

    const stageDecisions = await this.repository.listStageDecisions(stageBatchId);
    if (stageDecisions.length === 0) {
      throw new AppError({
        code: "BUSINESS_COMMIT_STAGE_BATCH_NOT_FOUND",
        message: `Stagebatch ${stageBatchId} kunde inte hittas eller var tom.`,
        type: "business"
      });
    }

    const preprocessPayload = await this.repository.getPreprocessPayload(stageDecisions[0].preprocessBatchId);
    if (!preprocessPayload) {
      throw new AppError({
        code: "BUSINESS_COMMIT_PREPROCESS_MISSING",
        message: "Preprocesspayload saknas for stagebatch.",
        type: "business"
      });
    }

    const records = Array.isArray(preprocessPayload.records)
      ? (preprocessPayload.records as Array<Record<string, unknown>>)
      : [];
    const recordById = new Map<string, Record<string, unknown>>();
    records.forEach((record) => {
      if (typeof record.record_id === "string") {
        recordById.set(record.record_id, record);
      }
    });

    const eligible = [] as typeof stageDecisions;
    for (const decision of stageDecisions) {
      if (decision.status === "ready") {
        eligible.push(decision);
        continue;
      }
      const review = await this.repository.getReviewDecision(stageBatchId, decision.recordId);
      if (review && (review.actionStatus === "approved" || review.actionStatus === "accepted-incomplete")) {
        eligible.push(decision);
      }
    }

    if (eligible.length === 0) {
      throw new AppError({
        code: "BUSINESS_COMMIT_NO_ELIGIBLE_RECORDS",
        message: "Inga commit-eligible records hittades.",
        type: "business"
      });
    }
    const committedRecordIds = await this.repository.listCommittedRecordIdsForStageBatch(stageBatchId);
    const pending = eligible.filter((item) => !committedRecordIds.has(item.recordId));
    const alreadyCommittedCount = eligible.length - pending.length;

    if (pending.length === 0) {
      const latest = await this.repository.findLatestCommitByStageBatch(stageBatchId);
      if (!latest) {
        throw new AppError({
          code: "TECHNICAL_COMMIT_REPLAY_STATE_MISSING",
          message: "Replay upptacktes men tidigare commitbatch kunde inte hittas.",
          type: "technical"
        });
      }
      return {
        ...latest,
        totalEligible: eligible.length,
        alreadyCommittedCount,
        replayed: true
      };
    }

    const committedAt = this.nowProvider().toISOString();
    const commitBatchId = await this.sequenceStore.next("CB");
    const objects: BootstrapCommitObject[] = [];

    for (const decision of pending) {
      const record = recordById.get(decision.recordId) ?? {};
      if (decision.recordType === "supplier_invoice_record") {
        const invoiceId = await this.sequenceStore.next("I");
        await this.repository.insertInvoice({
          invoiceId,
          entityId: typeof record.entity_id === "string" ? record.entity_id : "E000000",
          supplierName: typeof record.supplier_name === "string" ? record.supplier_name : "Unknown supplier",
          grossAmount: typeof record.gross_amount === "number" ? record.gross_amount : 1
        });
        objects.push({
          recordId: decision.recordId,
          recordType: decision.recordType,
          objectType: "Leverantorsfaktura",
          objectId: invoiceId
        });
      } else if (decision.recordType === "payment_event_record") {
        const paymentId = await this.sequenceStore.next("P");
        await this.repository.insertPaymentEvent({
          paymentId,
          entityId: typeof record.entity_id === "string" ? record.entity_id : "E000000",
          amount: typeof record.amount === "number" ? record.amount : 1,
          paymentDate: typeof record.payment_date === "string" ? record.payment_date : committedAt.slice(0, 10)
        });
        objects.push({
          recordId: decision.recordId,
          recordType: decision.recordType,
          objectType: "Betalhandelse",
          objectId: paymentId
        });
      } else if (decision.recordType === "voucher_link_record") {
        const voucherId = await this.sequenceStore.next("V");
        const documentId = await this.sequenceStore.next("D");
        await this.repository.insertInboxDocument({
          documentId,
          fileName: `${decision.recordId}.bin`,
          sourceFileId: decision.sourceFileId,
          createdAt: committedAt
        });
        await this.repository.insertVoucher({
          voucherId,
          title: `Voucher ${decision.recordId}`,
          sourceDocumentId: documentId,
          sourceFileId: decision.sourceFileId,
          createdAt: committedAt
        });
        objects.push({
          recordId: decision.recordId,
          recordType: decision.recordType,
          objectType: "Verifikat",
          objectId: voucherId
        });
      } else {
        const documentId = await this.sequenceStore.next("D");
        await this.repository.insertInboxDocument({
          documentId,
          fileName: typeof record.title === "string" ? record.title : `${decision.recordId}.bin`,
          sourceFileId: decision.sourceFileId,
          createdAt: committedAt
        });
        objects.push({
          recordId: decision.recordId,
          recordType: decision.recordType,
          objectType: "Dokument",
          objectId: documentId
        });
      }
    }

    await this.repository.saveCommit({
      commitBatchId,
      stageBatchId,
      committedAt,
      objects
    });

    for (const obj of objects) {
      const source = pending.find((item) => item.recordId === obj.recordId)?.sourceFileId ?? "unknown";
      await this.repository.updateProofSourceFileId(commitBatchId, obj.recordId, source);
    }

    const saved = await this.repository.getCommit(commitBatchId);
    if (!saved) {
      throw new AppError({
        code: "TECHNICAL_COMMIT_SAVE_FAILED",
        message: "Kunde inte lasa sparad commitbatch.",
        type: "technical"
      });
    }

    return {
      ...saved,
      totalEligible: eligible.length,
      alreadyCommittedCount,
      replayed: false
    };
  }

  async listCommits(): Promise<BootstrapCommitSummary[]> {
    return this.repository.listCommits();
  }

  async getCommit(commitBatchId: string): Promise<BootstrapCommitResult> {
    const batch = await this.repository.getCommit(commitBatchId);
    if (!batch) {
      throw new AppError({
        code: "BUSINESS_COMMIT_BATCH_NOT_FOUND",
        message: `Commitbatch ${commitBatchId} kunde inte hittas.`,
        type: "business"
      });
    }
    return batch;
  }
}
