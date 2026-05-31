import { useState } from "react";
import type { BootstrapCommitResult, BootstrapCommitSummary } from "../contracts";

export function BootstrapCommitPage() {
  const [stageBatchId, setStageBatchId] = useState("");
  const [commits, setCommits] = useState<BootstrapCommitSummary[]>([]);
  const [result, setResult] = useState<BootstrapCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCommit() {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapCommit.runCommit({ stageBatchId });
      setResult(next);
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte kora commit.");
    }
  }

  async function refresh() {
    const list = await window.purrifer.bootstrapCommit.listCommits();
    setCommits(list);
  }

  async function openCommit(commitBatchId: string) {
    setError(null);
    try {
      const next = await window.purrifer.bootstrapCommit.getCommit(commitBatchId);
      setResult(next);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa commitbatch.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Commit</p>
          <h2>Commit import till domanobjekt</h2>
          <p className="muted">Committar en stagebatch till Dokument/Verifikat/Leverantorsfaktura/Betalhandelse och skapar beviskedjelankar.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="commit-stage-batch-id">stage_batch_id</label>
          <input id="commit-stage-batch-id" className="text-input" value={stageBatchId} onChange={(event) => setStageBatchId(event.target.value)} />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void runCommit()}>Kor commit</button>
          <button className="secondary-button" type="button" onClick={() => void refresh()}>Uppdatera lista</button>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Commitbatcher</h3>
            <span className="status-pill neutral">{commits.length}</span>
          </div>
          <div className="stacked-list">
            {commits.map((item) => (
              <button key={item.commitBatchId} className="list-card selectable" type="button" onClick={() => void openCommit(item.commitBatchId)}>
                <h4>{item.commitBatchId}</h4>
                <p className="muted">stage: {item.stageBatchId} · {item.committedAt}</p>
                <small>committed: {item.committedCount}</small>
              </button>
            ))}
            {commits.length === 0 ? <p className="muted">Inga commitbatcher an.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Committed objects</h3>
            <span className="status-pill neutral">{result?.committedCount ?? 0}</span>
          </div>
          {result ? (
            <div className="stacked-list">
              <article className="list-card">
                <h4>Resultat</h4>
                <small>
                  eligible: {result.totalEligible} · committed now: {result.committedCount} · redan committed: {result.alreadyCommittedCount} · replayed: {result.replayed ? "ja" : "nej"}
                </small>
              </article>
              {result.objects.map((obj) => (
                <article key={`${obj.recordId}-${obj.objectId}`} className="list-card">
                  <h4>{obj.objectType} · {obj.objectId}</h4>
                  <p className="muted">record: {obj.recordType} / {obj.recordId}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen commitbatch vald.</p>
          )}
        </article>
      </section>
    </section>
  );
}
