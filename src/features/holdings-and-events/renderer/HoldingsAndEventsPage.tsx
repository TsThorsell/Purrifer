import { useEffect, useState } from "react";
import type {
  CreateHoldingEventInput,
  CreateHoldingInput,
  HoldingAnalysis,
  HoldingDetails,
  HoldingEventType,
  HoldingSummary
} from "../contracts";

const eventTypes: HoldingEventType[] = ["deposit", "withdrawal", "valuation"];

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
  const [error, setError] = useState<string | null>(null);

  async function refresh(preferredId?: string) {
    const list = await window.purrifer.holdingsAndEvents.listHoldings(entityId || undefined);
    setHoldings(list);
    const nextSelected = preferredId ?? selectedHoldingId ?? list[0]?.holdingId ?? null;
    setSelectedHoldingId(nextSelected);
  }

  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa Innehav.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa Innehavsdetalj.")
      );
  }, [selectedHoldingId]);

  async function createHolding() {
    setError(null);
    try {
      const input: CreateHoldingInput = { entityId, name: holdingName };
      const created = await window.purrifer.holdingsAndEvents.createHolding(input);
      setHoldingName("");
      await refresh(created.holdingId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa Innehav.");
    }
  }

  async function createEvent() {
    if (!selectedHoldingId) {
      setError("Valj ett Innehav innan du skapar Handelse.");
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
      const [nextDetails, nextAnalysis] = await Promise.all([
        window.purrifer.holdingsAndEvents.getHoldingDetails(selectedHoldingId),
        window.purrifer.holdingsAndEvents.getHoldingAnalysis(selectedHoldingId)
      ]);
      setDetails(nextDetails);
      setAnalysis(nextAnalysis);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa Handelse.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Holdings and Events</p>
          <h2>Innehav och Tidslinje</h2>
          <p className="muted">Skapa Innehav, registrera Handelser och folj utvecklingen i en sparbar tidslinje.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="split-layout">
        <article className="panel-card">
          <h3>Skapa Innehav</h3>
          <div className="detail-grid">
            <div>
              <p className="detail-label">Entitet (entityId)</p>
              <input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" />
            </div>
            <div>
              <p className="detail-label">Namn</p>
              <input value={holdingName} onChange={(event) => setHoldingName(event.target.value)} placeholder="ISK Nordnet" />
            </div>
            <div className="detail-actions">
              <button className="primary-button" type="button" onClick={() => void createHolding()}>
                Skapa Innehav
              </button>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Innehavslista</h3>
            <span className="status-pill neutral">{holdings.length}</span>
          </div>
          <div className="stacked-list">
            {holdings.map((item) => (
              <button
                key={item.holdingId}
                type="button"
                className={item.holdingId === selectedHoldingId ? "list-card selectable selected" : "list-card selectable"}
                onClick={() => setSelectedHoldingId(item.holdingId)}
              >
                <h4>{item.name}</h4>
                <p className="muted">{item.holdingId} · {item.entityId}</p>
                <small>{item.updatedAt}</small>
              </button>
            ))}
            {holdings.length === 0 ? <p className="muted">Inga Innehav hittades for aktuellt filter.</p> : null}
          </div>
        </article>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Innehavsanalys v1.5</h3>
            <span className="status-pill neutral">{analysis ? analysis.holdingId : "-"}</span>
          </div>
          {analysis ? (
            <div className="stacked-list">
              <article className="list-card">
                <h4>Totalt investerat</h4>
                <p>{analysis.totalInvested.toFixed(2)}</p>
                <small>{analysis.definitions.totalInvested}</small>
              </article>
              <article className="list-card">
                <h4>Genomsnittligt anskaffningsvarde</h4>
                <p>
                  {analysis.averageAcquisitionRelevant && analysis.averageAcquisitionValue !== undefined
                    ? analysis.averageAcquisitionValue.toFixed(2)
                    : "Ej relevant"}
                </p>
                <small>{analysis.definitions.averageAcquisitionValue}</small>
              </article>
              <article className="list-card">
                <h4>Senaste vardering</h4>
                <p>{analysis.latestValuation !== undefined ? analysis.latestValuation.toFixed(2) : "Saknas"}</p>
                <small>{analysis.definitions.latestValuation}</small>
              </article>
              <article className="list-card">
                <h4>Totalvarde</h4>
                <p>{analysis.totalValue.toFixed(2)}</p>
                <small>{analysis.definitions.totalValue}</small>
              </article>
            </div>
          ) : (
            <p className="muted">Valj ett Innehav for att se analys.</p>
          )}
        </article>

        <article className="panel-card">
          <h3>Ny Handelse</h3>
          <div className="detail-grid">
            <div>
              <p className="detail-label">Typ</p>
              <select value={eventType} onChange={(event) => setEventType(event.target.value as HoldingEventType)}>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="detail-label">Datum</p>
              <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            </div>
            <div>
              <p className="detail-label">Belopp/varde</p>
              <input value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} />
            </div>
            <div className="detail-span">
              <p className="detail-label">Notering</p>
              <textarea value={eventNote} onChange={(event) => setEventNote(event.target.value)} />
            </div>
            <div className="detail-actions">
              <button className="secondary-button" type="button" onClick={() => void createEvent()} disabled={!selectedHoldingId}>
                Skapa Handelse
              </button>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Tidslinje</h3>
            <span className="status-pill neutral">{details?.timeline.length ?? 0}</span>
          </div>
          <div className="stacked-list">
            {(details?.timeline ?? []).map((entry) => (
              <article key={entry.eventId} className="list-card">
                <h4>{entry.eventType}</h4>
                <p className="muted">{entry.eventDate} · {entry.eventId}</p>
                <p>belopp/varde: {entry.amount.toFixed(2)}</p>
                <small>{entry.note ?? "Ingen notering"}</small>
              </article>
            ))}
            {(details?.timeline ?? []).length === 0 ? <p className="muted">Ingen Handelse registrerad for valt Innehav.</p> : null}
          </div>
        </article>
      </section>
    </section>
  );
}
