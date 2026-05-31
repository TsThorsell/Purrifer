import { useEffect, useState } from "react";
import type {
  CaseDetails,
  CaseStatus,
  CaseSummary,
  CreateCaseInput,
  CreateChecklistItemInput,
  CompleteChecklistItemInput,
  DeviationCaseSummary,
  CreateObligationInput,
  ObligationDetails,
  ObligationStatus,
  ObligationSummary,
  UpdateObligationInput
} from "../contracts";

const statusOptions: ObligationStatus[] = [
  "draft",
  "active",
  "waiting",
  "done",
  "accepted-incomplete",
  "archived"
];

const caseStatusOptions: CaseStatus[] = [
  "new",
  "draft",
  "waiting",
  "done",
  "accepted-incomplete",
  "archived"
];

export function ObligationsAndCasesPage() {
  const [items, setItems] = useState<ObligationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ObligationDetails | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entityId, setEntityId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<ObligationStatus>("draft");
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseDetails | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [caseStatus, setCaseStatus] = useState<CaseStatus>("new");
  const [checklistLabel, setChecklistLabel] = useState("");
  const [deviationCases, setDeviationCases] = useState<DeviationCaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh(preferredId?: string) {
    const next = await window.purrifer.obligationsAndCases.listObligations();
    setItems(next);
    const pick = preferredId ?? selectedId ?? next[0]?.obligationId ?? null;
    setSelectedId(pick);
  }

  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa ataganden.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void window.purrifer.obligationsAndCases
      .getObligationDetails(selectedId)
      .then((item) => {
        setSelected(item);
        setTitle(item.title);
        setDescription(item.description ?? "");
        setEntityId(item.entityId ?? "");
        setDueDate(item.dueDate ?? "");
        setStatus(item.status);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa atagandedetalj.")
      );
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setCases([]);
      setSelectedCaseId(null);
      setSelectedCase(null);
      return;
    }
    void window.purrifer.obligationsAndCases
      .listCases(selectedId)
      .then((nextCases) => {
        setCases(nextCases);
        const pick = nextCases[0]?.caseId ?? null;
        setSelectedCaseId(pick);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa arenden.")
      );
  }, [selectedId]);

  useEffect(() => {
    if (!selectedCaseId) {
      setSelectedCase(null);
      setCaseTitle("");
      setCaseDescription("");
      setCaseStatus("new");
      return;
    }
    void window.purrifer.obligationsAndCases
      .getCaseDetails(selectedCaseId)
      .then((item) => {
        setSelectedCase(item);
        setCaseTitle(item.title);
        setCaseDescription(item.description ?? "");
        setCaseStatus(item.status);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa arendedetalj.")
      );
  }, [selectedCaseId]);

  useEffect(() => {
    void window.purrifer.obligationsAndCases
      .listDeviationCases()
      .then((items) => setDeviationCases(items))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa avvikelser.")
      );
  }, []);

  async function createObligation() {
    setError(null);
    try {
      const input: CreateObligationInput = {
        title,
        description: description || undefined,
        status,
        entityId: entityId || undefined,
        dueDate: dueDate || undefined
      };
      const created = await window.purrifer.obligationsAndCases.createObligation(input);
      await refresh(created.obligationId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa atagande.");
    }
  }

  async function updateObligation() {
    if (!selectedId) {
      return;
    }
    setError(null);
    try {
      const input: UpdateObligationInput = {
        obligationId: selectedId,
        title,
        description,
        status,
        entityId,
        dueDate
      };
      const updated = await window.purrifer.obligationsAndCases.updateObligation(input);
      await refresh(updated.obligationId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera atagande.");
    }
  }

  async function refreshCases(preferredCaseId?: string) {
    if (!selectedId) {
      return;
    }
    const nextCases = await window.purrifer.obligationsAndCases.listCases(selectedId);
    setCases(nextCases);
    const pick = preferredCaseId ?? selectedCaseId ?? nextCases[0]?.caseId ?? null;
    setSelectedCaseId(pick);
  }

  async function createCase() {
    if (!selectedId) {
      setError("Valj ett atagande innan du skapar arende.");
      return;
    }
    setError(null);
    try {
      const input: CreateCaseInput = {
        obligationId: selectedId,
        title: caseTitle,
        description: caseDescription || undefined,
        status: caseStatus
      };
      const created = await window.purrifer.obligationsAndCases.createCase(input);
      await refreshCases(created.caseId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa arende.");
    }
  }

  async function updateCase() {
    if (!selectedCaseId) {
      return;
    }
    setError(null);
    try {
      const updated = await window.purrifer.obligationsAndCases.updateCase({
        caseId: selectedCaseId,
        title: caseTitle,
        description: caseDescription,
        status: caseStatus
      });
      await refreshCases(updated.caseId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera arende.");
    }
  }

  async function createChecklistItem() {
    if (!selectedCaseId) {
      setError("Valj ett arende innan checklistepunkt skapas.");
      return;
    }
    setError(null);
    try {
      const input: CreateChecklistItemInput = {
        caseId: selectedCaseId,
        label: checklistLabel
      };
      await window.purrifer.obligationsAndCases.createChecklistItem(input);
      setChecklistLabel("");
      await refreshCases(selectedCaseId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa checklistepunkt.");
    }
  }

  async function completeChecklistItem(checklistItemId: string) {
    setError(null);
    try {
      const input: CompleteChecklistItemInput = { checklistItemId };
      await window.purrifer.obligationsAndCases.completeChecklistItem(input);
      if (selectedCaseId) {
        await refreshCases(selectedCaseId);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte markera checklistepunkt klar.");
    }
  }

  async function runDeviationScan() {
    setError(null);
    try {
      await window.purrifer.obligationsAndCases.runDeviationScan();
      const items = await window.purrifer.obligationsAndCases.listDeviationCases();
      setDeviationCases(items);
      if (selectedId) {
        await refreshCases(selectedCaseId ?? undefined);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte kora avvikelsekontroll.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Obligations and Cases</p>
          <h2>Ataganden</h2>
          <p className="muted">Skapa, uppdatera och folj status for ataganden i v1.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Atagandelista</h3>
            <span className="status-pill neutral">{items.length}</span>
          </div>
          <div className="stacked-list">
            {items.map((item) => (
              <button
                key={item.obligationId}
                className={item.obligationId === selectedId ? "list-card selectable selected" : "list-card selectable"}
                type="button"
                onClick={() => setSelectedId(item.obligationId)}
              >
                <h4>{item.title}</h4>
                <p className="muted">
                  {item.obligationId} · {item.status}
                </p>
                <small>{item.updatedAt}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>{selected ? "Uppdatera atagande" : "Skapa atagande"}</h3>
            {selected ? <span className="status-pill neutral">{selected.obligationId}</span> : null}
          </div>
          <div className="detail-grid">
            <div className="detail-span">
              <p className="detail-label">Titel</p>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="detail-span">
              <p className="detail-label">Beskrivning</p>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div>
              <p className="detail-label">Status</p>
              <select value={status} onChange={(event) => setStatus(event.target.value as ObligationStatus)}>
                {statusOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="detail-label">Entity Id</p>
              <input value={entityId} onChange={(event) => setEntityId(event.target.value)} />
            </div>
            <div>
              <p className="detail-label">Forfallodatum</p>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="detail-actions">
              <button className="primary-button" type="button" onClick={() => void createObligation()}>
                Skapa
              </button>
              <button className="secondary-button" type="button" onClick={() => void updateObligation()} disabled={!selectedId}>
                Uppdatera vald
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Arenden for valt atagande</h3>
            <span className="status-pill neutral">{cases.length}</span>
          </div>
          <div className="stacked-list">
            {cases.map((item) => (
              <button
                key={item.caseId}
                className={item.caseId === selectedCaseId ? "list-card selectable selected" : "list-card selectable"}
                type="button"
                onClick={() => setSelectedCaseId(item.caseId)}
              >
                <h4>{item.title}</h4>
                <p className="muted">
                  {item.caseId} · {item.status}
                </p>
                <small>{item.updatedAt}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>{selectedCase ? "Uppdatera arende" : "Skapa arende"}</h3>
            {selectedCase ? <span className="status-pill neutral">{selectedCase.caseId}</span> : null}
          </div>
          <div className="detail-grid">
            <div className="detail-span">
              <p className="detail-label">Titel</p>
              <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} />
            </div>
            <div className="detail-span">
              <p className="detail-label">Beskrivning</p>
              <textarea value={caseDescription} onChange={(event) => setCaseDescription(event.target.value)} />
            </div>
            <div>
              <p className="detail-label">Status</p>
              <select value={caseStatus} onChange={(event) => setCaseStatus(event.target.value as CaseStatus)}>
                {caseStatusOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="detail-actions">
              <button className="primary-button" type="button" onClick={() => void createCase()}>
                Skapa arende
              </button>
              <button className="secondary-button" type="button" onClick={() => void updateCase()} disabled={!selectedCaseId}>
                Uppdatera arende
              </button>
            </div>
            <div className="detail-span">
              <p className="detail-label">Checklista</p>
              <div className="stacked-list">
                {(selectedCase?.checklist ?? []).map((item) => (
                  <article key={item.checklistItemId} className="list-card">
                    <div className="panel-topline">
                      <h4>{item.label}</h4>
                      <span className="status-pill neutral">
                        {item.completedAt ? "klar" : "oppen"}
                      </span>
                    </div>
                    <p className="muted">{item.checklistItemId}</p>
                    <small>{item.completedAt ?? "Ej klar"}</small>
                    <div className="detail-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void completeChecklistItem(item.checklistItemId)}
                        disabled={Boolean(item.completedAt)}
                      >
                        Markera klar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="detail-grid">
                <div className="detail-span">
                  <p className="detail-label">Ny checklistepunkt</p>
                  <input value={checklistLabel} onChange={(event) => setChecklistLabel(event.target.value)} />
                </div>
                <div className="detail-actions">
                  <button className="primary-button" type="button" onClick={() => void createChecklistItem()} disabled={!selectedCaseId}>
                    Skapa checklistepunkt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-topline">
          <h3>Avvikelsearenden</h3>
          <span className="status-pill neutral">{deviationCases.length}</span>
        </div>
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={() => void runDeviationScan()}>
            Kor avvikelsekontroll
          </button>
        </div>
        <div className="stacked-list">
          {deviationCases.map((item) => (
            <article key={item.caseId} className="list-card">
              <h4>{item.title}</h4>
              <p className="muted">
                {item.rule} Â· {item.sourceType} Â· {item.sourceId}
              </p>
              <small>
                {item.caseId} Â· {item.status} Â· {item.detectedAt}
              </small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
