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
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

interface ObligationsAndCasesPageProps {
  initialCaseId?: string;
  initialObligationId?: string;
}

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

export function ObligationsAndCasesPage({ initialCaseId, initialObligationId }: ObligationsAndCasesPageProps) {
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

    if (preferredId) {
      return;
    }

    if (!preferredId && preferredId !== "") {
      const fallback = next[0]?.obligationId ?? null;
      setSelectedId(fallback);
    }
  }

  useEffect(() => {
    if (!initialCaseId && !initialObligationId) {
      void refresh().catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa åtaganden.")
      );
      return;
    }

    if (initialCaseId) {
      void window.purrifer.obligationsAndCases
        .getCaseDetails(initialCaseId)
        .then((caseItem) => {
          setSelectedCaseId(initialCaseId);
          void refresh(caseItem.obligationId);
        })
        .catch(() => {
          setError("Kunde inte öppna ärendet från sökträffen.");
        });
      return;
    }

    if (initialObligationId) {
      void refresh(initialObligationId).catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa åtaganden.")
      );
      return;
    }
  }, [initialCaseId, initialObligationId]);

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
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa åtagandedetalj.")
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
        if (selectedCaseId && nextCases.some((item) => item.caseId === selectedCaseId)) {
          return;
        }
        setSelectedCaseId(nextCases[0]?.caseId ?? null);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa ärenden.")
      );
  }, [selectedId, selectedCaseId]);

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
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa ärendedetalj.")
      );
  }, [selectedCaseId]);

  useEffect(() => {
    void window.purrifer.obligationsAndCases
      .listDeviationCases()
      .then(setDeviationCases)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa avvikelser.")
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
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa åtagande.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera åtagande.");
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
      setError("Välj ett åtagande innan du skapar ärende.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa ärende.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera ärende.");
    }
  }

  async function createChecklistItem() {
    if (!selectedCaseId) {
      setError("Välj ett ärende innan checklistepunkt skapas.");
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
      setDeviationCases(await window.purrifer.obligationsAndCases.listDeviationCases());
      if (selectedId) {
        await refreshCases(selectedCaseId ?? undefined);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte köra avvikelsekontroll.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Obligations and Cases"
        title="Åtaganden"
        description="Skapa, uppdatera och följ status för åtaganden i v1."
      />
      {error ? <div className="ui-error-banner">{error}</div> : null}

      <SplitLayout>
        <Panel title="Åtagandelista" status={<StatusPill>{items.length}</StatusPill>}>
          <Stack>
            {items.map((item) => (
              <button
                key={item.obligationId}
                className={
                  item.obligationId === selectedId ? "ui-card selectable selected" : "ui-card selectable"
                }
                type="button"
                onClick={() => setSelectedId(item.obligationId)}
              >
                <h4>{item.title}</h4>
                <p className="ui-muted">{item.obligationId} · {item.status}</p>
                <small>{item.updatedAt}</small>
              </button>
            ))}
            {items.length === 0 ? <EmptyState>Inga åtaganden ännu.</EmptyState> : null}
          </Stack>
        </Panel>

        <Panel
          title={selected ? "Uppdatera åtagande" : "Skapa åtagande"}
          status={selected ? <StatusPill>{selected.obligationId}</StatusPill> : undefined}
        >
          <FieldGrid>
            <Field label="Titel" className="ui-field-span">
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Beskrivning" className="ui-field-span">
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(event) => setStatus(event.target.value as ObligationStatus)}>
                {statusOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Entity Id">
              <input value={entityId} onChange={(event) => setEntityId(event.target.value)} />
            </Field>
            <Field label="Förfallodatum">
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Field>
          </FieldGrid>
          <Actions>
            <Button onClick={() => void createObligation()}>Skapa</Button>
            <Button tone="secondary" onClick={() => void updateObligation()} disabled={!selectedId}>
              Uppdatera vald
            </Button>
          </Actions>
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Ärenden för valt åtagande" status={<StatusPill>{cases.length}</StatusPill>}>
          <Stack>
            {cases.map((item) => (
              <button
                key={item.caseId}
                className={item.caseId === selectedCaseId ? "ui-card selectable selected" : "ui-card selectable"}
                type="button"
                onClick={() => setSelectedCaseId(item.caseId)}
              >
                <h4>{item.title}</h4>
                <p className="ui-muted">
                  {item.caseId} · {item.status} · {item.obligationId}
                </p>
                <small>{item.updatedAt}</small>
              </button>
            ))}
            {cases.length === 0 ? <EmptyState>Inga ärenden för valt åtagande.</EmptyState> : null}
          </Stack>
        </Panel>

        <Panel
          title={selectedCase ? "Uppdatera ärende" : "Skapa ärende"}
          status={selectedCase ? <StatusPill>{selectedCase.caseId}</StatusPill> : undefined}
        >
          {selectedCase ? <p className="ui-muted">Kopplat till åtagande {selectedCase.obligationId}</p> : null}
          <FieldGrid>
            <Field label="Titel" className="ui-field-span">
              <input value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} />
            </Field>
            <Field label="Beskrivning" className="ui-field-span">
              <textarea value={caseDescription} onChange={(event) => setCaseDescription(event.target.value)} />
            </Field>
            <Field label="Status">
              <select value={caseStatus} onChange={(event) => setCaseStatus(event.target.value as CaseStatus)}>
                {caseStatusOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGrid>
          <Actions>
            <Button onClick={() => void createCase()}>Skapa ärende</Button>
            <Button tone="secondary" onClick={() => void updateCase()} disabled={!selectedCaseId}>
              Uppdatera ärende
            </Button>
          </Actions>

          <Panel title="Checklista" status={<StatusPill>{selectedCase?.checklist.length ?? 0}</StatusPill>}>
            <Stack>
              {(selectedCase?.checklist ?? []).map((item) => (
                <article key={item.checklistItemId} className="ui-card">
                  <div className="ui-card__header">
                    <div className="ui-card__title-block">
                      <h4>{item.label}</h4>
                      <p className="ui-muted">{item.checklistItemId}</p>
                    </div>
                    <StatusPill>{item.completedAt ? "klar" : "öppen"}</StatusPill>
                  </div>
                  <small>{item.completedAt ?? "Ej klar"}</small>
                  <Actions>
                    <Button
                      tone="secondary"
                      onClick={() => void completeChecklistItem(item.checklistItemId)}
                      disabled={Boolean(item.completedAt)}
                    >
                      Markera klar
                    </Button>
                  </Actions>
                </article>
              ))}
              {(selectedCase?.checklist ?? []).length === 0 ? <EmptyState>Ingen checklista ännu.</EmptyState> : null}
            </Stack>
            <FieldGrid>
              <Field label="Ny checklistepunkt" className="ui-field-span">
                <input value={checklistLabel} onChange={(event) => setChecklistLabel(event.target.value)} />
              </Field>
            </FieldGrid>
            <Actions>
              <Button onClick={() => void createChecklistItem()} disabled={!selectedCaseId}>
                Skapa checklistepunkt
              </Button>
            </Actions>
          </Panel>
        </Panel>
      </SplitLayout>

      <Panel
        title="Avvikelseärenden"
        status={<StatusPill>{deviationCases.length}</StatusPill>}
        actions={<Button onClick={() => void runDeviationScan()}>Kör avvikelsekontroll</Button>}
      >
        <Stack>
          {deviationCases.map((item) => (
            <article key={item.caseId} className="ui-card">
              <h4>{item.title}</h4>
              <p className="ui-muted">{item.rule} · {item.sourceType} · {item.sourceId}</p>
              <small>{item.caseId} · {item.status} · {item.detectedAt}</small>
            </article>
          ))}
          {deviationCases.length === 0 ? <EmptyState>Inga aktiva avvikelseärenden.</EmptyState> : null}
        </Stack>
      </Panel>
    </Page>
  );
}
