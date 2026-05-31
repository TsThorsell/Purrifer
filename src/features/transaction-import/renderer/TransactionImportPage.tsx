import { useMemo, useState } from "react";
import type {
  ImportBatchSummary,
  ImportCommitResult,
  ImportObjectType,
  ImportReview,
  SaveImportRowMappingInput
} from "../contracts";

const objectTypeOptions: Array<{ value: ImportObjectType; label: string }> = [
  { value: "leverantorsfaktura", label: "Leverantorsfaktura" },
  { value: "betalhandelse", label: "Betalhandelse" },
  { value: "verifikat", label: "Verifikat" },
  { value: "atagande", label: "Atagande" },
  { value: "arende", label: "Arende" },
  { value: "innehavshandelse", label: "Innehavshandelse" },
  { value: "ovrigt", label: "Ovrigt" }
];

export function TransactionImportPage() {
  const [batches, setBatches] = useState<ImportBatchSummary[]>([]);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<number | null>(null);

  async function refreshBatches() {
    const list = await window.purrifer.transactionImport.listImportBatches();
    setBatches(list);
  }

  async function selectAndPreview() {
    setError(null);
    setCommitResult(null);
    try {
      const preview = await window.purrifer.transactionImport.selectAndPreviewImportFile();
      await refreshBatches();
      if (preview) {
        const nextReview = await window.purrifer.transactionImport.getImportReview(preview.batchId);
        setReview(nextReview);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte importera fil.");
    }
  }

  async function openBatch(batchId: string) {
    setError(null);
    setCommitResult(null);
    try {
      const nextReview = await window.purrifer.transactionImport.getImportReview(batchId);
      setReview(nextReview);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa importgranskning.");
    }
  }

  async function saveMapping(input: SaveImportRowMappingInput) {
    setError(null);
    setBusyRow(input.rowNumber);
    try {
      await window.purrifer.transactionImport.saveImportRowMapping(input);
      const nextReview = await window.purrifer.transactionImport.getImportReview(input.batchId);
      setReview(nextReview);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte spara mappning.");
    } finally {
      setBusyRow(null);
    }
  }

  async function commitBatch() {
    if (!review) {
      return;
    }
    setError(null);
    setCommitResult(null);
    try {
      const committed = await window.purrifer.transactionImport.commitImportBatch(review.batch.batchId);
      setCommitResult(committed);
      const nextReview = await window.purrifer.transactionImport.getImportReview(review.batch.batchId);
      setReview(nextReview);
      await refreshBatches();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte committa batch.");
    }
  }

  const mappedRows = useMemo(() => review?.rows.filter((row) => row.isMapped).length ?? 0, [review]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Transaction Import</p>
          <h2>Importgranskning med manuell mappning</h2>
          <p className="muted">
            Mappa importerade rader till Entitet, Konto och objekttyp innan commit. Radata bevaras i batchen.
          </p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void selectAndPreview()}>
            Valj fil och skapa granskningsbatch
          </button>
          <button className="secondary-button" type="button" onClick={() => void refreshBatches()}>
            Uppdatera batchlista
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!review}
            onClick={() => void commitBatch()}
          >
            Commit mappade rader
          </button>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Sparade batcher</h3>
            <span className="status-pill neutral">{batches.length}</span>
          </div>
          <div className="stacked-list">
            {batches.map((batch) => (
              <button
                key={batch.batchId}
                className="list-card selectable"
                type="button"
                onClick={() => void openBatch(batch.batchId)}
              >
                <h4>{batch.fileName}</h4>
                <p className="muted">{batch.batchId} · {batch.fileType}</p>
                <small>
                  {batch.importedAt} · totalt {batch.totalRows} · giltiga {batch.validRows} · fel {batch.invalidRows}
                </small>
              </button>
            ))}
            {batches.length === 0 ? <p className="muted">Inga batcher sparade an.</p> : null}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Granskningsstatus</h3>
            <span className="status-pill neutral">{review?.batch.batchId ?? "-"}</span>
          </div>
          {review ? (
            <>
              <p className="muted">
                {review.batch.fileName} · totalt {review.batch.totalRows} · mappade {mappedRows}
              </p>
              <small>Commit skapar sparbara poster med mappningsmetadata utan att skriva over radata.</small>
            </>
          ) : (
            <p className="muted">Ingen batch vald.</p>
          )}

          {commitResult ? (
            <div className="list-card">
              <h4>Senaste commit</h4>
              <p className="muted">{commitResult.commitId} · {commitResult.committedAt}</p>
              <small>Committed rows: {commitResult.committedRows} / {commitResult.totalRows}</small>
            </div>
          ) : null}
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-topline">
          <h3>Rader att mappa</h3>
          <span className="status-pill neutral">{review?.rows.length ?? 0}</span>
        </div>
        {review ? (
          <div className="stacked-list">
            {review.rows.map((row) => {
              const matchingAccounts = review.accounts.filter(
                (account) => account.entityId === row.mapping?.entityId
              );
              return (
                <article key={row.rowNumber} className="list-card">
                  <h4>Rad {row.rowNumber}</h4>
                  <p className="muted">
                    {row.date ?? "-"} · {row.description ?? "-"} · {row.amount ?? "-"}
                  </p>
                  {row.isValid ? <small>Validering: OK</small> : <small>Fel: {row.validationErrors.join(" | ")}</small>}
                  <div className="detail-actions">
                    <select
                      value={row.mapping?.entityId ?? ""}
                      onChange={(event) => {
                        const nextEntityId = event.target.value;
                        if (!nextEntityId) {
                          return;
                        }
                        const nextAccount = review.accounts.find((account) => account.entityId === nextEntityId);
                        const objectType = row.mapping?.objectType ?? "ovrigt";
                        if (!nextAccount) {
                          setError("Vald entitet saknar konto att mappa mot.");
                          return;
                        }
                        void saveMapping({
                          batchId: review.batch.batchId,
                          rowNumber: row.rowNumber,
                          entityId: nextEntityId,
                          accountId: nextAccount.accountId,
                          objectType
                        });
                      }}
                    >
                      <option value="">Valj Entitet</option>
                      {review.entities.map((entity) => (
                        <option key={entity.entityId} value={entity.entityId}>{entity.name}</option>
                      ))}
                    </select>

                    <select
                      value={row.mapping?.accountId ?? ""}
                      onChange={(event) => {
                        if (!review || !row.mapping?.entityId || !event.target.value) {
                          return;
                        }
                        void saveMapping({
                          batchId: review.batch.batchId,
                          rowNumber: row.rowNumber,
                          entityId: row.mapping.entityId,
                          accountId: event.target.value,
                          objectType: row.mapping.objectType ?? "ovrigt"
                        });
                      }}
                      disabled={!row.mapping?.entityId}
                    >
                      <option value="">Valj Konto</option>
                      {matchingAccounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>{account.name}</option>
                      ))}
                    </select>

                    <select
                      value={row.mapping?.objectType ?? ""}
                      onChange={(event) => {
                        if (!review || !row.mapping?.entityId || !row.mapping?.accountId || !event.target.value) {
                          return;
                        }
                        void saveMapping({
                          batchId: review.batch.batchId,
                          rowNumber: row.rowNumber,
                          entityId: row.mapping.entityId,
                          accountId: row.mapping.accountId,
                          objectType: event.target.value as ImportObjectType
                        });
                      }}
                      disabled={!row.mapping?.entityId || !row.mapping?.accountId}
                    >
                      <option value="">Valj Objekttyp</option>
                      {objectTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <small>
                    Mappning: {row.isMapped ? "klar" : "ej klar"}
                    {busyRow === row.rowNumber ? " · sparar..." : ""}
                  </small>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">Valj en batch for att mappa rader.</p>
        )}
      </section>
    </section>
  );
}
