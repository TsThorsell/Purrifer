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
      setError(reason instanceof Error ? reason.message : "Kunde inte köra commit.");
    }
  }

  async function refresh() {
    setCommits(await window.purrifer.bootstrapCommit.listCommits());
  }

  async function openCommit(commitBatchId: string) {
    setError(null);
    try {
      setResult(await window.purrifer.bootstrapCommit.getCommit(commitBatchId));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa commitbatch.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Commit"
        title="Commit import till domänobjekt"
        description="Committar en stagebatch till Dokument, Verifikat, Leverantörsfaktura och Betalhändelse samt skapar beviskedjelänkar."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Commitkörning">
        <FieldGrid>
          <Field label="stage_batch_id">
            <input className="ui-input" value={stageBatchId} onChange={(event) => setStageBatchId(event.target.value)} />
          </Field>
          <div className="ui-actions">
            <Button onClick={() => void runCommit()}>Kör commit</Button>
            <Button tone="secondary" onClick={() => void refresh()}>Uppdatera lista</Button>
          </div>
        </FieldGrid>
      </Panel>

      <SplitLayout>
        <Panel title="Commitbatcher" status={<StatusPill>{commits.length}</StatusPill>}>
          <Stack>
            {commits.map((item) => (
              <button key={item.commitBatchId} className="ui-card selectable" type="button" onClick={() => void openCommit(item.commitBatchId)}>
                <h4>{item.commitBatchId}</h4>
                <p className="ui-muted">stage: {item.stageBatchId} · {item.committedAt}</p>
                <small>committed: {item.committedCount}</small>
              </button>
            ))}
            {commits.length === 0 ? <p className="ui-muted">Inga commitbatcher än.</p> : null}
          </Stack>
        </Panel>

        <Panel title="Committed objects" status={<StatusPill>{result?.committedCount ?? 0}</StatusPill>}>
          {result ? (
            <Stack>
              <article className="ui-card">
                <h4>Resultat</h4>
                <small>
                  eligible: {result.totalEligible} · committed now: {result.committedCount} · redan committed: {result.alreadyCommittedCount} · replayed: {result.replayed ? "ja" : "nej"}
                </small>
              </article>
              {result.objects.map((obj) => (
                <article key={`${obj.recordId}-${obj.objectId}`} className="ui-card">
                  <h4>{obj.objectType} · {obj.objectId}</h4>
                  <p className="ui-muted">record: {obj.recordType} / {obj.recordId}</p>
                </article>
              ))}
            </Stack>
          ) : (
            <p className="ui-muted">Ingen commitbatch vald.</p>
          )}
        </Panel>
      </SplitLayout>
    </Page>
  );
}

