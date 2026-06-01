import { useEffect, useMemo, useState } from "react";
import type { InboxItemDetails, InboxItemSummary } from "@features/document-inbox/contracts";
import {
  Actions,
  Button,
  EmptyState,
  Field,
  FieldGrid,
  Page,
  PageHeader,
  Panel,
  SplitLayout,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";
import type {
  DocumentFieldExtraction,
  DocumentTableExtraction,
  DocumentReviewDecisionRecord,
  DocumentReviewDecisionStatus,
  ReviewQueueItem
} from "../contracts";

const reviewDecisionStatuses: DocumentReviewDecisionStatus[] = ["approved", "rejected", "manual"];

export function DocumentReviewPage() {
  const [documentId, setDocumentId] = useState("");
  const [inboxItems, setInboxItems] = useState<InboxItemSummary[]>([]);
  const [selectedInboxItem, setSelectedInboxItem] = useState<InboxItemDetails | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [decisionHistory, setDecisionHistory] = useState<DocumentReviewDecisionRecord[]>([]);
  const [decisionStatus, setDecisionStatus] = useState<DocumentReviewDecisionStatus>("approved");
  const [reasonCode, setReasonCode] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
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
  const [busyDecision, setBusyDecision] = useState(false);

  useEffect(() => {
    void loadInboxItems();
    void loadReviewQueue();
    const timer = setInterval(() => {
      void loadReviewQueue();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!documentId) {
      setSelectedInboxItem(null);
      setDecisionHistory([]);
      return;
    }
    void window.purrifer.documentInbox
      .getInboxItem(documentId)
      .then(setSelectedInboxItem)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa dokumentdetaljer.")
      );
    void loadDecisionTrail();
  }, [documentId]);

  const selectedQueueItem = useMemo(
    () => reviewQueue.find((queueItem) => queueItem.documentId === documentId) ?? null,
    [reviewQueue, documentId]
  );

  async function loadInboxItems() {
    try {
      const nextItems = await window.purrifer.documentInbox.listInboxItems();
      setInboxItems(nextItems);
      if (!documentId && nextItems[0]) {
        setDocumentId(nextItems[0].documentId);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa inkorgsposter.");
    }
  }

  async function loadReviewQueue() {
    try {
      const nextQueue = await window.purrifer.documentReview.listNeedsReviewQueue();
      setReviewQueue(nextQueue);
      if (!documentId && nextQueue[0]) {
        setDocumentId(nextQueue[0].documentId);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa granskingskön.");
    }
  }

  async function loadDecisionTrail() {
    if (!documentId) {
      return;
    }
    try {
      const history = await window.purrifer.documentReview.getDecisionTrail(documentId);
      setDecisionHistory(history);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa beslutshistorik.");
    }
  }

  async function runExtraction() {
    if (!documentId) {
      setError("Välj ett dokument först.");
      return;
    }
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
      setError("Mallnyckel krävs.");
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

  async function submitDecision() {
    if (!documentId) {
      setError("Välj ett dokument innan beslut fattas.");
      return;
    }
    if (!reasonCode.trim()) {
      setError("Orsakskod krävs.");
      return;
    }
    if (!decisionNote.trim()) {
      setError("Anteckning krävs.");
      return;
    }
    if (!decisionStatus) {
      setError("Välj beslutstyp.");
      return;
    }

    setBusyDecision(true);
    setError(null);
    try {
      await window.purrifer.documentReview.decideReviewDocument({
        documentId,
        decisionStatus,
        reasonCode: reasonCode.trim(),
        note: decisionNote.trim(),
        actor: "operator"
      });
      setDecisionNote("");
      await loadReviewQueue();
      await loadDecisionTrail();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte registrera beslut.");
    } finally {
      setBusyDecision(false);
    }
  }

  async function correctRejected() {
    if (!documentId) {
      setError("Välj ett dokument.");
      return;
    }
    if (!selectedQueueItem || selectedQueueItem.queueStatus !== "rejected") {
      setError("Korrigering kan bara göras på avvisade poster.");
      return;
    }
    if (!reasonCode.trim()) {
      setError("Orsakskod krävs.");
      return;
    }
    if (!decisionNote.trim()) {
      setError("Anteckning krävs.");
      return;
    }

    setBusyDecision(true);
    setError(null);
    try {
      await window.purrifer.documentReview.correctRejectedDocument({
        documentId,
        reasonCode: reasonCode.trim(),
        correctionNote: decisionNote.trim(),
        actor: "operator"
      });
      setDecisionNote("");
      await loadReviewQueue();
      await loadDecisionTrail();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte korrigera avvisat ärende.");
    } finally {
      setBusyDecision(false);
    }
  }

  function selectReviewQueueItem(nextDocumentId: string) {
    setDocumentId(nextDocumentId);
  }

  const decisionActionState = selectedQueueItem?.queueStatus === "rejected" ? "can-correct" : "normal";

  return (
    <Page>
      <PageHeader
        eyebrow="Document Review"
        title="Granskning av extraherade fält och tabeller"
        description="V1-granskningsmodulen visar extraction-output, beslut och beslutshistorik per dokument."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Granskningskö">
        {reviewQueue.length === 0 ? (
          <EmptyState>Ingen post väntar i granskning just nu.</EmptyState>
        ) : (
          <Stack>
            {reviewQueue.map((item) => (
              <button
                key={item.documentId}
                className={item.documentId === documentId ? "ui-card selectable selected" : "ui-card selectable"}
                type="button"
                onClick={() => selectReviewQueueItem(item.documentId)}
              >
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{item.fileName}</h4>
                    <p className="ui-muted">
                      {item.documentId} · {item.inboxStatus}
                    </p>
                  </div>
                  <StatusPill>{item.queueStatus}</StatusPill>
                </div>
                <small>MIME: {item.mimeType}</small>
                <small>
                  Senaste: {item.latestDecidedAt ? item.latestDecidedAt : "ingen"} /{" "}
                  {item.latestReasonCode ? item.latestReasonCode : "ingen kod"}
                </small>
              </button>
            ))}
          </Stack>
        )}
      </Panel>

      <Panel title="Dokumentval">
        <FieldGrid>
          <Field label="Dokument-id" className="ui-field-span">
            <select className="ui-input" value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              {inboxItems.map((item) => (
                <option key={item.documentId} value={item.documentId}>
                  {item.documentId} · {item.fileName}
                </option>
              ))}
            </select>
          </Field>
          <Actions>
            <Button tone="primary" disabled={busy} onClick={() => void runExtraction()}>
              {busy ? "Hamtar..." : "Extrahera"}
            </Button>
            <Button tone="secondary" onClick={() => void window.purrifer.documentInbox.openStoredDocument(documentId)}>
              Öppna original
            </Button>
          </Actions>
        </FieldGrid>
      </Panel>

      <SplitLayout>
        <Panel title="Mall och regioner">
          <FieldGrid>
            <Field label="Fältnyckel">
              <select className="ui-input" value={selectedFieldKey} onChange={(event) => setSelectedFieldKey(event.target.value)}>
                {fields.map((field) => (
                  <option key={field.fieldKey} value={field.fieldKey}>
                    {field.fieldKey}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mallnyckel">
              <input className="ui-input" value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} />
            </Field>
            <Field label="X">
              <input className="ui-input" value={regionX} onChange={(event) => setRegionX(event.target.value)} />
            </Field>
            <Field label="Y">
              <input className="ui-input" value={regionY} onChange={(event) => setRegionY(event.target.value)} />
            </Field>
            <Field label="Width">
              <input className="ui-input" value={regionWidth} onChange={(event) => setRegionWidth(event.target.value)} />
            </Field>
            <Field label="Height">
              <input className="ui-input" value={regionHeight} onChange={(event) => setRegionHeight(event.target.value)} />
            </Field>
            <Actions>
              <Button tone="secondary" onClick={() => void updateRegion()}>
                Uppdatera fältregion
              </Button>
              <Button tone="primary" onClick={() => void saveTemplates()}>
                Spara fält/tabellmall
              </Button>
            </Actions>
          </FieldGrid>
        </Panel>

        <Panel title="Beslutslogg" status={<StatusPill>{decisionHistory.length}</StatusPill>}>
          <FieldGrid>
            <Field label="Status">
              <select
                value={decisionStatus}
                onChange={(event) => setDecisionStatus(event.target.value as DocumentReviewDecisionStatus)}
              >
                {reviewDecisionStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orsakskod">
              <input
                className="ui-input"
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
                placeholder="EX: LOW_CONF, OCR_FAIL, MISSING_TEMPLATE"
              />
            </Field>
            <Field label="Anteckning" className="ui-field-span">
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                rows={4}
                placeholder="Beslutskommentar och spårbarhet..."
              />
            </Field>
          </FieldGrid>
          <Actions>
            <Button tone="primary" disabled={busyDecision} onClick={() => void submitDecision()}>
              {busyDecision ? "Sparar..." : "Registrera beslut"}
            </Button>
            <Button
              tone="secondary"
              disabled={busyDecision || decisionActionState !== "can-correct"}
              onClick={() => void correctRejected()}
            >
              Korrigera avvisat ärende
            </Button>
          </Actions>

          {decisionHistory.length === 0 ? (
            <EmptyState>Ingen beslutshistorik ännu.</EmptyState>
          ) : (
            <Stack>
              {decisionHistory.map((entry) => (
                <article key={entry.decisionId} className="ui-card">
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{entry.decisionStatus}</h4>
                      <p className="ui-muted">{entry.actor}</p>
                    </div>
                    <StatusPill>{entry.decisionId}</StatusPill>
                  </div>
                  <p>
                    {entry.decidedAt} · {entry.reasonCode}
                  </p>
                  <small>{entry.note}</small>
                </article>
              ))}
            </Stack>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Falt" status={<StatusPill>{fields.length}</StatusPill>}>
          <Stack>
            {fields.map((field) => (
              <article key={field.fieldKey} className="ui-card">
                <h4>{field.fieldKey}</h4>
                <p>{field.value}</p>
                <small>confidence {field.confidence}</small>
              </article>
            ))}
          </Stack>
        </Panel>

        <Panel title="Tabeller" status={<StatusPill>{tables.length}</StatusPill>}>
          <Stack>
            {tables.map((table) => (
              <article key={table.tableKey} className="ui-card">
                <h4>{table.tableKey}</h4>
                <p>{table.headers.join(", ")}</p>
                <small>rows {table.rows.length}</small>
              </article>
            ))}
          </Stack>
        </Panel>
      </SplitLayout>

      <Panel
        title="Dokumentpreview"
        status={selectedInboxItem ? <StatusPill>{selectedInboxItem.mimeType}</StatusPill> : null}
      >
        {!selectedInboxItem ? (
          <EmptyState>Välj ett dokument för preview.</EmptyState>
        ) : selectedInboxItem.mimeType.startsWith("image/") ? (
          <img
            src={`file:///${selectedInboxItem.storedPath.replace(/\\/g, "/")}`}
            alt={selectedInboxItem.fileName}
            className="ui-document-preview-image"
          />
        ) : selectedInboxItem.mimeType === "application/pdf" ? (
          <iframe
            src={`file:///${selectedInboxItem.storedPath.replace(/\\/g, "/")}`}
            title={selectedInboxItem.fileName}
            className="ui-document-preview-frame"
          />
        ) : (
          <EmptyState>Preview finns för närvarande för bild och PDF.</EmptyState>
        )}
      </Panel>
    </Page>
  );
}
