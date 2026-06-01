import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent
} from "react";
import type { InboxItemDetails, InboxItemSummary, InboxStatus, RawDocumentPayload } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

interface DocumentInboxPageProps {
  initialDocumentId?: string;
}

export function DocumentInboxPage({ initialDocumentId }: DocumentInboxPageProps) {
  const [items, setItems] = useState<InboxItemSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InboxItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queryFilter, setQueryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | InboxItemSummary["source"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | InboxStatus>("all");

  const refreshItems = useCallback(async () => {
    try {
      const nextItems = await window.purrifer.documentInbox.listInboxItems();
      setItems(nextItems);

      if (initialDocumentId && nextItems.some((entry) => entry.documentId === initialDocumentId)) {
        setSelectedId(initialDocumentId);
      } else if (selectedId && nextItems.some((entry) => entry.documentId === selectedId)) {
        setSelectedId(selectedId);
      } else if (nextItems[0]) {
        setSelectedId(nextItems[0].documentId);
      } else {
        setSelectedId(null);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa inkorgen.");
    }
  }, [initialDocumentId, selectedId]);

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
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa inkorgspost.");
      });
  }, [selectedId]);

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(items.map((item) => item.source))).sort();
    return ["all", ...sources];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = queryFilter.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const searchable = `${item.fileName} ${item.documentId} ${item.mimeType}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [items, queryFilter, sourceFilter, statusFilter]);

  const summaryText = useMemo(() => {
    if (filteredItems.length === 0) {
      return "Ingen post matchar filtreringen.";
    }
    const totalSize = filteredItems.reduce((sum, item) => sum + item.sizeBytes, 0);
    return `${filteredItems.length} poster i urval, ${Math.round(totalSize / 1024)} kB totalt.`;
  }, [filteredItems]);

  const hasSelectedMatchInFilteredList = selectedId
    ? filteredItems.some((item) => item.documentId === selectedId)
    : false;
  useEffect(() => {
    if (!selectedId || hasSelectedMatchInFilteredList) {
      return;
    }
    setSelectedId(filteredItems[0] ? filteredItems[0].documentId : null);
  }, [filteredItems, selectedId, hasSelectedMatchInFilteredList]);

  async function setStatusForSelected(status: InboxStatus) {
    if (!selectedItem) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await window.purrifer.documentInbox.setInboxItemStatus({
        documentId: selectedItem.documentId,
        status
      });
      await refreshItems();
      setSelectedItem(await window.purrifer.documentInbox.getInboxItem(selectedItem.documentId));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera status.");
    } finally {
      setBusy(false);
    }
  }

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
      setError(reason instanceof Error ? reason.message : "Kunde inte lägga till material i inkorgen.");
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
      await window.purrifer.documentInbox.setInboxItemStatus({
        documentId: selectedItem.documentId,
        status: "in-review"
      });
      await window.purrifer.documentInbox.openStoredDocument(selectedItem.documentId);
      await refreshItems();
      setSelectedItem(await window.purrifer.documentInbox.getInboxItem(selectedItem.documentId));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte öppna originalfilen.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Document Inbox"
        title="Inkorg för oklassificerat material"
        description="Dra in filer, klistra in text eller bild, eller välj filer manuellt. Allt sparas i intern dokumentstore."
        actions={
          <>
            <Button onClick={() => void importWithDialog()} disabled={busy}>Välj filer</Button>
            <label className="ui-button ui-button--secondary ui-file-trigger">
              Ladda upp
              <input type="file" multiple onChange={(event) => void handleFileInputChange(event)} />
            </label>
          </>
        }
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel
        className={busy ? "ui-intake-zone busy" : "ui-intake-zone"}
        title="Intake"
        subtitle="Drop eller paste direkt här. V1-stöd i denna slice: filer, bilder och text."
        status={<StatusPill tone="info">{busy ? "Import pågår" : summaryText}</StatusPill>}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void handleDrop(event)}
        onPaste={(event) => void handlePaste(event)}
        tabIndex={0}
      />

      <Panel title="Filter" status={<StatusPill>{filteredItems.length}</StatusPill>}>
        <FieldGrid>
          <Field label="Sök"><input value={queryFilter} onChange={(event) => setQueryFilter(event.target.value)} /></Field>
          <Field label="Källa"><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | InboxItemSummary["source"])}>{sourceOptions.map((source) => <option key={`source-${source}`} value={source}>{source}</option>)}</select></Field>
          <Field label="Status"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | InboxStatus)}>
            <option value="all">Alla</option>
            <option value="unclassified">Oklassad</option>
            <option value="in-review">Under granskning</option>
            <option value="reviewed">Granskad</option>
          </select></Field>
        </FieldGrid>
      </Panel>

      <SplitLayout>
        <Panel title="Inkorgsposter" status={<StatusPill>{filteredItems.length}</StatusPill>}>
          {filteredItems.length === 0 ? <EmptyState>Ingen post matchar filtret.</EmptyState> : null}
          <Stack>
            {filteredItems.map((item) => (
              <button
                key={item.documentId}
                className={item.documentId === selectedId ? "ui-card selectable selected" : "ui-card selectable"}
                type="button"
                onClick={() => setSelectedId(item.documentId)}
              >
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{item.fileName}</h4>
                    <p className="ui-muted">{item.documentId} · {item.source} · {item.mimeType}</p>
                  </div>
                  <StatusPill>{item.status}</StatusPill>
                </div>
                <small>{item.receivedAt}</small>
              </button>
            ))}
          </Stack>
        </Panel>

        <Panel title="Detaljer" status={selectedItem ? <StatusPill>{selectedItem.documentId}</StatusPill> : undefined}>
          {!selectedItem ? (
            <EmptyState>Välj en inkorgspost för att se metadata och öppna originalunderlaget.</EmptyState>
          ) : (
            <>
              <FieldGrid>
                <Field label="Filnamn"><p>{selectedItem.fileName}</p></Field>
                <Field label="Källa"><p>{selectedItem.source}</p></Field>
                <Field label="MIME-typ"><p>{selectedItem.mimeType}</p></Field>
                <Field label="Storlek"><p>{selectedItem.sizeBytes} bytes</p></Field>
                <Field label="Status">
                  <select
                    value={selectedItem.status}
                    onChange={(event) => void setStatusForSelected(event.target.value as InboxStatus)}
                  >
                    <option value="unclassified">Oklassad</option>
                    <option value="in-review">Under granskning</option>
                    <option value="reviewed">Granskad</option>
                  </select>
                </Field>
                <Field label="Lagrad sökväg" className="ui-field-span"><p className="ui-path-preview">{selectedItem.storedPath}</p></Field>
                {selectedItem.textPreview ? (
                  <Field label="Textförhandsvisning" className="ui-field-span">
                    <pre className="ui-text-preview">{selectedItem.textPreview}</pre>
                  </Field>
                ) : null}
              </FieldGrid>
              <Actions>
                <Button tone="secondary" onClick={() => void openSelectedOriginal()}>Öppna original</Button>
              </Actions>
            </>
          )}
        </Panel>
      </SplitLayout>
    </Page>
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
