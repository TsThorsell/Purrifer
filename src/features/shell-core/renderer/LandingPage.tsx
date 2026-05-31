import { useEffect, useMemo, useState } from "react";
import type { AppRouteKey } from "@app/registry/routes";
import type { DeviationCaseSummary } from "@features/obligations-and-cases/contracts";

interface LandingPageProps {
  onNavigate: (route: AppRouteKey) => void;
  onDrilldownDeviation: (item: DeviationCaseSummary) => void;
}

const panels = [
  {
    title: "Inkorg att granska",
    body: "Nytt material kommer in här och skickas sedan vidare till granskning och klassificering."
  },
  {
    title: "Försenat eller avvikande",
    body: "Denna panel blir platsen för sena betalningar, uteblivna händelser och avvikelseärenden."
  },
  {
    title: "Saknar verifikat eller matchning",
    body: "Visar poster som har pengar eller dokument men där beviskedjan inte är komplett."
  },
  {
    title: "Pågående jobb",
    body: "Bakgrundsjobb som import, OCR och backup ska synas tydligt utan att stoppa arbetet."
  },
  {
    title: "Kommande deadlines",
    body: "Här landar åtaganden, fakturor och uppföljning som snart kräver uppmärksamhet."
  },
  {
    title: "Översikt per entitet",
    body: "En framtida panel för snabb status per person, bolag, verksamhet och fastighet."
  }
];

function getDeviationPriority(item: DeviationCaseSummary): "high" | "medium" | "low" {
  if (item.rule === "overdue-unpaid") {
    return "high";
  }
  if (item.rule === "due-soon") {
    return "medium";
  }
  return "low";
}

function formatRuleLabel(rule: DeviationCaseSummary["rule"]): string {
  if (rule === "overdue-unpaid") {
    return "Betalning saknas efter förfallodatum";
  }
  if (rule === "due-soon") {
    return "Förfallodatum närmar sig";
  }
  return "Dokument inkom utan åtgärd";
}

export function LandingPage({ onNavigate, onDrilldownDeviation }: LandingPageProps) {
  const [deviations, setDeviations] = useState<DeviationCaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const purriferApi = (globalThis as { purrifer?: { obligationsAndCases?: { listDeviationCases?: () => Promise<DeviationCaseSummary[]> } } }).purrifer;
    const listDeviationCases = purriferApi?.obligationsAndCases?.listDeviationCases;
    if (!listDeviationCases) {
      setError("Preload API kunde inte laddas. Starta om appen med korrekt launcher.");
      return;
    }

    void listDeviationCases()
      .then((items) => {
        setDeviations(items);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa avvikelser.");
      });
  }, []);

  const deviationPanel = useMemo(() => {
    if (error) {
      return (
        <article className="panel-card">
          <h3>Försenat/Avvikande</h3>
          <p className="muted">{error}</p>
        </article>
      );
    }

    if (deviations.length === 0) {
      return (
        <article className="panel-card">
          <h3>Försenat/Avvikande</h3>
          <p>Inga aktiva avvikelser just nu.</p>
        </article>
      );
    }

    return (
      <article className="panel-card">
        <div className="panel-topline">
          <h3>Försenat/Avvikande</h3>
          <span className="status-pill neutral">{deviations.length}</span>
        </div>
        <div className="stacked-list">
          {deviations.slice(0, 6).map((item) => {
            const priority = getDeviationPriority(item);
            const sourceRef = item.obligationId ?? item.sourceId;
            return (
              <button
                key={item.caseId}
                className="list-card selectable"
                type="button"
                onClick={() => onDrilldownDeviation(item)}
              >
                <h4>{formatRuleLabel(item.rule)}</h4>
                <p className="muted">
                  prioritet: {priority} · källa: {item.sourceType} · id: {sourceRef}
                </p>
                <small>
                  case: {item.caseId} · status: {item.status}
                </small>
              </button>
            );
          })}
        </div>
      </article>
    );
  }, [deviations, error, onDrilldownDeviation]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Shell Core</p>
          <h2>Landningsyta</h2>
          <p className="muted">
            Det här är den operativa startsidan. Panelerna är fasta och slices dockar in i valda ytor över tid.
          </p>
        </div>

        <div className="header-actions">
          <button className="primary-button" type="button" onClick={() => onNavigate("document-inbox")}>
            Öppna inkorg
          </button>
          <button className="secondary-button" type="button" onClick={() => onNavigate("jobs")}>
            Visa jobb
          </button>
        </div>
      </header>

      <section className="hero-dropzone">
        <div>
          <p className="eyebrow">Drop/Paste-zon</p>
          <h3>Här ska nytt material kunna landa fritt</h3>
          <p className="muted">
            I shell-core är detta bara en reserverad yta. `document-inbox` dockar in den verkliga inkommande hanteringen.
          </p>
        </div>
      </section>

      <section className="panel-grid">
        {deviationPanel}
        {panels.map((panel) => (
          <article key={panel.title} className="panel-card">
            <h3>{panel.title}</h3>
            <p>{panel.body}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
