import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dialog, shell, type BrowserWindow } from "electron";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type { InboxItemDetails, InboxItemSummary } from "@features/document-inbox/contracts";
import type {
  VoucherBackupResult,
  VoucherCandidate,
  VoucherDetails,
  VoucherSummary,
  VoucherVerificationStatus
} from "../contracts";
import { JsonVoucherRepository } from "./JsonVoucherRepository";

export interface DocumentInboxReadApi {
  getInboxItem(documentId: string): Promise<InboxItemDetails>;
  listInboxItems(): Promise<InboxItemSummary[]>;
  openStoredDocument(documentId: string): Promise<void>;
}

export class VoucherAndProofService {
  constructor(
    private readonly repository: JsonVoucherRepository,
    private readonly sequenceStore: FileSequenceStore,
    private readonly documentInboxApi: DocumentInboxReadApi
  ) {}

  async listVouchers(): Promise<VoucherSummary[]> {
    return this.repository.list();
  }

  async getVoucher(voucherId: string): Promise<VoucherDetails> {
    const voucher = await this.repository.findById(voucherId);
    if (!voucher) {
      throw new Error(`Verifikat ${voucherId} kunde inte hittas.`);
    }
    return voucher;
  }

  async listVoucherCandidates(): Promise<VoucherCandidate[]> {
    const [items, vouchers] = await Promise.all([
      this.documentInboxApi.listInboxItems(),
      this.repository.listDetails()
    ]);
    const linkedIds = new Set(vouchers.map((voucher) => voucher.sourceDocumentId));

    return items.map((item) => ({
      ...item,
      alreadyLinked: linkedIds.has(item.documentId)
    }));
  }

  async createVoucherFromDocument(documentId: string): Promise<VoucherDetails> {
    const existing = await this.repository.findBySourceDocumentId(documentId);
    if (existing) {
      return existing;
    }

    const document = await this.documentInboxApi.getInboxItem(documentId);
    const voucherId = await this.sequenceStore.next("V");
    const voucher: VoucherDetails = {
      voucherId,
      title: `Verifikat för ${document.fileName}`,
      verificationStatus: "half",
      createdAt: new Date().toISOString(),
      sourceDocumentId: document.documentId,
      sourceFileName: document.fileName,
      sourceStoredPath: document.storedPath,
      sourceMimeType: document.mimeType,
      sourceReceivedAt: document.receivedAt,
      notes: document.textPreview ? "Skapat från inkorgspost med textförhandsvisning." : undefined
    };

    await this.repository.upsert(voucher);
    return voucher;
  }

  async setVoucherVerificationStatus(
    voucherId: string,
    status: VoucherVerificationStatus
  ): Promise<VoucherDetails> {
    const voucher = await this.getVoucher(voucherId);
    const updated: VoucherDetails = {
      ...voucher,
      verificationStatus: status
    };
    await this.repository.upsert(updated);
    return updated;
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
