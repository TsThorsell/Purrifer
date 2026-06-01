import { useEffect, useMemo, useState } from "react";
import type {
  VoucherBackupResult,
  VoucherCandidate,
  VoucherDocumentRelation,
  VoucherProofChainLink,
  VoucherStatusHistoryEntry,
  VoucherVerificationStatus
} from "../contracts";
import type { VoucherDetails } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

interface VoucherAndProofPageProps {
  initialVoucherId?: string;
}

const verificationOptions: Array<{ value: VoucherVerificationStatus; label: string }> = [
  { value: "full", label: "Fullt verifierad" },
  { value: "half", label: "Halvverifierad" },
  { value: "accepted-incomplete", label: "Inkomplett men accepterad" }
];

export function VoucherAndProofPage({ initialVoucherId }: VoucherAndProofPageProps) {
  const [vouchers, setVouchers] = useState<VoucherDetails[]>([]);
  const [candidates, setCandidates] = useState<VoucherCandidate[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetails | null>(null);
  const [relations, setRelations] = useState<VoucherDocumentRelation[]>([]);
  const [statusHistory, setStatusHistory] = useState<VoucherStatusHistoryEntry[]>([]);
  const [proofChain, setProofChain] = useState<VoucherProofChainLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ backupDirectory: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function refreshData(preferredVoucherId?: string) {
    try {
      const [voucherSummaries, candidateList] = await Promise.all([
        window.purrifer.voucherAndProof.listVouchers(),
        window.purrifer.voucherAndProof.listVoucherCandidates()
      ]);

      const detailList = await Promise.all(
        voucherSummaries.map((voucher) => window.purrifer.voucherAndProof.getVoucher(voucher.voucherId))
      );

      setVouchers(detailList);
      setCandidates(candidateList);

      const nextId =
        preferredVoucherId ??
        selectedVoucherId ??
        detailList[0]?.voucherId ??
        null;
      setSelectedVoucherId(nextId);

      if (!nextId) {
        setSelectedVoucher(null);
        setRelations([]);
        setStatusHistory([]);
        setProofChain([]);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa verifikatdata.");
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    if (!selectedVoucherId) {
      setSelectedVoucher(null);
      setRelations([]);
      setStatusHistory([]);
      setProofChain([]);
      return;
    }

    void Promise.all([
      window.purrifer.voucherAndProof.getVoucher(selectedVoucherId),
      window.purrifer.voucherAndProof.listVoucherRelations(selectedVoucherId),
      window.purrifer.voucherAndProof.getVoucherStatusHistory(selectedVoucherId),
      window.purrifer.voucherAndProof.getVoucherProofChain(selectedVoucherId)
    ]).then(([voucher, linkedRelations, history, chain]) => {
      setSelectedVoucher(voucher);
      setRelations(linkedRelations);
      setStatusHistory(history);
      setProofChain(chain);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa verifikatdetaljer.");
      setSelectedVoucher(null);
      setRelations([]);
      setStatusHistory([]);
      setProofChain([]);
    });
  }, [selectedVoucherId]);

  useEffect(() => {
    if (!initialVoucherId) {
      return;
    }
    void refreshData(initialVoucherId);
  }, [initialVoucherId]);

  const unlinkedCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.alreadyLinked),
    [candidates]
  );

  async function createVoucher(documentId: string) {
    setBusyAction(documentId);
    setError(null);
    try {
      const voucher = await window.purrifer.voucherAndProof.createVoucherFromDocument(documentId);
      setSelectedVoucherId(voucher.voucherId);
      await refreshData(voucher.voucherId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa verifikat.");
    } finally {
      setBusyAction(null);
    }
  }

  async function linkSupportingDocument(documentId: string) {
    if (!selectedVoucher) {
      return;
    }

    const key = `link:${selectedVoucher.voucherId}:${documentId}`;
    setBusyAction(key);
    setError(null);

    try {
      await window.purrifer.voucherAndProof.linkVoucherToDocument(
        selectedVoucher.voucherId,
        documentId,
        "supporting-document"
      );
      await refreshData(selectedVoucher.voucherId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte länka dokumentet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateVerificationStatus(status: VoucherVerificationStatus) {
    if (!selectedVoucher) {
      return;
    }

    setBusyAction(status);
    setError(null);

    try {
      const updated = await window.purrifer.voucherAndProof.setVoucherVerificationStatus(
        selectedVoucher.voucherId,
        status
      );
      setSelectedVoucher(updated);
      await refreshData(updated.voucherId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera verifieringsstatus.");
    } finally {
      setBusyAction(null);
    }
  }

  async function exportSelectedVoucher() {
    if (!selectedVoucher) {
      return;
    }

    setBusyAction("export");
    setError(null);

    try {
      const result = await window.purrifer.voucherAndProof.exportVoucherBackup(selectedVoucher.voucherId);
      setLastExport(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte exportera verifikatbackup.");
    } finally {
      setBusyAction(null);
    }
  }

  async function openSelectedSource() {
    if (!selectedVoucher) {
      return;
    }

    setError(null);

    try {
      await window.purrifer.voucherAndProof.openVoucherSourceDocument(selectedVoucher.voucherId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte öppna verifikatets underlag.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Voucher and Proof"
        title="Verifikat och beviskedja"
        description="Skapa verifikat från sparade dokument, hantera relationer, spåra verifieringsstatus och beviskedja."
      />
      {error ? <div className="ui-error-banner">{error}</div> : null}
      {lastExport ? <div className="ui-success-banner">Backup exporterad till {lastExport.backupDirectory}</div> : null}

      <SplitLayout>
        <Panel title="Skapa från dokument" status={<StatusPill>{unlinkedCandidates.length}</StatusPill>}>
          {unlinkedCandidates.length === 0 ? (
            <EmptyState>
              Alla kända dokument är redan kopplade till verifikat, eller så saknas inkorgsposter.
            </EmptyState>
          ) : null}
          <Stack>
            {unlinkedCandidates.map((candidate) => (
              <article key={candidate.documentId} className="ui-card">
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{candidate.fileName}</h4>
                    <p className="ui-muted">{candidate.source} · {candidate.mimeType}</p>
                  </div>
                  <StatusPill>{candidate.documentId}</StatusPill>
                </div>
                <small>{candidate.receivedAt}</small>
                <Actions>
                  <Button
                    onClick={() => void createVoucher(candidate.documentId)}
                    disabled={busyAction === candidate.documentId}
                  >
                    Skapa verifikat (primärkälla)
                  </Button>
                  <Button
                    tone="secondary"
                    onClick={() => void linkSupportingDocument(candidate.documentId)}
                    disabled={!selectedVoucher || busyAction === `link:${selectedVoucher?.voucherId}:${candidate.documentId}`}
                  >
                    Koppla som stöd till valt verifikat
                  </Button>
                </Actions>
              </article>
            ))}
          </Stack>
        </Panel>

        <Panel title="Befintliga verifikat" status={<StatusPill>{vouchers.length}</StatusPill>}>
          {vouchers.length === 0 ? <EmptyState>Inga verifikat skapade ännu.</EmptyState> : null}
          <Stack>
            {vouchers.map((voucher) => (
              <button
                key={voucher.voucherId}
                className={
                  voucher.voucherId === selectedVoucherId
                    ? "ui-card selectable selected"
                    : "ui-card selectable"
                }
                type="button"
                onClick={() => setSelectedVoucherId(voucher.voucherId)}
              >
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{voucher.sourceFileName}</h4>
                    <p className="ui-muted">{voucher.voucherId} · {voucher.sourceDocumentId}</p>
                  </div>
                  <StatusPill tone={mapStatusTone(voucher.verificationStatus)}>
                    {renderStatusLabel(voucher.verificationStatus)}
                  </StatusPill>
                </div>
                <small>{voucher.createdAt}</small>
              </button>
            ))}
          </Stack>
        </Panel>
      </SplitLayout>

      <Panel
        title="Valt verifikat"
        status={selectedVoucher ? <StatusPill>{selectedVoucher.voucherId}</StatusPill> : undefined}
      >
        {!selectedVoucher ? (
          <EmptyState>Välj ett verifikat för att se detaljer, ändra status eller exportera backup.</EmptyState>
        ) : (
          <>
            <FieldGrid>
              <Field label="Titel"><p>{selectedVoucher.title}</p></Field>
              <Field label="Källfil"><p>{selectedVoucher.sourceFileName}</p></Field>
              <Field label="Dokument-id"><p>{selectedVoucher.sourceDocumentId}</p></Field>
              <Field label="Verifieringsstatus"><p>{renderStatusLabel(selectedVoucher.verificationStatus)}</p></Field>
              <Field label="MIME-typ"><p>{selectedVoucher.sourceMimeType}</p></Field>
              <Field label="Mottagen"><p>{selectedVoucher.sourceReceivedAt}</p></Field>
              <Field label="Lagrad sökväg" className="ui-field-span">
                <p className="ui-path-preview">{selectedVoucher.sourceStoredPath}</p>
              </Field>
              <Field label="Verifieringsläge" className="ui-field-span">
                <div className="ui-choice-row">
                  {verificationOptions.map((option) => (
                    <Button
                      key={option.value}
                      tone="secondary"
                      className={
                        selectedVoucher.verificationStatus === option.value
                          ? "ui-selected-chip"
                          : undefined
                      }
                      onClick={() => void updateVerificationStatus(option.value)}
                      disabled={busyAction === option.value}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Field>
            </FieldGrid>
            <Actions>
              <Button onClick={() => void openSelectedSource()}>Öppna underlag</Button>
              <Button onClick={() => void exportSelectedVoucher()} disabled={busyAction === "export"}>Exportera UL/MD</Button>
            </Actions>
          </>
        )}
      </Panel>

      <SplitLayout>
        <Panel title="Relaterade dokument" status={<StatusPill>{relations.length}</StatusPill>}>
          <Stack>
            {relations.map((relation) => (
              <article key={`${relation.voucherId}-${relation.documentId}-${relation.relationType}`} className="ui-card">
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{relation.documentFileName}</h4>
                    <p className="ui-muted">{relation.documentId}</p>
                  </div>
                  <StatusPill>{renderRelationType(relation.relationType)}</StatusPill>
                </div>
                <small>Länkat av {relation.linkedBy} kl {relation.linkedAt}</small>
              </article>
            ))}
            {relations.length === 0 ? <EmptyState>Inga dokumentrelationer registrerade.</EmptyState> : null}
          </Stack>
        </Panel>

        <Panel title="Statushistorik" status={<StatusPill>{statusHistory.length}</StatusPill>}>
          <Stack>
            {statusHistory.map((entry) => (
              <article key={entry.historyId} className="ui-card">
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{renderTransitionLabel(entry.previousStatus, entry.newStatus)}</h4>
                    <p className="ui-muted">{entry.actor}</p>
                  </div>
                  <StatusPill>{entry.reasonCode ?? "statusändring"}</StatusPill>
                </div>
                <small>{entry.changedAt}</small>
                <p className="ui-muted">{entry.reasonCode ?? "Spårbar ändring"}</p>
              </article>
            ))}
            {statusHistory.length === 0 ? <EmptyState>Ingen statushistorik ännu.</EmptyState> : null}
          </Stack>
        </Panel>
      </SplitLayout>

      <Panel title="Beviskedja" status={<StatusPill>{proofChain.length}</StatusPill>}>
        <Stack>
          {proofChain.map((entry) => (
            <article key={`${entry.commitBatchId}-${entry.recordId}`} className="ui-card">
              <div className="ui-card__header">
                <div className="ui-card__title-block">
                  <h4>{entry.recordType}</h4>
                  <p className="ui-muted">{entry.recordId}</p>
                </div>
                <StatusPill>{entry.stageStatus}</StatusPill>
              </div>
              <p className="ui-muted">{entry.commitBatchId} · {entry.committedAt}</p>
              <small>Länkad till objekt {entry.objectType}:{entry.objectId}</small>
              {entry.reviewActionStatus ? <small>Granskningsstatus: {entry.reviewActionStatus}</small> : null}
            </article>
          ))}
          {proofChain.length === 0 ? <EmptyState>Ingen beviskedja ännu.</EmptyState> : null}
        </Stack>
      </Panel>
    </Page>
  );
}

function renderStatusLabel(status: VoucherVerificationStatus): string {
  switch (status) {
    case "full":
      return "Fullt verifierad";
    case "half":
      return "Halvverifierad";
    default:
      return "Inkomplett men accepterad";
  }
}

function mapStatusTone(status: VoucherVerificationStatus): "success" | "warning" | "neutral" {
  switch (status) {
    case "full":
      return "success";
    case "half":
      return "warning";
    default:
      return "neutral";
  }
}

function renderRelationType(relationType: "primary-source" | "supporting-document") {
  return relationType === "primary-source" ? "Primärkälla" : "Stöddokument";
}

function renderTransitionLabel(previousStatus: string | null, newStatus: string): string {
  if (!previousStatus) {
    return `Skapad med status ${newStatus}`;
  }
  return `${previousStatus} → ${newStatus}`;
}
