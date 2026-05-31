import { useState } from "react";
import type { PreprocessRunDetails, PreprocessRunSummary } from "../contracts";

export function BootstrapPreprocessPage() {
  const [ingestBatchId, setIngestBatchId] = useState("");
  const [sourceExportedAt, setSourceExportedAt] = useState("");
  const [result, setResult] = useState<PreprocessRunDetails | null>(null);
  const [batches, setBatches] = useState<PreprocessRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapPreprocess.runPreprocess({
        ingestBatchId,
        sourceExportedAt: sourceExportedAt.trim() || undefined
      });
      setResult(next);
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte kora preprocess.");
    }
  }

  async function refresh() {
    const list = await window.purrifer.bootstrapPreprocess.listPreprocessBatches();
    setBatches(list);
  }

  async function open(preprocessBatchId: string) {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapPreprocess.getPreprocessBatch(preprocessBatchId);
      setResult(next);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa preprocessbatch.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Preprocess</p>
          <h2>Offline runner till canonical records</h2>
          <p className="muted">Kors lokalt pa en råbatch. Ingen skrivning sker till domänobjekt i detta steg.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="ingest-batch-id">ingest_batch_id</label>
          <input id="ingest-batch-id" className="text-input" value={ingestBatchId} onChange={(event) => setIngestBatchId(event.target.value)} />
          <label className="field-label" htmlFor="source-exported-at">source_exported_at (optional)</label>
          <input id="source-exported-at" className="text-input" value={sourceExportedAt} onChange={(event) => setSourceExportedAt(event.target.value)} />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void run()}>Kor preprocess</button>
          <button className="secondary-button" type="button" onClick={() => void refresh()}>Uppdatera lista</button>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Korningar</h3>
            <span className="status-pill neutral">{batches.length}</span>
          </div>
          <div className="stacked-list">
            {batches.map((batch) => (
              <button key={batch.preprocessBatchId} className="list-card selectable" type="button" onClick={() => void open(batch.preprocessBatchId)}>
                <h4>{batch.preprocessBatchId}</h4>
                <p className="muted">raw: {batch.ingestBatchId} · {batch.createdAt}</p>
                <small>records {batch.totalRecords} · validation {batch.validationOk ? "ok" : `fel (${batch.validationErrorCount})`}</small>
              </button>
            ))}
            {batches.length === 0 ? <p className="muted">Inga preprocesskorningar an.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Output</h3>
            <span className="status-pill neutral">{result?.preprocessBatchId ?? "-"}</span>
          </div>
          {result ? <pre>{result.payloadJson}</pre> : <p className="muted">Ingen batch vald.</p>}
        </article>
      </section>
    </section>
  );
}
