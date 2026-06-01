import { useState } from "react";
import type { RetirementScenarioComparison, RetirementScenarioResult } from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, SplitLayout, Stack, StatusPill } from "../../../renderer/components/Ui";

export function RetirementBaselinePage() {
  const [entityId, setEntityId] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("45000");
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState("18000");
  const [annualReturnRate, setAnnualReturnRate] = useState("5");
  const [annualInterestRate, setAnnualInterestRate] = useState("2");
  const [horizonYears, setHorizonYears] = useState("20");
  const [reviewNote, setReviewNote] = useState("");
  const [scenario, setScenario] = useState<RetirementScenarioResult | null>(null);
  const [scenarios, setScenarios] = useState<RetirementScenarioResult[]>([]);
  const [leftScenarioId, setLeftScenarioId] = useState("");
  const [rightScenarioId, setRightScenarioId] = useState("");
  const [comparison, setComparison] = useState<RetirementScenarioComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveAssumptions() {
    setError(null);
    await window.purrifer.retirementBaseline.saveRetirementAssumptions({
      entityId,
      monthlyIncome: Number(monthlyIncome),
      monthlyWithdrawal: Number(monthlyWithdrawal),
      annualReturnRate: Number(annualReturnRate),
      annualInterestRate: Number(annualInterestRate),
      horizonYears: Number(horizonYears)
    });
  }

  async function refreshScenarios() {
    const list = await window.purrifer.retirementBaseline.listRetirementScenarios(entityId);
    setScenarios(list);
    if (!leftScenarioId && list[0]) setLeftScenarioId(list[0].scenarioId);
    if (!rightScenarioId && list[1]) setRightScenarioId(list[1].scenarioId);
  }

  async function runScenario() {
    setError(null);
    try {
      await saveAssumptions();
      const next = await window.purrifer.retirementBaseline.getRetirementScenario(entityId);
      setScenario(next);
      await refreshScenarios();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte köra pensionsscenario.");
    }
  }

  async function approveScenario() {
    if (!scenario) return;
    setError(null);
    try {
      const approved = await window.purrifer.retirementBaseline.approveRetirementScenario({
        scenarioId: scenario.scenarioId,
        reviewNote
      });
      setScenario(approved);
      await refreshScenarios();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte godkänna scenario.");
    }
  }

  async function compareScenarios() {
    setError(null);
    setComparison(null);
    try {
      const result = await window.purrifer.retirementBaseline.compareRetirementScenarios(entityId, leftScenarioId, rightScenarioId);
      setComparison(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte jämföra scenarier.");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Retirement Baseline"
        title="Pensionskalkyl baslinje + what-if"
        description="Skapa scenarier med varierad inkomst, uttag, avkastning och ränta."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Antaganden">
        <FieldGrid>
          <Field label="Entitet (entityId)"><input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" /></Field>
          <Field label="Månadsinkomst"><input value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} /></Field>
          <Field label="Månadsuttag"><input value={monthlyWithdrawal} onChange={(event) => setMonthlyWithdrawal(event.target.value)} /></Field>
          <Field label="Årlig avkastning (%)"><input value={annualReturnRate} onChange={(event) => setAnnualReturnRate(event.target.value)} /></Field>
          <Field label="Årlig ränta (%)"><input value={annualInterestRate} onChange={(event) => setAnnualInterestRate(event.target.value)} /></Field>
          <Field label="Horisont (år)"><input value={horizonYears} onChange={(event) => setHorizonYears(event.target.value)} /></Field>
        </FieldGrid>
        <Actions>
          <Button onClick={() => void runScenario()}>Spara och kör scenario</Button>
          <Button tone="secondary" onClick={() => void refreshScenarios()}>Läs scenariolista</Button>
        </Actions>
      </Panel>

      <SplitLayout>
        <Panel title="Scenarioresultat" status={<StatusPill>{scenario?.scenarioId ?? "-"}</StatusPill>}>
          {scenario ? (
            <Stack>
              <article className="ui-card"><h4>Basdata</h4><p className="ui-muted">Baskapital: {scenario.baseCapital.toFixed(2)}</p><p className="ui-muted">Netto/månad: {scenario.netMonthlyCashflow.toFixed(2)}</p><p>Prognostiserat kapital: {scenario.projectedCapital.toFixed(2)}</p></article>
              <article className="ui-card"><h4>Osäkerhet</h4>{scenario.uncertaintyFlags.length === 0 ? <small>Inga automatiska osäkerhetsflaggor.</small> : <small>{scenario.uncertaintyFlags.join(" | ")}</small>}<p className="ui-muted">{scenario.interpretationNote}</p></article>
              <article className="ui-card"><h4>HITL-godkännande</h4><p className="ui-muted">Status: {scenario.hitlApproved ? `Godkänd ${scenario.hitlApprovedAt}` : "Ej godkänd"}</p><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Skriv manuell granskningsnotering..." /><Actions><Button tone="secondary" onClick={() => void approveScenario()}>Godkänn scenario (HITL)</Button></Actions></article>
            </Stack>
          ) : (
            <EmptyState>Inget scenario har körts ännu.</EmptyState>
          )}
        </Panel>

        <Panel title="What-if jämförelse" status={<StatusPill>{scenarios.length}</StatusPill>}>
          <FieldGrid>
            <Field label="Vänster scenario"><select value={leftScenarioId} onChange={(event) => setLeftScenarioId(event.target.value)}><option value="">Välj scenario</option>{scenarios.map((item) => <option key={`left-${item.scenarioId}`} value={item.scenarioId}>{item.scenarioId}</option>)}</select></Field>
            <Field label="Höger scenario"><select value={rightScenarioId} onChange={(event) => setRightScenarioId(event.target.value)}><option value="">Välj scenario</option>{scenarios.map((item) => <option key={`right-${item.scenarioId}`} value={item.scenarioId}>{item.scenarioId}</option>)}</select></Field>
          </FieldGrid>
          <Actions>
            <Button tone="secondary" onClick={() => void compareScenarios()}>Jämför scenarier</Button>
          </Actions>
          {comparison ? (
            <Stack>
              <article className="ui-card"><h4>Skillnader</h4><p className="ui-muted">Prognoskapital delta: {comparison.projectedCapitalDelta.toFixed(2)}</p><p className="ui-muted">Netto/månad delta: {comparison.netMonthlyCashflowDelta.toFixed(2)}</p><small>{comparison.summary}</small></article>
              <article className="ui-card"><h4>Antagandedelta</h4><small>inkomst {comparison.assumptionsDelta.monthlyIncomeDelta.toFixed(2)} | uttag {comparison.assumptionsDelta.monthlyWithdrawalDelta.toFixed(2)} | avkastning {comparison.assumptionsDelta.annualReturnRateDelta.toFixed(2)} | ränta {comparison.assumptionsDelta.annualInterestRateDelta.toFixed(2)} | horisont {comparison.assumptionsDelta.horizonYearsDelta}</small><p className="ui-muted">HITL-granskning krävs: {comparison.hitlReviewRequired ? "Ja" : "Nej"}</p></article>
            </Stack>
          ) : (
            <EmptyState>Välj minst två scenarier för jämförelse.</EmptyState>
          )}
        </Panel>
      </SplitLayout>
    </Page>
  );
}

