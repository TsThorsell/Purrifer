import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dialog, shell, type BrowserWindow } from "electron";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type { InboxItemDetails, InboxItemSummary } from "@features/document-inbox/contracts";
import { AppError } from "@app/shared/errors/AppError";
import type {
  VoucherDocumentRelation,
  VoucherProofChainLink,
  VoucherRelationType,
  VoucherStatusHistoryEntry,
  VoucherBackupResult,
  VoucherCandidate,
  VoucherDetails,
  VoucherSummary,
  VoucherVerificationStatus
} from "../contracts";
import { JsonVoucherRepository } from "./JsonVoucherRepository";

const VALID_VOUCHER_STATUSES = new Set<VoucherVerificationStatus>([
  "full",
  "half",
  "accepted-incomplete"
]);

const DEFAULT_ACTOR = "operator";

export interface DocumentInboxReadApi {
  getInboxItem(documentId: string): Promise<InboxItemDetails>;
  listInboxItems(): Promise<InboxItemSummary[]>;
  openStoredDocument(documentId: string): Promise<void>;
}

export class VoucherAndProofService {
  constructor(
    private readonly repository: JsonVoucherRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly documentInboxApi: DocumentInboxReadApi,
    private readonly nowProvider: () => Date = () => new Date()
  ) {}

  async listVouchers(): Promise<VoucherSummary[]> {
    return this.repository.list();
  }

