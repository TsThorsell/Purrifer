import { useMemo, useState } from "react";
import type { SearchNavigationTarget } from "@app/registry/routeHostTypes";
import type {
  BudgetComparisonResult,
  EntityBalanceSnapshot,
  EntityLedgerEntry,
  PeriodDecisionView,
  YearOverYearComparisonResult
} from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

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
  const [ledgerSortMode, setLedgerSortMode] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">(
    "date-desc"
  );

  const visibleLedger = useMemo(
    () => [...ledger].sort((left, right) => {
      if (ledgerSortMode === "date-asc") {
        return left.date.localeCompare(right.date);
      }
      if (ledgerSortMode === "date-desc") {
        return right.date.localeCompare(left.date);
      }
      if (ledgerSortMode === "amount-desc") {
        return right.amount - left.amount;
      }
      return left.amount - right.amount;
    }),
    [ledger, ledgerSortMode]
  );

  async function loadReport() {
    if (!entityId.trim()) {
      setError("Ange entityId för att hämta rapport.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte hämta rapport.");
    }
  }

  async function loadPeriodDecision() {
    if (!entityId.trim()) {
      setError("Ange entityId för periodjämförelse.");
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
      setError(reason instanceof Error ? reason.message : "Kunde inte hämta period-beslutsvy.");
    }
  }

  async function copyPeriodCsvToClipboard() {
    if (!periodDecision?.exportCsv) {
      return;
    }
    try {
      await navigator.clipboard.writeText(periodDecision.exportCsv);
    } catch {
      setError("Kunde inte kopiera CSV till urklipp. Välj och kopiera manuellt.");
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Reports Lite" title="Transaktionsjournal och balansöversikt" description="Förenklad rapportvy per entitet med drilldown till underlag." />
      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Filter">
        <FieldGrid>
          <Field label="Entity Id"><input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" /></Field>
          <Field label="Från datum"><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
          <Field label="Till datum"><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
          <Field label="År"><input value={year} onChange={(event) => setYear(event.target.value)} /></Field>
          <Field label="Månad (valfri)"><input value={month} onChange={(event) => setMonth(event.target.value)} placeholder="1-12" /></Field>
        </FieldGrid>
        <Actions><Button onClick={() => void loadReport()}>Hämta rapport</Button></Actions>
      </Panel>

      <SplitLayout>
        <Panel title="Balansöversikt" status={<StatusPill>{balance ? balance.entityId : "-"}</StatusPill>}>
          {balance ? (
            <FieldGrid>
              <Field label="As of"><p>{balance.asOfDate}</p></Field>
              <Field label="In"><p>{balance.inflowTotal.toFixed(2)}</p></Field>
              <Field label="Ut"><p>{balance.outflowTotal.toFixed(2)}</p></Field>
              <Field label="Netto"><p>{balance.netTotal.toFixed(2)}</p></Field>
              <Field label="Öppna poster"><p>{balance.openInvoiceAmount.toFixed(2)}</p></Field>
              <Field label="Kommentar" className="ui-field-span"><small>{balance.note}</small></Field>
            </FieldGrid>
          ) : (
            <EmptyState>Ingen balansdata laddad.</EmptyState>
          )}
        </Panel>

        <Panel title="Transaktionsjournal" status={<StatusPill>{ledger.length}</StatusPill>}>
          <FieldGrid>
            <Field label="Sortera journal">
              <select
                value={ledgerSortMode}
                onChange={(event) =>
                  setLedgerSortMode(
                    event.target.value as "date-desc" | "date-asc" | "amount-desc" | "amount-asc"
                  )
                }
              >
                <option value="date-desc">Datum (nyast först)</option>
                <option value="date-asc">Datum (äldst först)</option>
                <option value="amount-desc">Belopp (störst först)</option>
                <option value="amount-asc">Belopp (minst först)</option>
              </select>
            </Field>
          </FieldGrid>
          {visibleLedger.length > 0 ? (
            <Stack>
              {visibleLedger.map((entry) => (
                <button
                  key={`${entry.entryType}-${entry.referenceId}`}
                  className="ui-card selectable"
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
                  <p className="ui-muted">{entry.date} · {entry.referenceId} · {entry.source}</p>
                  <p>belopp: {entry.amount.toFixed(2)}</p>
                </button>
              ))}
            </Stack>
          ) : (
            <EmptyState>Inga journalposter i valda filter.</EmptyState>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Budget mot utfall" status={<StatusPill>{budgetComparison?.rows.length ?? 0}</StatusPill>}>
          {budgetComparison ? (
            <>
              <p className="ui-muted">{budgetComparison.note}</p>
              <Stack>
                {budgetComparison.rows.map((row) => (
                  <article key={row.categoryKey} className="ui-card">
                    <h4>{row.categoryLabel}</h4>
                    <p className="ui-muted">budget: {row.budgetAmount.toFixed(2)} · utfall: {row.actualAmount.toFixed(2)}</p>
                    <p>avvikelse: {row.varianceAmount.toFixed(2)} ({row.variancePercent.toFixed(2)}%)</p>
                    {row.uncertainty !== "none" ? <small>osäker data: {row.uncertaintyReason ?? "okänd"}</small> : null}
                  </article>
                ))}
              </Stack>
            </>
          ) : (
            <EmptyState>Ingen budgetjämförelse laddad.</EmptyState>
          )}
        </Panel>

        <Panel title="År-jämförelse" status={<StatusPill>{yearOverYear?.rows.length ?? 0}</StatusPill>}>
          {yearOverYear ? (
            <>
              <p className="ui-muted">{yearOverYear.note}</p>
              <Stack>
                {yearOverYear.rows.map((row) => (
                  <article key={row.categoryKey} className="ui-card">
                    <h4>{row.categoryLabel}</h4>
                    <p className="ui-muted">nu: {row.currentAmount.toFixed(2)} · föregående år: {row.previousAmount.toFixed(2)}</p>
                    <p>delta: {row.deltaAmount.toFixed(2)} ({row.deltaPercent.toFixed(2)}%)</p>
                    {row.uncertainty !== "none" ? <small>osäker data: {row.uncertaintyReason ?? "okänd"}</small> : null}
                  </article>
                ))}
              </Stack>
            </>
          ) : (
            <EmptyState>Ingen år-jämförelse laddad.</EmptyState>
          )}
        </Panel>
      </SplitLayout>

      <Panel title="Periodjämförelse (beslutsvy)" status={<StatusPill>{periodDecision?.rows.length ?? 0}</StatusPill>}>
        <FieldGrid>
          <Field label="Period A från"><input type="date" value={periodAFromDate} onChange={(event) => setPeriodAFromDate(event.target.value)} /></Field>
          <Field label="Period A till"><input type="date" value={periodAToDate} onChange={(event) => setPeriodAToDate(event.target.value)} /></Field>
          <Field label="Period B från"><input type="date" value={periodBFromDate} onChange={(event) => setPeriodBFromDate(event.target.value)} /></Field>
          <Field label="Period B till"><input type="date" value={periodBToDate} onChange={(event) => setPeriodBToDate(event.target.value)} /></Field>
        </FieldGrid>
        <Actions><Button tone="secondary" onClick={() => void loadPeriodDecision()}>Hämta beslutsvy</Button></Actions>
        {periodDecision ? (
          <>
            <p className="ui-muted">{periodDecision.note}</p>
            <Stack>
              {periodDecision.rows.map((row) => (
                <article key={row.categoryKey} className="ui-card">
                  <h4>{row.categoryLabel}</h4>
                  <p className="ui-muted">A: {row.periodAAmount.toFixed(2)} · B: {row.periodBAmount.toFixed(2)}</p>
                  <p>delta: {row.deltaAmount.toFixed(2)} ({row.deltaPercent.toFixed(2)}%)</p>
                  {row.uncertainty !== "none" ? <small>osäker data: {row.uncertaintyReason ?? "okänd"}</small> : null}
                </article>
              ))}
            </Stack>
            <FieldGrid>
              <Field label="Total A"><p>{periodDecision.totals.periodAAmount.toFixed(2)}</p></Field>
              <Field label="Total B"><p>{periodDecision.totals.periodBAmount.toFixed(2)}</p></Field>
              <Field label="Total delta"><p>{periodDecision.totals.deltaAmount.toFixed(2)} ({periodDecision.totals.deltaPercent.toFixed(2)}%)</p></Field>
              <Field label="Export (CSV)" className="ui-field-span">
                <textarea value={periodDecision.exportCsv} readOnly rows={8} />
              </Field>
            </FieldGrid>
            <Actions>
              <Button tone="secondary" onClick={() => void copyPeriodCsvToClipboard()}>Kopiera CSV till urklipp</Button>
            </Actions>
          </>
        ) : (
          <EmptyState>Ingen periodjämförelse laddad.</EmptyState>
        )}
      </Panel>
    </Page>
  );
}

