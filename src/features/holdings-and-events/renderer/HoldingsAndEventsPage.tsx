import { useEffect, useState } from "react";
import type {
  CreateHoldingEventInput,
  CreateHoldingInput,
  HoldingAnalysis,
  HoldingDetails,
  HoldingTimelineFilter,
  HoldingTimelineItem,
  HoldingEventType,
  HoldingSummary
} from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

const eventTypes: HoldingEventType[] = ["deposit", "withdrawal", "valuation"];
const timelineEventTypes: Array<"" | HoldingEventType> = ["", ...eventTypes];

export function HoldingsAndEventsPage() {
  const [entityId, setEntityId] = useState("");
  const [holdingName, setHoldingName] = useState("");
  const [holdings, setHoldings] = useState<HoldingSummary[]>([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [details, setDetails] = useState<HoldingDetails | null>(null);
  const [analysis, setAnalysis] = useState<HoldingAnalysis | null>(null);
  const [eventType, setEventType] = useState<HoldingEventType>("deposit");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventAmount, setEventAmount] = useState("0");
  const [eventNote, setEventNote] = useState("");
  const [timeline, setTimeline] = useState<HoldingTimelineItem[]>([]);
  const [timelineHoldingId, setTimelineHoldingId] = useState("");
  const [timelineEntityId, setTimelineEntityId] = useState("");
  const [timelineEventType, setTimelineEventType] = useState<"" | HoldingEventType>("");
  const [timelineFromDate, setTimelineFromDate] = useState("");
  const [timelineToDate, setTimelineToDate] = useState("");
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(preferredId?: string) {
    const list = await window.purrifer.holdingsAndEvents.listHoldings(entityId || undefined);
    setHoldings(list);
    const nextSelected = preferredId ?? selectedHoldingId ?? list[0]?.holdingId ?? null;
    setSelectedHoldingId(nextSelected);
  }

  async function refreshTimeline() {
    const timelineFilter: HoldingTimelineFilter = {
      holdingId: timelineHoldingId.trim() || undefined,
      entityId: timelineEntityId.trim() || undefined,
      eventType: timelineEventType || undefined,
      fromEventDate: timelineFromDate.trim() || undefined,
      toEventDate: timelineToDate.trim() || undefined
    };

    const list = await window.purrifer.holdingsAndEvents.listHoldingTimeline(timelineFilter);
    setTimeline(list);

    const nextSelectedTimelineEvent = selectedTimelineEventId && list.some((item) => item.eventId === selectedTimelineEventId)
      ? selectedTimelineEventId
      : list[0]?.eventId ?? null;
    setSelectedTimelineEventId(nextSelectedTimelineEvent);
  }

  async function applyTimelineFilter() {
    try {
      await refreshTimeline();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa sammanhållen tidslinje.");
    }
  }

  useEffect(() => {
    Promise.all([refresh(), refreshTimeline()]).catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa moduldata.")
    );
  }, [entityId]);

  useEffect(() => {
    if (!selectedHoldingId) {
      setDetails(null);
      setAnalysis(null);
      return;
    }
    void Promise.all([
      window.purrifer.holdingsAndEvents.getHoldingDetails(selectedHoldingId),
      window.purrifer.holdingsAndEvents.getHoldingAnalysis(selectedHoldingId)
    ])
      .then(([item, nextAnalysis]) => {
        setDetails(item);
        setAnalysis(nextAnalysis);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa innehavsdetalj.")
      );
  }, [selectedHoldingId]);

  async function createHolding() {
    setError(null);
    try {
      const input: CreateHoldingInput = { entityId, name: holdingName };
      const created = await window.purrifer.holdingsAndEvents.createHolding(input);
      setHoldingName("");
      await refresh(created.holdingId);
      await refreshTimeline();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa innehav.");
    }
  }

  async function createEvent() {
    if (!selectedHoldingId) {
      setError("Välj ett innehav innan du skapar händelse.");
      return;
    }

    setError(null);
    try {
      const input: CreateHoldingEventInput = {
        holdingId: selectedHoldingId,
        eventType,
        eventDate,
        amount: Number(eventAmount),
        note: eventNote || undefined
      };
      await window.purrifer.holdingsAndEvents.createHoldingEvent(input);
      setEventAmount("0");
      setEventNote("");
      await refresh(selectedHoldingId);
      await refreshTimeline();
      const [nextDetails, nextAnalysis] = await Promise.all([
        window.purrifer.holdingsAndEvents.getHoldingDetails(selectedHoldingId),
        window.purrifer.holdingsAndEvents.getHoldingAnalysis(selectedHoldingId)
      ]);
      setDetails(nextDetails);
      setAnalysis(nextAnalysis);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa händelse.");
    }
  }

  function openTimelineItem(item: HoldingTimelineItem) {
    setSelectedTimelineEventId(item.eventId);
    setSelectedHoldingId(item.holdingId);
  }

  const selectedTimelineItem = timeline.find((item) => item.eventId === selectedTimelineEventId) ?? null;

  return (
    <Page>
      <PageHeader
        eyebrow="Holdings and Events"
        title="Innehav och tidslinje"
        description="Skapa innehav, registrera händelser och följ utvecklingen i en sparbar tidslinje."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <SplitLayout>
        <Panel title="Skapa innehav">
          <FieldGrid>
            <Field label="Entitet (entityId)">
              <input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" />
            </Field>
            <Field label="Namn">
              <input value={holdingName} onChange={(event) => setHoldingName(event.target.value)} placeholder="ISK Nordnet" />
            </Field>
          </FieldGrid>
          <Actions>
            <Button onClick={() => void createHolding()}>Skapa innehav</Button>
          </Actions>
        </Panel>

        <Panel title="Innehavslista" status={<StatusPill>{holdings.length}</StatusPill>}>
          {holdings.length > 0 ? (
            <Stack>
              {holdings.map((item) => (
                <button
                  key={item.holdingId}
                  type="button"
                  className={item.holdingId === selectedHoldingId ? "ui-card selectable selected" : "ui-card selectable"}
                  onClick={() => setSelectedHoldingId(item.holdingId)}
                >
                  <h4>{item.name}</h4>
                  <p className="ui-muted">{item.holdingId} · {item.entityId}</p>
                  <small>{item.updatedAt}</small>
                </button>
              ))}
            </Stack>
          ) : (
            <EmptyState>Inga innehav hittades för aktuellt filter.</EmptyState>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Innehavsanalys v1.5" status={<StatusPill>{analysis ? analysis.holdingId : "-"}</StatusPill>}>
          {analysis ? (
            <Stack>
              <article className="ui-card"><h4>Totalt investerat</h4><p>{analysis.totalInvested.toFixed(2)}</p><small>{analysis.definitions.totalInvested}</small></article>
              <article className="ui-card"><h4>Genomsnittligt anskaffningsvärde</h4><p>{analysis.averageAcquisitionRelevant && analysis.averageAcquisitionValue !== undefined ? analysis.averageAcquisitionValue.toFixed(2) : "Ej relevant"}</p><small>{analysis.definitions.averageAcquisitionValue}</small></article>
              <article className="ui-card"><h4>Senaste värdering</h4><p>{analysis.latestValuation !== undefined ? analysis.latestValuation.toFixed(2) : "Saknas"}</p><small>{analysis.definitions.latestValuation}</small></article>
              <article className="ui-card"><h4>Totalvärde</h4><p>{analysis.totalValue.toFixed(2)}</p><small>{analysis.definitions.totalValue}</small></article>
            </Stack>
          ) : (
            <EmptyState>Välj ett innehav för att se analys.</EmptyState>
          )}
        </Panel>

        <Panel title="Ny händelse">
          <FieldGrid>
            <Field label="Typ">
              <select value={eventType} onChange={(event) => setEventType(event.target.value as HoldingEventType)}>
                {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Datum">
              <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            </Field>
            <Field label="Belopp/värde">
              <input value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} />
            </Field>
            <Field label="Notering" className="ui-field-span">
              <textarea value={eventNote} onChange={(event) => setEventNote(event.target.value)} />
            </Field>
          </FieldGrid>
          <Actions>
            <Button tone="secondary" onClick={() => void createEvent()} disabled={!selectedHoldingId}>Skapa händelse</Button>
          </Actions>
        </Panel>

        <Panel title="Tidslinje" status={<StatusPill>{timeline.length}</StatusPill>}>
          <FieldGrid>
            <Field label="HoldingId filter">
              <input value={timelineHoldingId} onChange={(event) => setTimelineHoldingId(event.target.value)} placeholder="EH01001" />
            </Field>
            <Field label="EntityId filter">
              <input value={timelineEntityId} onChange={(event) => setTimelineEntityId(event.target.value)} placeholder="E000001" />
            </Field>
            <Field label="Typfilter">
              <select
                value={timelineEventType}
                onChange={(event) => setTimelineEventType(event.target.value as "" | HoldingEventType)}
              >
                {timelineEventTypes.map((itemType) => (
                  <option key={itemType || "all"} value={itemType || ""}>
                    {itemType || "Alla"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Från datum">
              <input type="date" value={timelineFromDate} onChange={(event) => setTimelineFromDate(event.target.value)} />
            </Field>
            <Field label="Till datum">
              <input type="date" value={timelineToDate} onChange={(event) => setTimelineToDate(event.target.value)} />
            </Field>
          </FieldGrid>
          <Actions>
            <Button onClick={() => void applyTimelineFilter()} tone="secondary">Sök i tidslinje</Button>
          </Actions>

          {(timeline ?? []).length > 0 ? (
            <Stack>
              {(timeline ?? []).map((entry) => (
                <button
                  key={entry.eventId}
                  type="button"
                  className={entry.eventId === selectedTimelineEventId ? "ui-card selectable selected" : "ui-card selectable"}
                  onClick={() => openTimelineItem(entry)}
                >
                  <h4>{entry.holdingName}</h4>
                  <p className="ui-muted">{entry.eventType} · {entry.eventDate} · {entry.eventId}</p>
                  <p>belopp/värde: {entry.amount.toFixed(2)}</p>
                  <small>{entry.note ?? "Ingen notering"}</small>
                </button>
              ))}
            </Stack>
          ) : (
            <EmptyState>Ingen tidslinjedata matchar valt filter.</EmptyState>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Händelsedetalj" status={<StatusPill>{selectedTimelineItem?.eventId ?? "-"}</StatusPill>}>
          {selectedTimelineItem ? (
            <Stack>
              <article className="ui-card">
                <h4>{selectedTimelineItem.holdingName}</h4>
                <p>holdingId: {selectedTimelineItem.holdingId}</p>
                <p>entityId: {selectedTimelineItem.entityId}</p>
                <p>typ: {selectedTimelineItem.eventType}</p>
                <p>datum: {selectedTimelineItem.eventDate}</p>
                <p>skapat: {selectedTimelineItem.createdAt}</p>
                <p>belopp/värde: {selectedTimelineItem.amount.toFixed(2)}</p>
                <small>{selectedTimelineItem.note ?? "Ingen notering"}</small>
              </article>
            </Stack>
          ) : (
            <EmptyState>Välj en tidslinjerad för detaljvy.</EmptyState>
          )}
        </Panel>
      </SplitLayout>
    </Page>
  );
}


