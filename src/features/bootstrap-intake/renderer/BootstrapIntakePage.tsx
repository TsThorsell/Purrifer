import { useState } from "react";
import type { RawIngestBatchDetails, RawIngestBatchSummary, ScannerCapabilities } from "../contracts";

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
      if (!caps.supportsDuplex) {
        setScanMode("simplex");
      }
      if (!caps.supportsAdf) {
        setFeederMode("flatbed");
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa scannerkapabiliteter.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa batch.");
    }
  }

  const shownBatch = latestBatch ?? selectedBatch;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Intake</p>
          <h2>Starta batchingest till råzon</h2>
          <p className="muted">Valj en eller flera lokala mappar. Systemet hashar filer och markerar duplikat innan preprocess.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="source-system">source_system</label>
          <input
            id="source-system"
            className="text-input"
            value={sourceSystem}
            onChange={(event) => setSourceSystem(event.target.value)}
          />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void startBatchIngest()}>
            Starta batchingest
          </button>
          <button className="secondary-button" type="button" onClick={() => void detectScanner()}>
            Las scannerkapabiliteter
          </button>
          <button className="primary-button" type="button" onClick={() => void scanToBatch()}>
            Scan to Batch
          </button>
          <button className="secondary-button" type="button" onClick={() => void refreshBatches()}>
            Uppdatera batchlista
          </button>
        </div>
        {scannerCaps ? (
          <div className="stacked-list">
            <small>scanner: {scannerCaps.deviceName} · profile: {scannerCaps.profile} · driver: {scannerCaps.driver}</small>
            <small>ADF: {scannerCaps.supportsAdf ? "stods" : "saknas"} · duplex: {scannerCaps.supportsDuplex ? "stods" : "saknas"}</small>
            <small>valt lage: {feederMode}/{scanMode}</small>
          </div>
        ) : null}
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Batches</h3>
            <span className="status-pill neutral">{batches.length}</span>
          </div>
          <div className="stacked-list">
            {batches.map((batch) => (
              <button
                key={batch.ingestBatchId}
                className="list-card selectable"
                type="button"
                onClick={() => void openBatch(batch.ingestBatchId)}
              >
                <h4>{batch.ingestBatchId}</h4>
                <p className="muted">{batch.sourceSystem} · {batch.createdAt}</p>
                {batch.scannerDeviceName ? <small>{batch.scannerDeviceName} · {batch.scannerProfile ?? "-"}</small> : null}
                <small>filer {batch.totalDiscovered} · nya {batch.totalNew} · duplikat {batch.totalDuplicates} · fel {batch.totalErrors}</small>
              </button>
            ))}
            {batches.length === 0 ? <p className="muted">Inga ingestbatcher an.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Upptäckta filer</h3>
            <span className="status-pill neutral">{shownBatch?.files.length ?? 0}</span>
          </div>
          {shownBatch ? (
            <div className="stacked-list">
              {shownBatch.files.map((file) => (
                <article key={`${shownBatch.ingestBatchId}-${file.fullPath}`} className="list-card">
                  <h4>{file.fullPath}</h4>
                  <p className="muted">{file.fileType} · {file.sizeBytes} bytes</p>
                  <small>
                    status: {file.status}
                    {file.duplicateScope ? ` (${file.duplicateScope})` : ""}
                    {file.hash ? ` · hash: ${file.hash.slice(0, 12)}...` : ""}
                    {file.scanTimestamp ? ` · scan: ${file.scanTimestamp}` : ""}
                    {file.errorMessage ? ` · fel: ${file.errorMessage}` : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen batch vald.</p>
          )}
        </article>
      </section>
    </section>
  );
}
