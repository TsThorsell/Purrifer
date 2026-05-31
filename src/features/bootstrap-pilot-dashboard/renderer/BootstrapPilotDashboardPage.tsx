import { useState } from "react";
import type { PilotDashboardData } from "../contracts";

export function BootstrapPilotDashboardPage() {
  const [ingestBatchId, setIngestBatchId] = useState("");
  const [stageBatchId, setStageBatchId] = useState("");
  const [sourceSystem, setSourceSystem] = useState("");
  const [dashboard, setDashboard] = useState<PilotDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setError(null);
    try {
      const result = await window.purrifer.bootstrapPilotDashboard.getDashboard({
        ingestBatchId: ingestBatchId.trim() || undefined,
        stageBatchId: stageBatchId.trim() || undefined,
        sourceSystem: sourceSystem.trim() || undefined
      });
      setDashboard(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte ladda pilotdashboard.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Pilot</p>
          <h2>Pilot Migration Dashboard</h2>
          <p className="muted">Ready-rate, review-rate, rejection reasons och confidence distribution per batch/kalla.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="pilot-ingest-batch">ingest_batch_id (optional)</label>
          <input id="pilot-ingest-batch" className="text-input" value={ingestBatchId} onChange={(event) => setIngestBatchId(event.target.value)} />
          <label className="field-label" htmlFor="pilot-stage-batch">stage_batch_id (optional)</label>
          <input id="pilot-stage-batch" className="text-input" value={stageBatchId} onChange={(event) => setStageBatchId(event.target.value)} />
          <label className="field-label" htmlFor="pilot-source-system">source_system (optional)</label>
          <input id="pilot-source-system" className="text-input" value={sourceSystem} onChange={(event) => setSourceSystem(event.target.value)} />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void loadDashboard()}>Ladda KPI</button>
        </div>
      </section>

      {dashboard ? (
        <>
          <section className="panel-card">
            <h3>KPI</h3>
            <small>Totalt: {dashboard.kpis.totalRecords} records</small>
            <div className="stacked-list">
              <small>Ready-rate: {dashboard.kpis.readyRate}% ({dashboard.kpis.readyCount})</small>
              <small>Review-rate: {dashboard.kpis.reviewRate}% ({dashboard.kpis.needsReviewCount})</small>
              <small>Rejection-rate: {dashboard.kpis.rejectionRate}% ({dashboard.kpis.rejectedCount})</small>
              <small>Review actions: {dashboard.kpis.reviewedCount} (approved {dashboard.kpis.reviewApprovedCount}, accepted-incomplete {dashboard.kpis.reviewAcceptedIncompleteCount}, rejected {dashboard.kpis.reviewRejectedCount})</small>
              <small>Commit coverage: {dashboard.kpis.commitCoverageRate}% ({dashboard.kpis.committedCount})</small>
            </div>
          </section>

          <section className="panel-card">
            <h3>Reason Breakdown</h3>
            <div className="stacked-list">
              {dashboard.reasonBreakdown.map((item) => (
                <small key={item.reasonCode}>{item.reasonCode}: {item.count}</small>
              ))}
              {dashboard.reasonBreakdown.length === 0 ? <p className="muted">Inga reasons hittades for filtret.</p> : null}
            </div>
          </section>

          <section className="panel-card">
            <h3>Confidence Distribution</h3>
            <div className="stacked-list">
              {dashboard.confidenceDistribution.map((item) => (
                <small key={item.bucketLabel}>{item.bucketLabel}: {item.count}</small>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <h3>Batch / Kalla</h3>
            <div className="stacked-list">
              {dashboard.batchMetrics.map((item) => (
                <article key={item.stageBatchId} className="list-card">
                  <h4>{item.stageBatchId}</h4>
                  <p className="muted">ingest: {item.ingestBatchId} · source: {item.sourceSystem}</p>
                  <small>{item.stageCreatedAt}</small>
                  <small>total {item.totalRecords} · ready {item.readyCount} · review {item.needsReviewCount} · rejected {item.rejectedCount} · committed {item.committedCount}</small>
                </article>
              ))}
              {dashboard.batchMetrics.length === 0 ? <p className="muted">Ingen batchdata hittades for filtret.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

