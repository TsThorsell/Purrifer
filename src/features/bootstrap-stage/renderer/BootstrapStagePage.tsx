import { useState } from "react";
import type { StageBatchDetails, StageBatchSummary } from "../contracts";

export function BootstrapStagePage() {
  const [preprocessBatchId, setPreprocessBatchId] = useState("");
  const [result, setResult] = useState<StageBatchDetails | null>(null);
  const [batches, setBatches] = useState<StageBatchSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapStage.runStageGate({ preprocessBatchId });
      setResult(next);
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte kora stage gate.");
    }
  }

  async function refresh() {
    const list = await window.purrifer.bootstrapStage.listStageBatches();
    setBatches(list);
  }

  async function open(stageBatchId: string) {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapStage.getStageBatch(stageBatchId);
      setResult(next);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa stagebatch.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Stage</p>
          <h2>Stage import gate</h2>
          <p className="muted">Validerar schema, referenser och dedupe. Varje record klassas som ready, needs-review eller rejected.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="preprocess-batch-id">preprocess_batch_id</label>
          <input id="preprocess-batch-id" className="text-input" value={preprocessBatchId} onChange={(event) => setPreprocessBatchId(event.target.value)} />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void run()}>Kor stage gate</button>
          <button className="secondary-button" type="button" onClick={() => void refresh()}>Uppdatera lista</button>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Stagebatcher</h3>
            <span className="status-pill neutral">{batches.length}</span>
          </div>
          <div className="stacked-list">
            {batches.map((batch) => (
              <button key={batch.stageBatchId} className="list-card selectable" type="button" onClick={() => void open(batch.stageBatchId)}>
                <h4>{batch.stageBatchId}</h4>
                <p className="muted">preprocess: {batch.preprocessBatchId} · {batch.createdAt}</p>
                <small>ready {batch.readyCount} · review {batch.needsReviewCount} · rejected {batch.rejectedCount}</small>
              </button>
            ))}
            {batches.length === 0 ? <p className="muted">Inga stagebatcher an.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Recordbeslut</h3>
            <span className="status-pill neutral">{result?.decisions.length ?? 0}</span>
          </div>
          {result ? (
            <div className="stacked-list">
              {result.decisions.map((decision) => (
                <article key={`${decision.recordType}-${decision.recordId}-${decision.sourceFileId}`} className="list-card">
                  <h4>{decision.recordType} · {decision.recordId}</h4>
                  <p className="muted">source_file_id: {decision.sourceFileId}</p>
                  <small>status: {decision.status} · reasons: {decision.reasonCodes.length ? decision.reasonCodes.join(", ") : "none"}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen stagebatch vald.</p>
          )}
        </article>
      </section>
    </section>
  );
}
