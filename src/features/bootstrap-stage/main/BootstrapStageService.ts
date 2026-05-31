import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { validateCanonicalImportBatch } from "@features/bootstrap-contract/main/validateCanonicalImportBatch";
import type { StageBatchDetails, StageBatchSummary, StageRecordDecision, StageRunInput } from "../contracts";
import { BootstrapStageRepository } from "./BootstrapStageRepository";

interface CanonicalPayload {
  schema_version: string;
  ingest_batch_id: string;
  source_system: string;
  records: Array<Record<string, unknown>>;
}

export class BootstrapStageService {
  constructor(
    private readonly repository: BootstrapStageRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async runStageGate(input: StageRunInput): Promise<StageBatchDetails> {
    const preprocessBatchId = input.preprocessBatchId.trim();
    if (!preprocessBatchId) {
      throw new AppError({
        code: "BUSINESS_STAGE_PREPROCESS_BATCH_REQUIRED",
        message: "preprocessBatchId maste anges.",
        type: "business"
      });
    }

    const preprocess = await this.repository.getPreprocessPayload(preprocessBatchId);
    if (!preprocess) {
      throw new AppError({
        code: "BUSINESS_STAGE_PREPROCESS_BATCH_NOT_FOUND",
        message: `Preprocessbatch ${preprocessBatchId} kunde inte hittas.`,
        type: "business"
      });
    }

    const payload = JSON.parse(preprocess.payloadJson) as CanonicalPayload;
    const validation = validateCanonicalImportBatch(payload);

    const entityIds = await this.repository.getEntityIds();
    const accountMap = await this.repository.getAccountMap();
    const seenInRun = new Set<string>();

    const decisions: StageRecordDecision[] = [];
    const fingerprints: string[] = [];

    for (let i = 0; i < payload.records.length; i += 1) {
      const record = payload.records[i];
      const recordId = typeof record.record_id === "string" ? record.record_id : `unknown-${i + 1}`;
      const recordType = typeof record.record_type === "string" ? record.record_type : "unknown";
      const sourceFileId = typeof record.source_file_id === "string" ? record.source_file_id : "unknown";
      const fingerprint = `${recordType}::${recordId}::${sourceFileId}`;

      const reasonCodes: string[] = [];

      if (seenInRun.has(fingerprint)) {
        reasonCodes.push("DUPLICATE_IN_STAGE_BATCH");
      } else {
        seenInRun.add(fingerprint);
      }

      if (await this.repository.hasHistoricalRecordFingerprint(fingerprint)) {
        reasonCodes.push("DUPLICATE_IN_PREVIOUS_STAGE");
      }

      const recordValidationErrors = validation.errors.filter((err) => err.path.startsWith(`records[${i}]`));
      if (recordValidationErrors.length > 0) {
        reasonCodes.push("SCHEMA_VALIDATION_FAILED");
      }

      const entityId = typeof record.entity_id === "string" ? record.entity_id : undefined;
      const accountId = typeof record.account_id === "string" ? record.account_id : undefined;

      if (entityId && !entityIds.has(entityId)) {
        reasonCodes.push("REFERENCE_ENTITY_NOT_FOUND");
      }

      if (accountId) {
        const accountEntityId = accountMap.get(accountId);
        if (!accountEntityId) {
          reasonCodes.push("REFERENCE_ACCOUNT_NOT_FOUND");
        } else if (entityId && accountEntityId !== entityId) {
          reasonCodes.push("REFERENCE_ACCOUNT_ENTITY_MISMATCH");
        }
      }

      let status: StageRecordDecision["status"];
      if (reasonCodes.includes("SCHEMA_VALIDATION_FAILED")) {
        status = "rejected";
      } else if (reasonCodes.length > 0) {
        status = "needs-review";
      } else {
        status = "ready";
      }

      decisions.push({
        recordId,
        recordType,
        sourceFileId,
        status,
        reasonCodes
      });
      fingerprints.push(fingerprint);
    }

    const stageBatchId = await this.sequenceStore.next("SB");
    const createdAt = this.nowProvider().toISOString();

    await this.repository.saveStageBatch({
      stageBatchId,
      preprocessBatchId,
      createdAt,
      decisions,
      dedupeFingerprints: fingerprints
    });

    const saved = await this.repository.getStageBatch(stageBatchId);
    if (!saved) {
      throw new AppError({
        code: "TECHNICAL_STAGE_SAVE_FAILED",
        message: "Kunde inte lasa sparad stagebatch.",
        type: "technical"
      });
    }

    return saved;
  }

  async listStageBatches(): Promise<StageBatchSummary[]> {
    return this.repository.listStageBatches();
  }

  async getStageBatch(stageBatchId: string): Promise<StageBatchDetails> {
    const batch = await this.repository.getStageBatch(stageBatchId);
    if (!batch) {
      throw new AppError({
        code: "BUSINESS_STAGE_BATCH_NOT_FOUND",
        message: `Stagebatch ${stageBatchId} kunde inte hittas.`,
        type: "business"
      });
    }
    return batch;
  }
}
