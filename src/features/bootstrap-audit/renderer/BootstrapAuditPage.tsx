import { useState } from "react";
import {
  Button,
  Field,
  FieldGrid,
  Page,
  PageHeader,
  Panel,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";
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
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa audit trail.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Audit"
        title="Spårbarhet från råfil till slutobjekt"
        description="Visar lineage: raw ingest, preprocess, stage-beslut, manuell korrigering och commit-tid/objekt."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Filter">
        <FieldGrid>
          <Field label="source_file_id (optional)">
            <input className="ui-input" value={sourceFileId} onChange={(event) => setSourceFileId(event.target.value)} />
          </Field>
          <Field label="commit_batch_id (optional)">
            <input className="ui-input" value={commitBatchId} onChange={(event) => setCommitBatchId(event.target.value)} />
          </Field>
          <div className="ui-actions">
            <Button onClick={() => void loadTrail()}>Ladda audit trail</Button>
          </div>
        </FieldGrid>
      </Panel>

      <Panel title="Lineage" status={<StatusPill>{items.length}</StatusPill>}>
        <Stack>
          {items.map((item) => (
            <article key={`${item.commitBatchId}-${item.recordId}`} className="ui-card">
              <h4>{item.recordType} · {item.recordId}</h4>
              <p className="ui-muted">raw: {item.sourceFileId} · ingest: {item.ingestBatchId}</p>
              <small>preprocess: {item.preprocessBatchId} · stage: {item.stageBatchId} ({item.stageStatus}) @ {item.stageCreatedAt}</small>
              <small>review: {item.reviewActionStatus ?? "none"}{item.reviewAt ? ` @ ${item.reviewAt}` : ""}</small>
              <small>commit: {item.commitBatchId ?? "none"}{item.committedAt ? ` @ ${item.committedAt}` : ""} · objekt: {item.objectType ?? "-"}/{item.objectId ?? "-"}</small>
            </article>
          ))}
          {items.length === 0 ? <p className="ui-muted">Ingen spårbarhetsdata matchade filtret.</p> : null}
        </Stack>
      </Panel>
    </Page>
  );
}

