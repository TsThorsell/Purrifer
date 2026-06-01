import { useMemo, useState } from "react";
import {
  Actions,
  Button,
  EmptyState,
  Page,
  PageHeader,
  Panel,
  SplitLayout,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";
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

const batchIsOperable = (status?: string): boolean => status === "ready";

export function TransactionImportPage() {
  const [batches, setBatches] = useState<ImportBatchSummary[]>([]);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null);

  const mappedRows = useMemo(() => review?.rows.filter((row) => row.isMapped).length ?? 0, [review]);
  const currentBatchId = review?.batch.batchId ?? null;
  const batchOperable = batchIsOperable(review?.batch.status);

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
    setBusyBatchId(batchId);
    try {
      const nextReview = await window.purrifer.transactionImport.getImportReview(batchId);
      setReview(nextReview);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa importgranskning.");
    } finally {
      setBusyBatchId(null);
    }
  }

  async function saveMapping(input: SaveImportRowMappingInput) {
    if (!batchOperable) {
      setError("Importbatchen är stoppad eller slutförd och kan inte ändras.");
      return;
    }
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
    if (!review || !batchOperable) {
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

  async function stopBatch(batchId: string) {
    setError(null);
    setBusyBatchId(batchId);
    try {
      await window.purrifer.transactionImport.stopImportBatch(batchId);
      const nextReview = await window.purrifer.transactionImport.getImportReview(batchId);
      setReview((current) => (current?.batch.batchId === batchId ? nextReview : current));
      await refreshBatches();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte stoppa batch.");
    } finally {
      setBusyBatchId(null);
    }
  }

  async function resumeBatch(batchId: string) {
    setError(null);
    setBusyBatchId(batchId);
    try {
      await window.purrifer.transactionImport.resumeImportBatch(batchId);
      const nextReview = await window.purrifer.transactionImport.getImportReview(batchId);
      setReview((current) => (current?.batch.batchId === batchId ? nextReview : current));
      await refreshBatches();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte återuppta batch.");
    } finally {
      setBusyBatchId(null);
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Transaction Import"
        title="Importgranskning med manuell mappning"
        description="Mappa importerade rader till Entitet, Konto och objekttyp innan commit. Rådata bevaras i batchen."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Batchhantering">
        <Actions>
          <Button tone="primary" onClick={() => void selectAndPreview()}>
            Välj fil och skapa granskningsbatch
          </Button>
          <Button tone="secondary" onClick={() => void refreshBatches()}>
            Uppdatera batchlista
          </Button>
          <Button tone="secondary" disabled={!review || !batchOperable} onClick={() => void commitBatch()}>
            Commit mappade rader
          </Button>
          <Button
            tone="secondary"
            disabled={!currentBatchId || review?.batch.status !== "ready"}
            onClick={() => currentBatchId && void stopBatch(currentBatchId)}
          >
            Stoppa import
          </Button>
          <Button
            tone="secondary"
            disabled={!currentBatchId || review?.batch.status !== "stopped"}
            onClick={() => currentBatchId && void resumeBatch(currentBatchId)}
          >
            Återuppta
          </Button>
        </Actions>
      </Panel>

      <SplitLayout>
        <Panel title="Sparade batcher" status={<StatusPill>{batches.length}</StatusPill>}>
          <Stack>
            {batches.map((batch) => (
              <button
                key={batch.batchId}
                className="ui-card selectable"
                type="button"
                onClick={() => void openBatch(batch.batchId)}
                disabled={busyBatchId === batch.batchId}
              >
                <h4>{batch.fileName}</h4>
                <p className="ui-muted">{batch.batchId} · {batch.fileType} · {batch.source}</p>
                <small>
                  {batch.importedAt} · status: {batch.status}
                  {batch.statusReason ? ` · ${batch.statusReason}` : ""}
                </small>
                <small>
                  Totalt {batch.totalRows} · giltiga {batch.validRows} · fel {batch.invalidRows}
                </small>
              </button>
            ))}
            {batches.length === 0 ? <EmptyState>Inga batcher sparade än.</EmptyState> : null}
          </Stack>
        </Panel>

        <Panel
          title="Granskningsstatus"
          status={
            <StatusPill>
              {review?.batch.status ?? "-"} / {review?.batch.batchId ?? "-"}
            </StatusPill>
          }
        >
          {review ? (
            <>
              <p className="ui-muted">
                {review.batch.fileName} · källa {review.batch.source}
              </p>
              <small>
                {review.batch.importedAt} · totalt {review.batch.totalRows} · mappade {mappedRows}
              </small>
            </>
          ) : (
            <p className="ui-muted">Ingen batch vald.</p>
          )}

          {commitResult ? (
            <div className="ui-card">
              <h4>Senaste commit</h4>
              <p className="ui-muted">{commitResult.commitId} · {commitResult.committedAt}</p>
              <small>Committed rows: {commitResult.committedRows} / {commitResult.totalRows}</small>
            </div>
          ) : null}
        </Panel>
      </SplitLayout>

      <Panel title="Rader att mappa" status={<StatusPill>{review?.rows.length ?? 0}</StatusPill>}>
        {review ? (
          <Stack>
            {review.rows.map((row) => {
              const matchingAccounts = review.accounts.filter(
                (account) => account.entityId === row.mapping?.entityId
              );

              return (
                <article key={row.rowNumber} className="ui-card">
                  <h4>Rad {row.rowNumber}</h4>
                  <p className="ui-muted">
                    {row.date ?? "-"} · {row.description ?? "-"} · {row.amount ?? "-"}
                  </p>
                  {row.isValid ? (
                    <small>Validering: OK</small>
                  ) : (
                    <small>Fel: {row.validationErrors.join(" | ")}</small>
                  )}
                  <Actions>
                    <select
                      className="ui-input"
                      value={row.mapping?.entityId ?? ""}
                      onChange={(event) => {
                        const nextEntityId = event.target.value;
                        if (!nextEntityId) {
                          return;
                        }

                        const nextAccount = review.accounts.find(
                          (account) => account.entityId === nextEntityId
                        );
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
                      disabled={!batchOperable || row.rowNumber === busyRow}
                    >
                      <option value="">Valj Entitet</option>
                      {review.entities.map((entity) => (
                        <option key={entity.entityId} value={entity.entityId}>
                          {entity.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="ui-input"
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
                      disabled={!batchOperable || !row.mapping?.entityId || row.rowNumber === busyRow}
                    >
                      <option value="">Valj Konto</option>
                      {matchingAccounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="ui-input"
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
                      disabled={
                        !batchOperable || !row.mapping?.entityId || !row.mapping?.accountId || row.rowNumber === busyRow
                      }
                    >
                      <option value="">Valj Objekttyp</option>
                      {objectTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Actions>
                  <small>
                    Mappning: {row.isMapped ? "klar" : "ej klar"}
                    {busyRow === row.rowNumber ? " · sparar..." : ""}
                  </small>
                </article>
              );
            })}
          </Stack>
        ) : (
          <EmptyState>Välj en batch för att mappa rader.</EmptyState>
        )}
      </Panel>
    </Page>
  );
}
