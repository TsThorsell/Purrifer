import { dialog, shell, type BrowserWindow } from "electron";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import type {
  InboxStatus,
  InboxItemDetails,
  InboxItemSummary,
  RawDocumentPayload
} from "../contracts";
import { FileDocumentStore } from "./FileDocumentStore";
import { JsonDocumentInboxRepository } from "./JsonDocumentInboxRepository";

export class DocumentInboxService {
  constructor(
    private readonly repository: JsonDocumentInboxRepository,
    private readonly documentStore: FileDocumentStore,
    private readonly sequenceStore: FileSequenceStore
  ) {}

  async listInboxItems(): Promise<InboxItemSummary[]> {
    return this.repository.list();
  }

  async getInboxItem(documentId: string): Promise<InboxItemDetails> {
    const item = await this.repository.findById(documentId);
    if (!item) {
      throw new Error(`Dokument ${documentId} kunde inte hittas i inkorgen.`);
    }
    return item;
  }

  async setInboxItemStatus(documentId: string, status: InboxStatus): Promise<InboxItemSummary> {
    const existing = await this.repository.findById(documentId);
    if (!existing) {
      throw new Error(`Dokument ${documentId} kunde inte hittas i inkorgen.`);
    }

    await this.repository.updateStatus(documentId, status);
    return {
      documentId: existing.documentId,
      fileName: existing.fileName,
      mimeType: existing.mimeType,
      source: existing.source,
      receivedAt: existing.receivedAt,
      status,
      sizeBytes: existing.sizeBytes
    };
  }

  async selectAndIngestFiles(window: BrowserWindow): Promise<InboxItemSummary[]> {
    const selection = await dialog.showOpenDialog(window, {
      title: "Valj dokument till inkorgen",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Dokument", extensions: ["pdf", "png", "jpg", "jpeg", "gif", "txt", "csv", "xlsx", "xls"] },
        { name: "Alla filer", extensions: ["*"] }
      ]
    });

    if (selection.canceled || selection.filePaths.length === 0) {
      return [];
    }

    const payloads = await Promise.all(
      selection.filePaths.map(async (filePath) => {
        const bytes = await readFile(filePath);
        return {
          fileName: path.basename(filePath),
          mimeType: guessMimeType(filePath),
          bytes: [...bytes],
          source: "dialog" as const
        };
      })
    );

    return this.ingestDocuments(payloads);
  }

  async ingestDocuments(payloads: RawDocumentPayload[]): Promise<InboxItemSummary[]> {
    const summaries: InboxItemSummary[] = [];

    for (const payload of payloads) {
      const documentId = await this.sequenceStore.next("D");
      const storedPath = await this.documentStore.writeDocument(
        documentId,
        payload.fileName,
        payload.bytes
      );

      const receivedAt = new Date().toISOString();
      const details: InboxItemDetails = {
        documentId,
        fileName: payload.fileName,
        mimeType: payload.mimeType || "application/octet-stream",
        source: payload.source,
        receivedAt,
        status: "unclassified",
        sizeBytes: payload.bytes.length,
        storedPath
      };

      await this.repository.upsert(details);
      summaries.push({
        documentId,
        fileName: details.fileName,
        mimeType: details.mimeType,
        source: details.source,
        receivedAt: details.receivedAt,
        status: details.status,
        sizeBytes: details.sizeBytes
      });
    }

    return summaries;
  }

  async ingestClipboardText(text: string): Promise<InboxItemSummary> {
    const item = (
      await this.ingestDocuments([
        {
          fileName: "clipboard-note.txt",
          mimeType: "text/plain",
          bytes: [...Buffer.from(text, "utf8")],
          source: "clipboard-text"
        }
      ])
    )[0];

    const details = await this.getInboxItem(item.documentId);
    details.textPreview = text.slice(0, 4000);
    await this.repository.upsert(details);
    return item;
  }

  async openStoredDocument(documentId: string): Promise<void> {
    const item = await this.getInboxItem(documentId);
    await shell.openPath(item.storedPath);
  }
}

function guessMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".txt":
      return "text/plain";
    case ".csv":
      return "text/csv";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    default:
      return "application/octet-stream";
  }
}

