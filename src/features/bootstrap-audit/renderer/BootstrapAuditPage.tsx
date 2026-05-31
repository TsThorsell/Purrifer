import { useState } from "react";
import type { AuditTrailItem } from "../contracts";

export function BootstrapAuditPage() {
  const [sourceFileId, setSourceFileId] = useState("");
  const [commitBatchId, setCommitBatchId] = useState("");
  const [items, setItems] = useState<AuditTrailItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTrail() {
    setError(null);
    try {
      const result = await window.purrifer.bootstrapAudit.listAuditTrail({
        sourceFileId: sourceFileId.trim() || undefined,
        commitBatchId: commitBatchId.trim() || undefined
      });
      setItems(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa audit trail.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Audit</p>
          <h2>Spårbarhet från råfil till slutobjekt</h2>
          <p className="muted">Visar lineage: raw ingest, preprocess, stage-beslut, manuell korrigering och commit-tid/objekt.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="audit-source-file">source_file_id (optional)</label>
          <input id="audit-source-file" className="text-input" value={sourceFileId} onChange={(event) => setSourceFileId(event.target.value)} />
          <label className="field-label" htmlFor="audit-commit-batch">commit_batch_id (optional)</label>
          <input id="audit-commit-batch" className="text-input" value={commitBatchId} onChange={(event) => setCommitBatchId(event.target.value)} />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void loadTrail()}>Ladda audit trail</button>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-topline">
          <h3>Lineage</h3>
          <span className="status-pill neutral">{items.length}</span>
        </div>
        <div className="stacked-list">
          {items.map((item) => (
            <article key={`${item.commitBatchId}-${item.recordId}`} className="list-card">
              <h4>{item.recordType} · {item.recordId}</h4>
              <p className="muted">raw: {item.sourceFileId} · ingest: {item.ingestBatchId}</p>
              <small>preprocess: {item.preprocessBatchId} · stage: {item.stageBatchId} ({item.stageStatus}) @ {item.stageCreatedAt}</small>
              <small>review: {item.reviewActionStatus ?? "none"} {item.reviewAt ? `@ ${item.reviewAt}` : ""}</small>
              <small>commit: {item.commitBatchId ?? "none"} {item.committedAt ? `@ ${item.committedAt}` : ""} · objekt: {item.objectType ?? "-"}/{item.objectId ?? "-"}</small>
            </article>
          ))}
          {items.length === 0 ? <p className="muted">Ingen spårbarhetsdata matchade filtret.</p> : null}
        </div>
      </section>
    </section>
  );
}
