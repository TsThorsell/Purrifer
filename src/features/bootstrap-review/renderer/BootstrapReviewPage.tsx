import { useMemo, useState } from "react";
import type { ReviewActionStatus, ReviewQueueItem } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

const reviewActions: ReviewActionStatus[] = ["approved", "accepted-incomplete", "rejected"];

export function BootstrapReviewPage() {
  const [stageBatchId, setStageBatchId] = useState("");
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<ReviewActionStatus>("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [lastUpdatedCount, setLastUpdatedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setError(null);
    try {
      const nextQueue = await window.purrifer.bootstrapReview.listNeedsReviewQueue({
        stageBatchId: stageBatchId.trim() || undefined
      });
      setQueue(nextQueue);
      setSelectedRecordIds([]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa review queue.");
    }
  }

  function toggleRecord(recordId: string) {
    setSelectedRecordIds((current) =>
      current.includes(recordId) ? current.filter((item) => item !== recordId) : [...current, recordId]
    );
  }

  async function applyBulkAction() {
    setError(null);
    setLastUpdatedCount(null);
    try {
      const result = await window.purrifer.bootstrapReview.applyBulkAction({
        stageBatchId,
        recordIds: selectedRecordIds,
        actionStatus,
        reviewNote
      });
      setLastUpdatedCount(result.updatedCount);
      await loadQueue();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte tillämpa bulk action.");
    }
  }

  const queueByBatch = useMemo(() => {
    const grouped = new Map<string, ReviewQueueItem[]>();
    queue.forEach((item) => {
      const group = grouped.get(item.stageBatchId) ?? [];
      group.push(item);
      grouped.set(item.stageBatchId, group);
    });
    return [...grouped.entries()];
  }, [queue]);

  return (
    <Page>
      <PageHeader
        eyebrow="Bootstrap Review"
        title="Manuell godkännandeport för adapterinflöde"
        description="Needs-review-records måste få manuellt beslut innan de kan räknas som operativt godkända."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Filter">
        <FieldGrid>
          <Field label="stage_batch_id (valfri)">
            <input value={stageBatchId} onChange={(event) => setStageBatchId(event.target.value)} placeholder="SB000001" />
          </Field>
        </FieldGrid>
        <Actions>
          <Button onClick={() => void loadQueue()}>Läs review queue</Button>
        </Actions>
      </Panel>

      <SplitLayout>
        <Panel title="Needs-review queue" status={<StatusPill>{queue.length}</StatusPill>}>
          {queueByBatch.length > 0 ? (
            <Stack>
              {queueByBatch.map(([batch, items]) => (
                <article key={batch} className="ui-card">
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{batch}</h4>
                      <p className="ui-muted">{items.length} records</p>
                    </div>
                  </div>
                  <Stack>
                    {items.map((item) => (
                      <label key={`${item.stageBatchId}-${item.recordId}`} className="ui-card selectable">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.includes(item.recordId)}
                          onChange={() => toggleRecord(item.recordId)}
                        />
                        <p className="ui-muted">{item.recordType} · {item.recordId} · {item.sourceFileId}</p>
                        <small>reasons: {item.reasonCodes.join(", ") || "none"}</small>
                      </label>
                    ))}
                  </Stack>
                </article>
              ))}
            </Stack>
          ) : (
            <EmptyState>Ingen review-post hittades med aktuellt filter.</EmptyState>
          )}
        </Panel>

        <Panel title="Bulk action" status={<StatusPill>{selectedRecordIds.length}</StatusPill>}>
          <FieldGrid>
            <Field label="Action status">
              <select value={actionStatus} onChange={(event) => setActionStatus(event.target.value as ReviewActionStatus)}>
                {reviewActions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Review note (obligatorisk)" className="ui-field-span">
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} />
            </Field>
          </FieldGrid>
          <Actions>
            <Button tone="secondary" onClick={() => void applyBulkAction()}>Tillämpa manuellt beslut</Button>
          </Actions>
          <small>{lastUpdatedCount !== null ? `Uppdaterade records: ${lastUpdatedCount}` : "Inga beslut skickade ännu."}</small>
        </Panel>
      </SplitLayout>
    </Page>
  );
}


