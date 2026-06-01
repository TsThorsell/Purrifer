import { useState } from "react";
import {
  Button,
  Field,
  FieldGrid,
  Page,
  PageHeader,
  Panel,
  SplitLayout,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";
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
      setError(reason instanceof Error ? reason.message : "Kunde inte köra stage gate.");
    }
  }

  async function refresh() {
    setBatches(await window.purrifer.bootstrapStage.listStageBatches());
  }

  async function open(stageBatchId: string) {
    setError(null);
    try {
      setResult(await window.purrifer.bootstrapStage.getStageBatch(stageBatchId));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa stagebatch.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Stage"
        title="Stage import gate"
        description="Validerar schema, referenser och dedupe. Varje record klassas som ready, needs-review eller rejected."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Stagekörning">
        <FieldGrid>
          <Field label="preprocess_batch_id">
            <input className="ui-input" value={preprocessBatchId} onChange={(event) => setPreprocessBatchId(event.target.value)} />
          </Field>
          <div className="ui-actions">
            <Button onClick={() => void run()}>Kör stage gate</Button>
            <Button tone="secondary" onClick={() => void refresh()}>Uppdatera lista</Button>
          </div>
        </FieldGrid>
      </Panel>

      <SplitLayout>
        <Panel title="Stagebatcher" status={<StatusPill>{batches.length}</StatusPill>}>
          <Stack>
            {batches.map((batch) => (
              <button key={batch.stageBatchId} className="ui-card selectable" type="button" onClick={() => void open(batch.stageBatchId)}>
                <h4>{batch.stageBatchId}</h4>
                <p className="ui-muted">preprocess: {batch.preprocessBatchId} · {batch.createdAt}</p>
                <small>ready {batch.readyCount} · review {batch.needsReviewCount} · rejected {batch.rejectedCount}</small>
              </button>
            ))}
            {batches.length === 0 ? <p className="ui-muted">Inga stagebatcher än.</p> : null}
          </Stack>
        </Panel>

        <Panel title="Recordbeslut" status={<StatusPill>{result?.decisions.length ?? 0}</StatusPill>}>
          {result ? (
            <Stack>
              {result.decisions.map((decision) => (
                <article key={`${decision.recordType}-${decision.recordId}-${decision.sourceFileId}`} className="ui-card">
                  <h4>{decision.recordType} · {decision.recordId}</h4>
                  <p className="ui-muted">source_file_id: {decision.sourceFileId}</p>
                  <small>status: {decision.status} · reasons: {decision.reasonCodes.length ? decision.reasonCodes.join(", ") : "none"}</small>
                </article>
              ))}
            </Stack>
          ) : (
            <p className="ui-muted">Ingen stagebatch vald.</p>
          )}
        </Panel>
      </SplitLayout>
    </Page>
  );
}

