import { useState } from "react";
import type { RetirementScenarioComparison, RetirementScenarioResult } from "../contracts";

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
      setError(reason instanceof Error ? reason.message : "Kunde inte kora pensionsscenario.");
    }
  }

  async function approveScenario() {
    if (!scenario) {
      return;
    }
    setError(null);
    try {
      const approved = await window.purrifer.retirementBaseline.approveRetirementScenario({
        scenarioId: scenario.scenarioId,
        reviewNote
      });
      setScenario(approved);
      await refreshScenarios();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte godkanna scenario.");
    }
  }

  async function compareScenarios() {
    setError(null);
    setComparison(null);
    try {
      const result = await window.purrifer.retirementBaseline.compareRetirementScenarios(
        entityId,
        leftScenarioId,
        rightScenarioId
      );
      setComparison(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte jamfora scenarier.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Retirement Baseline</p>
          <h2>Pensionskalkyl Baslinje + What-if (HITL)</h2>
          <p className="muted">Skapa scenarier med varierad inkomst, uttag, avkastning och ranta.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card">
        <h3>Antaganden</h3>
        <div className="detail-grid">
          <div>
            <p className="detail-label">Entitet (entityId)</p>
            <input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="E000001" />
          </div>
          <div>
            <p className="detail-label">Manadsinkomst</p>
            <input value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Manadsuttag</p>
            <input value={monthlyWithdrawal} onChange={(event) => setMonthlyWithdrawal(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Arlig avkastning (%)</p>
            <input value={annualReturnRate} onChange={(event) => setAnnualReturnRate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Arlig ranta (%)</p>
            <input value={annualInterestRate} onChange={(event) => setAnnualInterestRate(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Horisont (ar)</p>
            <input value={horizonYears} onChange={(event) => setHorizonYears(event.target.value)} />
          </div>
          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={() => void runScenario()}>
              Spara och kor scenario
            </button>
            <button className="secondary-button" type="button" onClick={() => void refreshScenarios()}>
              Lasa scenariolista
            </button>
          </div>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Scenarioresultat</h3>
            <span className="status-pill neutral">{scenario?.scenarioId ?? "-"}</span>
          </div>
          {scenario ? (
            <div className="stacked-list">
              <article className="list-card">
                <h4>Basdata</h4>
                <p className="muted">Baskapital: {scenario.baseCapital.toFixed(2)}</p>
                <p className="muted">Netto/manad: {scenario.netMonthlyCashflow.toFixed(2)}</p>
                <p>Prognostiserat kapital: {scenario.projectedCapital.toFixed(2)}</p>
              </article>
              <article className="list-card">
                <h4>Osakerhet</h4>
                {scenario.uncertaintyFlags.length === 0 ? (
                  <small>Inga automatiska osakerhetsflaggor.</small>
                ) : (
                  <small>{scenario.uncertaintyFlags.join(" | ")}</small>
                )}
                <p className="muted">{scenario.interpretationNote}</p>
              </article>
              <article className="list-card">
                <h4>HITL-godkannande</h4>
                <p className="muted">
                  Status: {scenario.hitlApproved ? `Godkand ${scenario.hitlApprovedAt}` : "Ej godkand"}
                </p>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Skriv manuell granskningsnotering..."
                />
                <div className="detail-actions">
                  <button className="secondary-button" type="button" onClick={() => void approveScenario()}>
                    Godkann scenario (HITL)
                  </button>
                </div>
              </article>
            </div>
          ) : (
            <p className="muted">Inget scenario har korts annu.</p>
          )}
        </article>

        <article className="panel-card">
          <div className="panel-topline">
            <h3>What-if jamforelse</h3>
            <span className="status-pill neutral">{scenarios.length}</span>
          </div>
          <div className="detail-grid">
            <div>
              <p className="detail-label">Vanster scenario</p>
              <select value={leftScenarioId} onChange={(event) => setLeftScenarioId(event.target.value)}>
                <option value="">Valj scenario</option>
                {scenarios.map((item) => (
                  <option key={`left-${item.scenarioId}`} value={item.scenarioId}>{item.scenarioId}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="detail-label">Hoger scenario</p>
              <select value={rightScenarioId} onChange={(event) => setRightScenarioId(event.target.value)}>
                <option value="">Valj scenario</option>
                {scenarios.map((item) => (
                  <option key={`right-${item.scenarioId}`} value={item.scenarioId}>{item.scenarioId}</option>
                ))}
              </select>
            </div>
            <div className="detail-actions">
              <button className="secondary-button" type="button" onClick={() => void compareScenarios()}>
                Jamfor scenarier
              </button>
            </div>
          </div>
          {comparison ? (
            <div className="stacked-list">
              <article className="list-card">
                <h4>Skillnader</h4>
                <p className="muted">Prognoskapital delta: {comparison.projectedCapitalDelta.toFixed(2)}</p>
                <p className="muted">Netto/manad delta: {comparison.netMonthlyCashflowDelta.toFixed(2)}</p>
                <small>{comparison.summary}</small>
              </article>
              <article className="list-card">
                <h4>Antagandedelta</h4>
                <small>
                  inkomst {comparison.assumptionsDelta.monthlyIncomeDelta.toFixed(2)} | uttag {comparison.assumptionsDelta.monthlyWithdrawalDelta.toFixed(2)} | avkastning {comparison.assumptionsDelta.annualReturnRateDelta.toFixed(2)} | ranta {comparison.assumptionsDelta.annualInterestRateDelta.toFixed(2)} | horisont {comparison.assumptionsDelta.horizonYearsDelta}
                </small>
                <p className="muted">HITL-granskning kravs: {comparison.hitlReviewRequired ? "Ja" : "Nej"}</p>
              </article>
            </div>
          ) : (
            <p className="muted">Valj minst tva scenarier for jamforelse.</p>
          )}
        </article>
      </section>
    </section>
  );
}
