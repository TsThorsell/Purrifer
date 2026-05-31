import { useEffect, useState } from "react";
import type { InboxItemDetails, InboxItemSummary } from "@features/document-inbox/contracts";
import type { DocumentFieldExtraction, DocumentTableExtraction } from "../contracts";

export function DocumentReviewPage() {
  const [documentId, setDocumentId] = useState("");
  const [inboxItems, setInboxItems] = useState<InboxItemSummary[]>([]);
  const [selectedInboxItem, setSelectedInboxItem] = useState<InboxItemDetails | null>(null);
  const [fields, setFields] = useState<DocumentFieldExtraction[]>([]);
  const [tables, setTables] = useState<DocumentTableExtraction[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const [regionX, setRegionX] = useState("0.1");
  const [regionY, setRegionY] = useState("0.1");
  const [regionWidth, setRegionWidth] = useState("0.2");
  const [regionHeight, setRegionHeight] = useState("0.05");
  const [templateKey, setTemplateKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.purrifer.documentInbox
      .listInboxItems()
      .then((items) => {
        setInboxItems(items);
        if (!documentId && items[0]) {
          setDocumentId(items[0].documentId);
        }
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa inkorgsposter.")
      );
  }, [documentId]);

  useEffect(() => {
    if (!documentId) {
      setSelectedInboxItem(null);
      return;
    }
    void window.purrifer.documentInbox
      .getInboxItem(documentId)
      .then(setSelectedInboxItem)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa dokumentdetaljer.")
      );
  }, [documentId]);

  async function runExtraction() {
    setBusy(true);
    setError(null);
    try {
      const [nextFields, nextTables] = await Promise.all([
        window.purrifer.documentReview.extractDocumentFields(documentId),
        window.purrifer.documentReview.extractDocumentTables(documentId)
      ]);
      setFields(nextFields);
      setTables(nextTables);
      if (nextFields[0]) {
        setSelectedFieldKey(nextFields[0].fieldKey);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte extrahera dokumentdata.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRegion() {
    if (!documentId || !selectedFieldKey) {
      return;
    }
    setError(null);
    try {
      const updated = await window.purrifer.documentReview.updateFieldRegion(documentId, selectedFieldKey, {
        x: Number(regionX),
        y: Number(regionY),
        width: Number(regionWidth),
        height: Number(regionHeight)
      });
      setFields((current) =>
        current.map((field) => (field.fieldKey === updated.fieldKey ? updated : field))
      );
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera region.");
    }
  }

  async function saveTemplates() {
    if (!templateKey.trim()) {
      setError("Mallnyckel kravs.");
      return;
    }
    setError(null);
    try {
      await window.purrifer.documentReview.saveFieldTemplate({
        templateKey,
        payloadJson: JSON.stringify(fields)
      });
      await window.purrifer.documentReview.saveTableTemplate({
        templateKey,
        payloadJson: JSON.stringify(tables)
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte spara mallar.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Document Review</p>
          <h2>Granskning av extraherade falt och tabeller</h2>
          <p className="muted">Denna v1-yta visar Python-brygga, OCR-resultat och mallsteg.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="panel-card">
        <div className="detail-grid">
          <div className="detail-span">
            <p className="detail-label">Dokument-id</p>
            <select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              {inboxItems.map((item) => (
                <option key={item.documentId} value={item.documentId}>
                  {item.documentId} · {item.fileName}
                </option>
              ))}
            </select>
          </div>
          <div className="detail-actions">
            <button className="primary-button" type="button" disabled={busy} onClick={() => void runExtraction()}>
              {busy ? "Hamtar..." : "Extrahera"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void window.purrifer.documentInbox.openStoredDocument(documentId)}
            >
              Oppna original
            </button>
          </div>
        </div>
      </article>

      <article className="panel-card">
        <div className="detail-grid">
          <div>
            <p className="detail-label">Faltnyckel</p>
            <select value={selectedFieldKey} onChange={(event) => setSelectedFieldKey(event.target.value)}>
              {fields.map((field) => (
                <option key={field.fieldKey} value={field.fieldKey}>
                  {field.fieldKey}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="detail-label">Mallnyckel</p>
            <input value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} />
          </div>
          <div><p className="detail-label">X</p><input value={regionX} onChange={(event) => setRegionX(event.target.value)} /></div>
          <div><p className="detail-label">Y</p><input value={regionY} onChange={(event) => setRegionY(event.target.value)} /></div>
          <div><p className="detail-label">Width</p><input value={regionWidth} onChange={(event) => setRegionWidth(event.target.value)} /></div>
          <div><p className="detail-label">Height</p><input value={regionHeight} onChange={(event) => setRegionHeight(event.target.value)} /></div>
          <div className="detail-actions">
            <button className="secondary-button" type="button" onClick={() => void updateRegion()}>
              Uppdatera faltregion
            </button>
            <button className="primary-button" type="button" onClick={() => void saveTemplates()}>
              Spara falt/tabellmall
            </button>
          </div>
        </div>
      </article>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Falt</h3>
            <span className="status-pill neutral">{fields.length}</span>
          </div>
          <div className="stacked-list">
            {fields.map((field) => (
              <article key={field.fieldKey} className="list-card">
                <h4>{field.fieldKey}</h4>
                <p>{field.value}</p>
                <small>confidence {field.confidence}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Tabeller</h3>
            <span className="status-pill neutral">{tables.length}</span>
          </div>
          <div className="stacked-list">
            {tables.map((table) => (
              <article key={table.tableKey} className="list-card">
                <h4>{table.tableKey}</h4>
                <p>{table.headers.join(", ")}</p>
                <small>rows {table.rows.length}</small>
              </article>
            ))}
          </div>
        </article>
      </section>

      <article className="panel-card">
        <div className="panel-topline">
          <h3>Dokumentpreview</h3>
          {selectedInboxItem ? <span className="status-pill neutral">{selectedInboxItem.mimeType}</span> : null}
        </div>
        {!selectedInboxItem ? (
          <div className="empty-state">
            <p>Valj ett dokument for preview.</p>
          </div>
        ) : selectedInboxItem.mimeType.startsWith("image/") ? (
          <img
            src={`file:///${selectedInboxItem.storedPath.replace(/\\/g, "/")}`}
            alt={selectedInboxItem.fileName}
            style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid var(--border)" }}
          />
        ) : selectedInboxItem.mimeType === "application/pdf" ? (
          <iframe
            src={`file:///${selectedInboxItem.storedPath.replace(/\\/g, "/")}`}
            title={selectedInboxItem.fileName}
            style={{ width: "100%", minHeight: 480, border: "1px solid var(--border)", borderRadius: 12 }}
          />
        ) : (
          <div className="empty-state">
            <p>Preview finns for narvarande for bild och PDF.</p>
          </div>
        )}
      </article>
    </section>
  );
}