  async listVoucherRelations(voucherId: string): Promise<VoucherDocumentRelation[]> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    await this.getVoucher(trimmedVoucherId);
    return this.repository.listDocumentRelations(trimmedVoucherId);
  }

  async getVoucher(voucherId: string): Promise<VoucherDetails> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    const voucher = await this.repository.findById(trimmedVoucherId);
    if (!voucher) {
      throw new AppError({
        code: "BUSINESS_VOUCHER_NOT_FOUND",
        message: `Verifikat ${trimmedVoucherId} kunde inte hittas.`,
        type: "business"
      });
    }
    return voucher;
  }

  async listVoucherCandidates(): Promise<VoucherCandidate[]> {
    const [items, relations] = await Promise.all([
      this.documentInboxApi.listInboxItems(),
      this.repository.listAllDocumentRelations()
    ]);
    const linkedIds = new Set(relations.map((entry) => entry.documentId));

    return items.map((item) => ({
      ...item,
      alreadyLinked: linkedIds.has(item.documentId)
    }));
  }

  async createVoucherFromDocument(documentId: string): Promise<VoucherDetails> {
    const trimmedDocumentId = this.normalizeId(documentId, "BUSINESS_DOCUMENT_ID_REQUIRED", "Dokument-id krävs.");
    const now = this.nowProvider().toISOString();

    const existing = await this.repository.findBySourceDocumentId(trimmedDocumentId);
    if (existing) {
      const existingPrimary = await this.repository.findPrimaryRelationForVoucher(existing.voucherId);
      if (!existingPrimary) {
        await this.repository.upsertDocumentRelation(
          existing.voucherId,
          trimmedDocumentId,
          "primary-source",
          DEFAULT_ACTOR,
          now
        );
      }
      return existing;
    }

    const existingPrimary = await this.repository.findPrimaryRelationByDocument(trimmedDocumentId);
    if (existingPrimary) {
      return this.getVoucher(existingPrimary.voucherId);
    }

    const document = await this.documentInboxApi.getInboxItem(trimmedDocumentId);
    const voucherId = await this.sequenceStore.next("V");
    const voucher: VoucherDetails = {
      voucherId,
      title: `Verifikat för ${document.fileName}`,
      verificationStatus: "half",
      createdAt: now,
      sourceDocumentId: document.documentId,
      sourceFileName: document.fileName,
      sourceStoredPath: document.storedPath,
      sourceMimeType: document.mimeType,
      sourceReceivedAt: document.receivedAt,
      notes: document.textPreview ? "Skapat från inkorgspost med textförhandsvisning." : undefined
    };

    await this.repository.upsert(voucher);
    await this.repository.upsertDocumentRelation(
      voucherId,
      trimmedDocumentId,
      "primary-source",
      DEFAULT_ACTOR,
      now
    );
    await this.repository.insertStatusHistory(
      voucherId,
      null,
      voucher.verificationStatus,
      DEFAULT_ACTOR,
      now,
      "VOUCHER_CREATED"
    );

    return voucher;
  }

  async setVoucherVerificationStatus(
    voucherId: string,
    status: VoucherVerificationStatus
  ): Promise<VoucherDetails> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    const normalizedStatus = this.normalizeVoucherStatus(status);
    const voucher = await this.getVoucher(trimmedVoucherId);

    if (voucher.verificationStatus === normalizedStatus) {
      return voucher;
    }

    const updated: VoucherDetails = {
      ...voucher,
      verificationStatus: normalizedStatus
    };

    await this.repository.insertStatusHistory(
      trimmedVoucherId,
      voucher.verificationStatus,
      normalizedStatus,
      DEFAULT_ACTOR,
      this.nowProvider().toISOString(),
      "VOUCHER_STATUS_UPDATED"
    );
    await this.repository.upsert(updated);

    return updated;
  }

  async linkVoucherToDocument(
    voucherId: string,
    documentId: string,
    relationType: VoucherRelationType = "supporting-document"
  ): Promise<VoucherDocumentRelation> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    const trimmedDocumentId = this.normalizeId(documentId, "BUSINESS_DOCUMENT_ID_REQUIRED", "Dokument-id krävs.");
    const normalizedRelationType = this.normalizeRelationType(relationType);

    const voucher = await this.getVoucher(trimmedVoucherId);
    await this.documentInboxApi.getInboxItem(trimmedDocumentId);

    const duplicate = await this.repository.findRelation(
      trimmedVoucherId,
      trimmedDocumentId,
      normalizedRelationType
    );
    if (duplicate) {
      throw new AppError({
        code: "BUSINESS_VOUCHER_DOCUMENT_LINK_DUPLICATE",
        message: `Dokumentet är redan länkad med relationstypen ${normalizedRelationType}.`,
        type: "business"
      });
    }

    if (normalizedRelationType === "primary-source") {
      const existingPrimary = await this.repository.findPrimaryRelationForVoucher(trimmedVoucherId);
      if (existingPrimary) {
        throw new AppError({
          code: "BUSINESS_VOUCHER_PRIMARY_LINK_EXISTS",
          message: `Verifikat ${trimmedVoucherId} har redan en huvudkälla.`,
          type: "business"
        });
      }

      const usedByOtherVoucher = await this.repository.findPrimaryRelationForDocument(trimmedDocumentId);
      if (usedByOtherVoucher) {
        throw new AppError({
          code: "BUSINESS_DOCUMENT_LINKED_TO_OTHER_VOUCHER",
          message: `Dokumentet är redan huvudkälla i verifikat ${usedByOtherVoucher.voucherId}.`,
          type: "business"
        });
      }
    }

    const now = this.nowProvider().toISOString();
    const link = await this.repository.upsertDocumentRelation(
      trimmedVoucherId,
      trimmedDocumentId,
      normalizedRelationType,
      DEFAULT_ACTOR,
      now
    );

    await this.repository.insertStatusHistory(
      trimmedVoucherId,
      voucher.verificationStatus,
      voucher.verificationStatus,
      DEFAULT_ACTOR,
      now,
      normalizedRelationType === "primary-source" ? "VOUCHER_PRIMARY_LINK_CREATED" : "VOUCHER_LINK_CREATED"
    );

    return link;
  }

  async getVoucherStatusHistory(voucherId: string): Promise<VoucherStatusHistoryEntry[]> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    await this.getVoucher(trimmedVoucherId);
    return this.repository.listStatusHistory(trimmedVoucherId);
  }

  async getVoucherProofChain(voucherId: string): Promise<VoucherProofChainLink[]> {
    const trimmedVoucherId = this.normalizeId(voucherId, "BUSINESS_VOUCHER_ID_REQUIRED", "Voucher-id krävs.");
    await this.getVoucher(trimmedVoucherId);
    const proofChain = await this.repository.listVoucherProofChain(trimmedVoucherId);
    if (proofChain.length > 0) {
      return proofChain;
    }

    const relations = await this.repository.listDocumentRelations(trimmedVoucherId);
    return relations.map((relation) => ({
      commitBatchId: `manual-${trimmedVoucherId}`,
      recordId: `${relation.documentId}-${relation.relationType}`,
      recordType: "manual-relation",
      sourceFileId: relation.documentId,
      stageStatus: relation.relationType === "primary-source" ? "primary-bound" : "supporting-bound",
      stageCreatedAt: relation.linkedAt,
      reviewActionStatus: "manual",
      reviewNote: `Manuell relationslänk (${relation.relationType}).`,
      reviewAt: relation.linkedAt,
      committedAt: relation.linkedAt,
      objectType: "Verifikat",
      objectId: trimmedVoucherId
    }));
  }

  async exportVoucherBackup(
    voucherId: string,
    window: BrowserWindow
  ): Promise<VoucherBackupResult | null> {
    const voucher = await this.getVoucher(voucherId);
    const selection = await dialog.showOpenDialog(window, {
      title: "Välj backupmapp för verifikat",
      properties: ["openDirectory", "createDirectory"]
    });

    if (selection.canceled || selection.filePaths.length === 0) {
      return null;
    }

    const backupDirectory = selection.filePaths[0];
    await mkdir(backupDirectory, { recursive: true });

    const extension = path.extname(voucher.sourceFileName) || ".bin";
    const sourcePath = path.join(backupDirectory, `${voucher.voucherId}_UL${extension}`);
    const metadataPath = path.join(backupDirectory, `${voucher.voucherId}_MD.md`);

    await copyFile(voucher.sourceStoredPath, sourcePath);
    await writeFile(metadataPath, buildVoucherMarkdown(voucher), "utf8");

    return {
      backupDirectory,
      metadataPath,
      sourcePath
    };
  }

  async openVoucherSourceDocument(voucherId: string): Promise<void> {
    const voucher = await this.getVoucher(voucherId);
    await shell.openPath(voucher.sourceStoredPath);
  }

  private normalizeVoucherStatus(rawValue: string): VoucherVerificationStatus {
    const trimmed = rawValue.trim();
    if (VALID_VOUCHER_STATUSES.has(trimmed as VoucherVerificationStatus)) {
      return trimmed as VoucherVerificationStatus;
    }

    throw new AppError({
      code: "BUSINESS_VOUCHER_STATUS_INVALID",
      message: `Verifieringsstatus ${rawValue} stöds inte.`,
      type: "business"
    });
  }

  private normalizeRelationType(value: string): VoucherRelationType {
    const trimmed = value.trim();
    if (trimmed === "primary-source" || trimmed === "supporting-document") {
      return trimmed;
    }

    throw new AppError({
      code: "BUSINESS_VOUCHER_RELATION_TYPE_INVALID",
      message: "Relationstyp stöds inte.",
      type: "business"
    });
  }

  private normalizeId(value: string, code: string, message: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new AppError({
        code,
        message,
        type: "business"
      });
    }

    return trimmed;
  }
}

function buildVoucherMarkdown(voucher: VoucherDetails): string {
  return [
    `# ${voucher.voucherId}`,
    "",
    `- Titel: ${voucher.title}`,
    `- Verifieringsstatus: ${voucher.verificationStatus}`,
    `- Skapad: ${voucher.createdAt}`,
    `- Dokument-id: ${voucher.sourceDocumentId}`,
    `- Filnamn: ${voucher.sourceFileName}`,
    `- MIME-typ: ${voucher.sourceMimeType}`,
    `- Mottagen: ${voucher.sourceReceivedAt}`,
    `- Lagrad sökväg: ${voucher.sourceStoredPath}`,
    voucher.notes ? `- Notering: ${voucher.notes}` : null
  ]
    .filter(Boolean)
    .join("\n");
}
