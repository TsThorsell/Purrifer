import { useEffect, useMemo, useState } from "react";
import type {
  VoucherBackupResult,
  VoucherCandidate,
  VoucherDetails,
  VoucherVerificationStatus
} from "../contracts";

const verificationOptions: Array<{
  value: VoucherVerificationStatus;
  label: string;
}> = [
  { value: "full", label: "Fullt verifierad" },
  { value: "half", label: "Halvverifierad" },
  { value: "accepted-incomplete", label: "Inkomplett men accepterad" }
];

export function VoucherAndProofPage() {
  const [vouchers, setVouchers] = useState<VoucherDetails[]>([]);
  const [candidates, setCandidates] = useState<VoucherCandidate[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<VoucherBackupResult | null>(null);
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

      const nextId = preferredVoucherId ?? selectedVoucherId ?? detailList[0]?.voucherId ?? null;
      setSelectedVoucherId(nextId);
      if (!nextId) {
        setSelectedVoucher(null);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa verifikatdata.");
    }
  }

  useEffect(() => {
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedVoucherId) {
      setSelectedVoucher(null);
      return;
    }

    void window.purrifer.voucherAndProof
      .getVoucher(selectedVoucherId)
      .then(setSelectedVoucher)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa verifikatdetaljer.");
      });
  }, [selectedVoucherId]);

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
      setError(reason instanceof Error ? reason.message : "Kunde inte oppna verifikatets underlag.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Voucher and Proof</p>
          <h2>Verifikat och beviskedja</h2>
          <p className="muted">
            Skapa verifikat fran sparade dokument, satt verifieringsstatus och exportera backup som UL/MD.
          </p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {lastExport ? (
        <div className="success-banner">
          Backup exporterad till {lastExport.backupDirectory}
        </div>
      ) : null}

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Skapa fran dokument</h3>
            <span className="status-pill neutral">{unlinkedCandidates.length}</span>
          </div>
          <div className="stacked-list">
            {unlinkedCandidates.length === 0 ? (
              <div className="empty-state">
                <p>Alla kanda dokument ar redan kopplade till verifikat, eller sa saknas inkorgsposter.</p>
              </div>
            ) : null}

            {unlinkedCandidates.map((candidate) => (
              <article key={candidate.documentId} className="list-card">
                <div className="list-card-topline">
                  <h4>{candidate.fileName}</h4>
                  <span className="status-pill neutral">{candidate.documentId}</span>
                </div>
                <p className="muted">
                  {candidate.source} · {candidate.mimeType}
                </p>
                <small>{candidate.receivedAt}</small>
                <div className="detail-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void createVoucher(candidate.documentId)}
                    disabled={busyAction === candidate.documentId}
                  >
                    Skapa verifikat
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Befintliga verifikat</h3>
            <span className="status-pill neutral">{vouchers.length}</span>
          </div>

          <div className="stacked-list">
            {vouchers.length === 0 ? (
              <div className="empty-state">
                <p>Inga verifikat skapade annu.</p>
              </div>
            ) : null}

            {vouchers.map((voucher) => (
              <button
                key={voucher.voucherId}
                className={voucher.voucherId === selectedVoucherId ? "list-card selectable selected" : "list-card selectable"}
                type="button"
                onClick={() => setSelectedVoucherId(voucher.voucherId)}
              >
                <div className="list-card-topline">
                  <h4>{voucher.sourceFileName}</h4>
                  <span className={`status-pill ${mapStatusClass(voucher.verificationStatus)}`}>
                    {renderStatusLabel(voucher.verificationStatus)}
                  </span>
                </div>
                <p className="muted">
                  {voucher.voucherId} · {voucher.sourceDocumentId}
                </p>
                <small>{voucher.createdAt}</small>
              </button>
            ))}
          </div>
        </article>
      </section>

      <article className="panel-card">
        <div className="panel-topline">
          <h3>Valt verifikat</h3>
          {selectedVoucher ? <span className="status-pill neutral">{selectedVoucher.voucherId}</span> : null}
        </div>

        {!selectedVoucher ? (
          <div className="empty-state">
            <p>Valj ett verifikat for att se detaljer, andra status eller exportera backup.</p>
          </div>
        ) : (
          <div className="detail-grid">
            <div>
              <p className="detail-label">Titel</p>
              <p>{selectedVoucher.title}</p>
            </div>
            <div>
              <p className="detail-label">Kallfil</p>
              <p>{selectedVoucher.sourceFileName}</p>
            </div>
            <div>
              <p className="detail-label">Dokument-id</p>
              <p>{selectedVoucher.sourceDocumentId}</p>
            </div>
            <div>
              <p className="detail-label">Verifieringsstatus</p>
              <p>{renderStatusLabel(selectedVoucher.verificationStatus)}</p>
            </div>
            <div>
              <p className="detail-label">MIME-typ</p>
              <p>{selectedVoucher.sourceMimeType}</p>
            </div>
            <div>
              <p className="detail-label">Mottagen</p>
              <p>{selectedVoucher.sourceReceivedAt}</p>
            </div>

            <div className="detail-span">
              <p className="detail-label">Lagrad sokvag</p>
              <p className="path-preview">{selectedVoucher.sourceStoredPath}</p>
            </div>

            <div className="detail-span">
              <p className="detail-label">Verifieringslage</p>
              <div className="choice-row">
                {verificationOptions.map((option) => (
                  <button
                    key={option.value}
                    className={
                      selectedVoucher.verificationStatus === option.value
                        ? "secondary-button selected-chip"
                        : "secondary-button"
                    }
                    type="button"
                    onClick={() => void updateVerificationStatus(option.value)}
                    disabled={busyAction === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-actions">
              <button className="secondary-button" type="button" onClick={() => void openSelectedSource()}>
                Oppna underlag
              </button>
              <button className="primary-button" type="button" onClick={() => void exportSelectedVoucher()} disabled={busyAction === "export"}>
                Exportera UL/MD
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function renderStatusLabel(status: VoucherVerificationStatus): string {
  switch (status) {
    case "full":
      return "Fullt verifierad";
    case "half":
      return "Halvverifierad";
    case "accepted-incomplete":
      return "Inkomplett men accepterad";
    default:
      return status;
  }
}

function mapStatusClass(status: VoucherVerificationStatus): string {
  switch (status) {
    case "full":
      return "completed";
    case "half":
      return "running";
    case "accepted-incomplete":
      return "neutral";
    default:
      return "neutral";
  }
}

