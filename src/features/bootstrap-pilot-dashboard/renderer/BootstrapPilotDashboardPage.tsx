import { useState } from "react";
import type { PilotDashboardData } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

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
    <Page>
      <PageHeader
        eyebrow="Bootstrap Pilot"
        title="Pilot Migration Dashboard"
        description="Ready-rate, review-rate, avslagsorsaker och confidence-fördelning per batch eller källa."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Filter">
        <FieldGrid>
          <Field label="ingest_batch_id (valfri)">
            <input value={ingestBatchId} onChange={(event) => setIngestBatchId(event.target.value)} />
          </Field>
          <Field label="stage_batch_id (valfri)">
            <input value={stageBatchId} onChange={(event) => setStageBatchId(event.target.value)} />
          </Field>
          <Field label="source_system (valfri)">
            <input value={sourceSystem} onChange={(event) => setSourceSystem(event.target.value)} />
          </Field>
        </FieldGrid>
        <Actions>
          <Button onClick={() => void loadDashboard()}>Ladda KPI</Button>
        </Actions>
      </Panel>

      {dashboard ? (
        <>
          <Panel
            title="KPI"
            subtitle={<small>Totalt: {dashboard.kpis.totalRecords} poster</small>}
          >
            <Stack>
              <small>Ready-rate: {dashboard.kpis.readyRate}% ({dashboard.kpis.readyCount})</small>
              <small>Review-rate: {dashboard.kpis.reviewRate}% ({dashboard.kpis.needsReviewCount})</small>
              <small>Rejection-rate: {dashboard.kpis.rejectionRate}% ({dashboard.kpis.rejectedCount})</small>
              <small>Review actions: {dashboard.kpis.reviewedCount} (approved {dashboard.kpis.reviewApprovedCount}, accepted-incomplete {dashboard.kpis.reviewAcceptedIncompleteCount}, rejected {dashboard.kpis.reviewRejectedCount})</small>
              <small>Commit coverage: {dashboard.kpis.commitCoverageRate}% ({dashboard.kpis.committedCount})</small>
            </Stack>
          </Panel>

          <SplitLayout>
            <Panel title="Reason Breakdown" status={<StatusPill>{dashboard.reasonBreakdown.length}</StatusPill>}>
              {dashboard.reasonBreakdown.length > 0 ? (
                <Stack>
                  {dashboard.reasonBreakdown.map((item) => (
                    <div key={item.reasonCode} className="ui-card">
                      <strong>{item.reasonCode}</strong>
                      <small>{item.count}</small>
                    </div>
                  ))}
                </Stack>
              ) : (
                <EmptyState>Inga orsaker hittades för filtret.</EmptyState>
              )}
            </Panel>

            <Panel title="Confidence Distribution" status={<StatusPill>{dashboard.confidenceDistribution.length}</StatusPill>}>
              <Stack>
                {dashboard.confidenceDistribution.map((item) => (
                  <div key={item.bucketLabel} className="ui-card">
                    <strong>{item.bucketLabel}</strong>
                    <small>{item.count}</small>
                  </div>
                ))}
              </Stack>
            </Panel>
          </SplitLayout>

          <Panel title="Batch / källa" status={<StatusPill>{dashboard.batchMetrics.length}</StatusPill>}>
            {dashboard.batchMetrics.length > 0 ? (
              <Stack>
                {dashboard.batchMetrics.map((item) => (
                  <article key={item.stageBatchId} className="ui-card">
                    <div className="ui-card__header">
                      <div className="ui-card__title-block">
                        <h4>{item.stageBatchId}</h4>
                        <p className="ui-muted">ingest: {item.ingestBatchId} · source: {item.sourceSystem}</p>
                      </div>
                    </div>
                    <small>{item.stageCreatedAt}</small>
                    <small>total {item.totalRecords} · ready {item.readyCount} · review {item.needsReviewCount} · rejected {item.rejectedCount} · committed {item.committedCount}</small>
                  </article>
                ))}
              </Stack>
            ) : (
              <EmptyState>Ingen batchdata hittades för filtret.</EmptyState>
            )}
          </Panel>
        </>
      ) : null}
    </Page>
  );
}

