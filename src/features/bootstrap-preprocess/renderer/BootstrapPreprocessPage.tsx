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
      setError(reason instanceof Error ? reason.message : "Kunde inte köra preprocess.");
    }
  }

  async function refresh() {
    setBatches(await window.purrifer.bootstrapPreprocess.listPreprocessBatches());
  }

  async function open(preprocessBatchId: string) {
    setError(null);
    try {
      setResult(await window.purrifer.bootstrapPreprocess.getPreprocessBatch(preprocessBatchId));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa preprocessbatch.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Preprocess"
        title="Offline runner till canonical records"
        description="Körs lokalt på en råbatch. Ingen skrivning sker till domänobjekt i detta steg."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Preprocesskörning">
        <FieldGrid>
          <Field label="ingest_batch_id">
            <input className="ui-input" value={ingestBatchId} onChange={(event) => setIngestBatchId(event.target.value)} />
          </Field>
          <Field label="source_exported_at (optional)">
            <input className="ui-input" value={sourceExportedAt} onChange={(event) => setSourceExportedAt(event.target.value)} />
          </Field>
          <div className="ui-actions">
            <Button onClick={() => void run()}>Kör preprocess</Button>
            <Button tone="secondary" onClick={() => void refresh()}>Uppdatera lista</Button>
          </div>
        </FieldGrid>
      </Panel>

      <SplitLayout>
        <Panel title="Körningar" status={<StatusPill>{batches.length}</StatusPill>}>
          <Stack>
            {batches.map((batch) => (
              <button key={batch.preprocessBatchId} className="ui-card selectable" type="button" onClick={() => void open(batch.preprocessBatchId)}>
                <h4>{batch.preprocessBatchId}</h4>
                <p className="ui-muted">raw: {batch.ingestBatchId} · {batch.createdAt}</p>
                <small>
                  records {batch.totalRecords} · validation {batch.validationOk ? "ok" : `fel (${batch.validationErrorCount})`}
                </small>
              </button>
            ))}
            {batches.length === 0 ? <p className="ui-muted">Inga preprocesskörningar än.</p> : null}
          </Stack>
        </Panel>

        <Panel title="Output" status={<StatusPill>{result?.preprocessBatchId ?? "-"}</StatusPill>}>
          {result ? <pre>{result.payloadJson}</pre> : <p className="ui-muted">Ingen batch vald.</p>}
        </Panel>
      </SplitLayout>
    </Page>
  );
}

