import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent
} from "react";
import type { InboxItemDetails, InboxItemSummary, RawDocumentPayload } from "../contracts";

export function DocumentInboxPage() {
  const [items, setItems] = useState<InboxItemSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshItems = useCallback(async () => {
    try {
      const nextItems = await window.purrifer.documentInbox.listInboxItems();
      setItems(nextItems);

      if (!selectedId && nextItems[0]) {
        setSelectedId(nextItems[0].documentId);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa inkorgen.");
    }
  }, [selectedId]);

  useEffect(() => {
    void refreshItems();
  }, [refreshItems]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }

    void window.purrifer.documentInbox
      .getInboxItem(selectedId)
      .then(setSelectedItem)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa inkorgspost.");
      });
  }, [selectedId]);

  const summaryText = useMemo(() => {
    if (items.length === 0) {
      return "Inkorgen ar tom.";
    }

    const totalSize = items.reduce((sum, item) => sum + item.sizeBytes, 0);
    return `${items.length} poster, ${Math.round(totalSize / 1024)} kB totalt.`;
  }, [items]);

  async function importWithDialog() {
    setBusy(true);
    setError(null);

    try {
      const imported = await window.purrifer.documentInbox.selectAndIngestFiles();
      if (imported[0]) {
        setSelectedId(imported[0].documentId);
      }
      await refreshItems();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte importera filer.");
    } finally {
      setBusy(false);
    }
  }

  async function ingestPayloads(payloads: RawDocumentPayload[]) {
    if (payloads.length === 0) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const imported = await window.purrifer.documentInbox.ingestDocuments(payloads);
      if (imported[0]) {
        setSelectedId(imported[0].documentId);
      }
      await refreshItems();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lagga till material i inkorgen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    const payloads = await filesToPayloads(Array.from(fileList), "file-upload");
    await ingestPayloads(payloads);
    event.target.value = "";
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const payloads = await filesToPayloads(files, "drag-drop");
    await ingestPayloads(payloads);
  }

  async function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const imageFiles: File[] = [];

    for (const item of Array.from(event.clipboardData.items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault();
      const payloads = await filesToPayloads(imageFiles, "clipboard-image");
      await ingestPayloads(payloads);
      return;
    }

    const text = event.clipboardData.getData("text/plain").trim();
    if (text) {
      event.preventDefault();
      setBusy(true);
      setError(null);

      try {
        const imported = await window.purrifer.documentInbox.ingestClipboardText(text);
        setSelectedId(imported.documentId);
        await refreshItems();
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : "Kunde inte spara inklistrad text.");
      } finally {
        setBusy(false);
      }
    }
  }

  async function openSelectedOriginal() {
    if (!selectedItem) {
      return;
    }

    try {
      await window.purrifer.documentInbox.openStoredDocument(selectedItem.documentId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte oppna originalfilen.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Document Inbox</p>
          <h2>Inkorg for oklassificerat material</h2>
          <p className="muted">
            Dragga in filer, klistra in text eller bild, eller valj filer manuellt. Allt sparas i intern dokumentstore.
          </p>
        </div>

        <div className="header-actions">
          <button className="primary-button" type="button" onClick={() => void importWithDialog()} disabled={busy}>
            Valj filer
          </button>
          <label className="secondary-button file-trigger">
            Ladda upp
            <input type="file" multiple onChange={(event) => void handleFileInputChange(event)} />
          </label>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section
        className={busy ? "intake-zone busy" : "intake-zone"}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void handleDrop(event)}
        onPaste={(event) => void handlePaste(event)}
        tabIndex={0}
      >
        <div>
          <p className="eyebrow">Intake</p>
          <h3>Drop eller paste direkt har</h3>
          <p className="muted">
            V1-stod i denna slice: filer, bilder och text. Mailimport, OCR och klassificering kommer i senare slices.
          </p>
        </div>
        <strong>{busy ? "Import pagar..." : summaryText}</strong>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Inkorgsposter</h3>
            <span className="status-pill neutral">{items.length}</span>
          </div>

          <div className="stacked-list">
            {items.length === 0 ? (
              <div className="empty-state">
                <p>Ingen post i inkorgen annu.</p>
              </div>
            ) : null}

            {items.map((item) => (
              <button
                key={item.documentId}
                className={item.documentId === selectedId ? "list-card selectable selected" : "list-card selectable"}
                type="button"
                onClick={() => setSelectedId(item.documentId)}
              >
                <div className="list-card-topline">
                  <h4>{item.fileName}</h4>
                  <span className="status-pill neutral">{item.status}</span>
                </div>
                <p className="muted">
                  {item.documentId} · {item.source} · {item.mimeType}
                </p>
                <small>{item.receivedAt}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Detaljer</h3>
            {selectedItem ? <span className="status-pill neutral">{selectedItem.documentId}</span> : null}
          </div>

          {!selectedItem ? (
            <div className="empty-state">
              <p>Valj en inkorgspost for att se metadata och oppna originalunderlaget.</p>
            </div>
          ) : (
            <div className="detail-grid">
              <div>
                <p className="detail-label">Filnamn</p>
                <p>{selectedItem.fileName}</p>
              </div>
              <div>
                <p className="detail-label">Kalla</p>
                <p>{selectedItem.source}</p>
              </div>
              <div>
                <p className="detail-label">MIME-typ</p>
                <p>{selectedItem.mimeType}</p>
              </div>
              <div>
                <p className="detail-label">Storlek</p>
                <p>{selectedItem.sizeBytes} bytes</p>
              </div>
              <div>
                <p className="detail-label">Status</p>
                <p>{selectedItem.status}</p>
              </div>
              <div>
                <p className="detail-label">Lagrad sokvag</p>
                <p className="path-preview">{selectedItem.storedPath}</p>
              </div>

              {selectedItem.textPreview ? (
                <div className="detail-span">
                  <p className="detail-label">Textforhandsvisning</p>
                  <pre className="text-preview">{selectedItem.textPreview}</pre>
                </div>
              ) : null}

              <div className="detail-actions">
                <button className="secondary-button" type="button" onClick={() => void openSelectedOriginal()}>
                  Oppna original
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}

async function filesToPayloads(
  files: File[],
  source: RawDocumentPayload["source"]
): Promise<RawDocumentPayload[]> {
  return Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: [...new Uint8Array(await file.arrayBuffer())],
      source
    }))
  );
}
