import { useState } from "react";
import type { RawIngestBatchDetails, RawIngestBatchSummary, ScannerCapabilities } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

export function BootstrapIntakePage() {
  const [sourceSystem, setSourceSystem] = useState("manual-folder-import");
  const [latestBatch, setLatestBatch] = useState<RawIngestBatchDetails | null>(null);
  const [batches, setBatches] = useState<RawIngestBatchSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<RawIngestBatchDetails | null>(null);
  const [scannerCaps, setScannerCaps] = useState<ScannerCapabilities | null>(null);
  const [scanMode, setScanMode] = useState<"simplex" | "duplex">("duplex");
  const [feederMode, setFeederMode] = useState<"flatbed" | "adf">("adf");
  const [error, setError] = useState<string | null>(null);

  async function startBatchIngest() {
    setError(null);
    try {
      const batch = await window.purrifer.bootstrapIntake.selectFoldersAndIngest({ sourceSystem });
      if (batch) {
        setLatestBatch(batch);
      }
      await refreshBatches();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte starta batchingest.");
    }
  }

  async function detectScanner() {
    setError(null);
    try {
      const caps = await window.purrifer.bootstrapIntake.getScannerCapabilities();
      setScannerCaps(caps);
      if (!caps.supportsDuplex) setScanMode("simplex");
      if (!caps.supportsAdf) setFeederMode("flatbed");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa scannerkapabiliteter.");
    }
  }

  async function scanToBatch() {
    setError(null);
    try {
      const batch = await window.purrifer.bootstrapIntake.scanToBatch({ scanMode, feederMode });
      if (batch) {
        setLatestBatch(batch);
      }
      await refreshBatches();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa scannerbatch.");
    }
  }

  async function refreshBatches() {
    const list = await window.purrifer.bootstrapIntake.listBatches();
    setBatches(list);
  }

  async function openBatch(ingestBatchId: string) {
    setError(null);
    try {
      const batch = await window.purrifer.bootstrapIntake.getBatch(ingestBatchId);
      setSelectedBatch(batch);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa batch.");
    }
  }

  const shownBatch = latestBatch ?? selectedBatch;

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Intake"
        title="Starta batchingest till råzon"
        description="Välj mappar eller skanna direkt. Systemet hashar filer och markerar duplikat innan preprocess."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Inmatning">
        <FieldGrid>
          <Field label="source_system">
            <input value={sourceSystem} onChange={(event) => setSourceSystem(event.target.value)} />
          </Field>
        </FieldGrid>
        <Actions>
          <Button onClick={() => void startBatchIngest()}>Starta batchingest</Button>
          <Button tone="secondary" onClick={() => void detectScanner()}>Läs scannerkapabiliteter</Button>
          <Button onClick={() => void scanToBatch()}>Scan to Batch</Button>
          <Button tone="secondary" onClick={() => void refreshBatches()}>Uppdatera batchlista</Button>
        </Actions>
        {scannerCaps ? (
          <Stack>
            <small>scanner: {scannerCaps.deviceName} · profile: {scannerCaps.profile} · driver: {scannerCaps.driver}</small>
            <small>ADF: {scannerCaps.supportsAdf ? "stöds" : "saknas"} · duplex: {scannerCaps.supportsDuplex ? "stöds" : "saknas"}</small>
            <small>valt läge: {feederMode}/{scanMode}</small>
          </Stack>
        ) : null}
      </Panel>

      <SplitLayout>
        <Panel title="Batches" status={<StatusPill>{batches.length}</StatusPill>}>
          {batches.length > 0 ? (
            <Stack>
              {batches.map((batch) => (
                <button
                  key={batch.ingestBatchId}
                  className="ui-card selectable"
                  type="button"
                  onClick={() => void openBatch(batch.ingestBatchId)}
                >
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{batch.ingestBatchId}</h4>
                      <p className="ui-muted">{batch.sourceSystem} · {batch.createdAt}</p>
                    </div>
                  </div>
                  {batch.scannerDeviceName ? <small>{batch.scannerDeviceName} · {batch.scannerProfile ?? "-"}</small> : null}
                  <small>filer {batch.totalDiscovered} · nya {batch.totalNew} · duplikat {batch.totalDuplicates} · fel {batch.totalErrors}</small>
                </button>
              ))}
            </Stack>
          ) : (
            <EmptyState>Inga ingestbatcher ännu.</EmptyState>
          )}
        </Panel>

        <Panel title="Upptäckta filer" status={<StatusPill>{shownBatch?.files.length ?? 0}</StatusPill>}>
          {shownBatch ? (
            <Stack>
              {shownBatch.files.map((file) => (
                <article key={`${shownBatch.ingestBatchId}-${file.fullPath}`} className="ui-card">
                  <h4>{file.fullPath}</h4>
                  <p className="ui-muted">{file.fileType} · {file.sizeBytes} bytes</p>
                  <small>
                    status: {file.status}
                    {file.duplicateScope ? ` (${file.duplicateScope})` : ""}
                    {file.hash ? ` · hash: ${file.hash.slice(0, 12)}...` : ""}
                    {file.scanTimestamp ? ` · scan: ${file.scanTimestamp}` : ""}
                    {file.errorMessage ? ` · fel: ${file.errorMessage}` : ""}
                  </small>
                </article>
              ))}
            </Stack>
          ) : (
            <EmptyState>Ingen batch vald.</EmptyState>
          )}
        </Panel>
      </SplitLayout>
    </Page>
  );
}

