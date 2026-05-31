import { useState } from "react";
import type { SearchNavigationTarget } from "@features/search-and-index/contracts";
import type {
  BudgetComparisonResult,
  EntityBalanceSnapshot,
  EntityLedgerEntry,
  PeriodDecisionView,
  YearOverYearComparisonResult
} from "../contracts";

interface ReportsLitePageProps {
  onDrilldown: (target: SearchNavigationTarget) => void;
}

export function ReportsLitePage({ onDrilldown }: ReportsLitePageProps) {
  const [entityId, setEntityId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [ledger, setLedger] = useState<EntityLedgerEntry[]>([]);
  const [balance, setBalance] = useState<EntityBalanceSnapshot | null>(null);
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparisonResult | null>(null);
  const [yearOverYear, setYearOverYear] = useState<YearOverYearComparisonResult | null>(null);
  const [periodAFromDate, setPeriodAFromDate] = useState("");
  const [periodAToDate, setPeriodAToDate] = useState("");
  const [periodBFromDate, setPeriodBFromDate] = useState("");
  const [periodBToDate, setPeriodBToDate] = useState("");
  const [periodDecision, setPeriodDecision] = useState<PeriodDecisionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    if (!entityId.trim()) {
      setError("Ange entityId for att hamta rapport.");
      return;
    }

    const safeYear = Number(year);
    const safeMonth = month ? Number(month) : undefined;

    setError(null);
    try {
      const [ledgerRows, balanceSnapshot, budgetResult, yoyResult] = await Promise.all([
        window.purrifer.reportsLite.listEntityLedger(entityId.trim(), fromDate || undefined, toDate || undefined),
        window.purrifer.reportsLite.getEntityBalanceSnapshot(entityId.trim(), toDate || undefined),
        window.purrifer.reportsLite.getBudgetComparison(entityId.trim(), safeYear, safeMonth),
        window.purrifer.reportsLite.getYearOverYearComparison(entityId.trim(), safeYear, safeMonth)
      ]);
      setLedger(ledgerRows);
      setBalance(balanceSnapshot);
      setBudgetComparison(budgetResult);
      setYearOverYear(yoyResult);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte hamta rapport.");
    }
  }

  async function loadPeriodDecision() {
    if (!entityId.trim()) {
      setError("Ange entityId for periodjamforelse.");
      return;
    }
    setError(null);
    try {
      const result = await window.purrifer.reportsLite.getPeriodDecisionView(
        entityId.trim(),
        periodAFromDate,
        periodAToDate,
        periodBFromDate,
        periodBToDate
      );
      setPeriodDecision(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte hamta period-beslutsvy.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports Lite</p>
          <h2>Transaktionsjournal och balansoversikt</h2>
          <p className="muted">Forenklad rapportv1 per entitet med drilldown till underlag.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <div className="detail-grid">
          <div>
            <p className="detail-label">Entity Id</p>
            <input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" />
          </div>
          <div>
            <p className="detail-label">Fran datum</p>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Till datum</p>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Ar</p>
            <input value={year} onChange={(event) => setYear(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Manad (valfri)</p>
            <input value={month} onChange={(event) => setMonth(event.target.value)} placeholder="1-12" />
          </div>
          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={() => void loadReport()}>
              Hamta rapport
            </button>
          </div>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Balansoversikt</h3>
            <span className="status-pill neutral">{balance ? balance.entityId : "-"}</span>
          </div>
          {balance ? (
            <div className="detail-grid">
              <div><p className="detail-label">As of</p><p>{balance.asOfDate}</p></div>
              <div><p className="detail-label">In</p><p>{balance.inflowTotal.toFixed(2)}</p></div>
              <div><p className="detail-label">Ut</p><p>{balance.outflowTotal.toFixed(2)}</p></div>
              <div><p className="detail-label">Netto</p><p>{balance.netTotal.toFixed(2)}</p></div>
              <div><p className="detail-label">Oppna poster</p><p>{balance.openInvoiceAmount.toFixed(2)}</p></div>
              <div className="detail-span"><small>{balance.note}</small></div>
            </div>
          ) : (
            <p className="muted">Ingen balansdata laddad.</p>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Transaktionsjournal</h3>
            <span className="status-pill neutral">{ledger.length}</span>
          </div>
          <div className="stacked-list">
            {ledger.map((entry) => (
              <button
                key={`${entry.entryType}-${entry.referenceId}`}
                className="list-card selectable"
                type="button"
                onClick={() =>
                  onDrilldown({
                    route: entry.drilldownRoute,
                    objectType: entry.drilldownObjectType,
                    objectId: entry.drilldownObjectId,
                    title: `${entry.entryType} ${entry.referenceId}`,
                    summary: `${entry.amount.toFixed(2)} (${entry.source})`
                  })
                }
              >
                <h4>{entry.entryType}</h4>
                <p className="muted">{entry.date} · {entry.referenceId} · {entry.source}</p>
                <p>belopp: {entry.amount.toFixed(2)}</p>
              </button>
            ))}
            {ledger.length === 0 ? <p className="muted">Inga journalposter i valda filter.</p> : null}
          </div>
        </article>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Budget mot utfall</h3>
            <span className="status-pill neutral">{budgetComparison?.rows.length ?? 0}</span>
          </div>
          {budgetComparison ? (
            <>
              <p className="muted">{budgetComparison.note}</p>
              <div className="stacked-list">
                {budgetComparison.rows.map((row) => (
                  <article key={row.categoryKey} className="list-card">
                    <h4>{row.categoryLabel}</h4>
                    <p className="muted">budget: {row.budgetAmount.toFixed(2)} · utfall: {row.actualAmount.toFixed(2)}</p>
                    <p>avvikelse: {row.varianceAmount.toFixed(2)} ({row.variancePercent.toFixed(2)}%)</p>
                    {row.uncertainty !== "none" ? <small>osaker data: {row.uncertaintyReason ?? "okand"}</small> : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Ingen budgetjamforelse laddad.</p>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>Ar-jamforelse</h3>
            <span className="status-pill neutral">{yearOverYear?.rows.length ?? 0}</span>
          </div>
          {yearOverYear ? (
            <>
              <p className="muted">{yearOverYear.note}</p>
              <div className="stacked-list">
                {yearOverYear.rows.map((row) => (
                  <article key={row.categoryKey} className="list-card">
                    <h4>{row.categoryLabel}</h4>
                    <p className="muted">nu: {row.currentAmount.toFixed(2)} · foregaende ar: {row.previousAmount.toFixed(2)}</p>
                    <p>delta: {row.deltaAmount.toFixed(2)} ({row.deltaPercent.toFixed(2)}%)</p>
                    {row.uncertainty !== "none" ? <small>osaker data: {row.uncertaintyReason ?? "okand"}</small> : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Ingen ar-jamforelse laddad.</p>
          )}
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-topline">
          <h3>Periodjamforelse (beslutsvy)</h3>
          <span className="status-pill neutral">{periodDecision?.rows.length ?? 0}</span>
        </div>
        <div className="detail-grid">
          <div>
            <p className="detail-label">Period A fran</p>
            <input type="date" value={periodAFromDate} onChange={(event) => setPeriodAFromDate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Period A till</p>
            <input type="date" value={periodAToDate} onChange={(event) => setPeriodAToDate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Period B fran</p>
            <input type="date" value={periodBFromDate} onChange={(event) => setPeriodBFromDate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Period B till</p>
            <input type="date" value={periodBToDate} onChange={(event) => setPeriodBToDate(event.target.value)} />
          </div>
          <div className="detail-actions">
            <button className="secondary-button" type="button" onClick={() => void loadPeriodDecision()}>
              Hamta beslutsvy
            </button>
          </div>
        </div>
        {periodDecision ? (
          <>
            <p className="muted">{periodDecision.note}</p>
            <div className="stacked-list">
              {periodDecision.rows.map((row) => (
                <article key={row.categoryKey} className="list-card">
                  <h4>{row.categoryLabel}</h4>
                  <p className="muted">A: {row.periodAAmount.toFixed(2)} · B: {row.periodBAmount.toFixed(2)}</p>
                  <p>delta: {row.deltaAmount.toFixed(2)} ({row.deltaPercent.toFixed(2)}%)</p>
                  {row.uncertainty !== "none" ? <small>osaker data: {row.uncertaintyReason ?? "okand"}</small> : null}
                </article>
              ))}
            </div>
            <div className="detail-grid">
              <div><p className="detail-label">Total A</p><p>{periodDecision.totals.periodAAmount.toFixed(2)}</p></div>
              <div><p className="detail-label">Total B</p><p>{periodDecision.totals.periodBAmount.toFixed(2)}</p></div>
              <div><p className="detail-label">Total delta</p><p>{periodDecision.totals.deltaAmount.toFixed(2)} ({periodDecision.totals.deltaPercent.toFixed(2)}%)</p></div>
              <div className="detail-span">
                <p className="detail-label">Export (CSV)</p>
                <textarea value={periodDecision.exportCsv} readOnly rows={8} />
              </div>
            </div>
          </>
        ) : (
          <p className="muted">Ingen periodjamforelse laddad.</p>
        )}
      </section>
    </section>
  );
}
