export type InboxSource =
  | "dialog"
  | "drag-drop"
  | "file-upload"
  | "clipboard-image"
  | "clipboard-text";

export type InboxStatus = "unclassified";

export interface RawDocumentPayload {
  fileName: string;
  mimeType: string;
  bytes: number[];
  source: InboxSource;
}

export interface InboxItemSummary {
  documentId: string;
  fileName: string;
  mimeType: string;
  source: InboxSource;
  receivedAt: string;
  status: InboxStatus;
  sizeBytes: number;
}

export interface InboxItemDetails extends InboxItemSummary {
  storedPath: string;
  textPreview?: string;
}

export interface DocumentInboxApi {
  listInboxItems(): Promise<InboxItemSummary[]>;
  getInboxItem(documentId: string): Promise<InboxItemDetails>;
  selectAndIngestFiles(): Promise<InboxItemSummary[]>;
  ingestDocuments(payloads: RawDocumentPayload[]): Promise<InboxItemSummary[]>;
  ingestClipboardText(text: string): Promise<InboxItemSummary>;
  openStoredDocument(documentId: string): Promise<void>;
}

export const documentInboxChannels = {
  listInboxItems: "document-inbox:list-items",
  getInboxItem: "document-inbox:get-item",
  selectAndIngestFiles: "document-inbox:select-and-ingest-files",
  ingestDocuments: "document-inbox:ingest-documents",
  ingestClipboardText: "document-inbox:ingest-clipboard-text",
  openStoredDocument: "document-inbox:open-stored-document"
} as const;

