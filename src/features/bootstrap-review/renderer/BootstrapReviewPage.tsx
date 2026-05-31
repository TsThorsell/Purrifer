import { useMemo, useState } from "react";
import type { ReviewActionStatus, ReviewQueueItem } from "../contracts";

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
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa review queue.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte tillampa bulk action.");
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
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bootstrap Review</p>
          <h2>Manuell godkännandeport för adapterinflöde</h2>
          <p className="muted">
            Needs-review-records måste få manuellt beslut innan de kan betraktas som operativt godkända.
          </p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="field-grid">
          <label className="field-label" htmlFor="review-stage-batch-id">stage_batch_id (valfri)</label>
          <input
            id="review-stage-batch-id"
            className="text-input"
            value={stageBatchId}
            onChange={(event) => setStageBatchId(event.target.value)}
            placeholder="SB000001"
          />
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void loadQueue()}>
            Lasa review queue
          </button>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Needs-review queue</h3>
            <span className="status-pill neutral">{queue.length}</span>
          </div>
          {queueByBatch.length > 0 ? (
            <div className="stacked-list">
              {queueByBatch.map(([batch, items]) => (
                <article key={batch} className="list-card">
                  <h4>{batch}</h4>
                  <small>{items.length} records</small>
                  <div className="stacked-list">
                    {items.map((item) => (
                      <label key={`${item.stageBatchId}-${item.recordId}`} className="list-card selectable">
                        <input
                          type="checkbox"
                          checked={selectedRecordIds.includes(item.recordId)}
                          onChange={() => toggleRecord(item.recordId)}
                        />
                        <p className="muted">{item.recordType} · {item.recordId} · {item.sourceFileId}</p>
                        <small>reasons: {item.reasonCodes.join(", ") || "none"}</small>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Ingen review-post hittades med aktuellt filter.</p>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Bulk action</h3>
            <span className="status-pill neutral">{selectedRecordIds.length}</span>
          </div>
          <div className="detail-grid">
            <div>
              <p className="detail-label">Action status</p>
              <select value={actionStatus} onChange={(event) => setActionStatus(event.target.value as ReviewActionStatus)}>
                {reviewActions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="detail-span">
              <p className="detail-label">Review note (obligatorisk)</p>
              <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} />
            </div>
            <div className="detail-actions">
              <button className="secondary-button" type="button" onClick={() => void applyBulkAction()}>
                Tillampa manuellt beslut
              </button>
            </div>
          </div>
          {lastUpdatedCount !== null ? (
            <small>Uppdaterade records: {lastUpdatedCount}</small>
          ) : (
            <small>Inga beslut skickade an.</small>
          )}
        </article>
      </section>
    </section>
  );
}

