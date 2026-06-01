import { useEffect, useMemo, useState } from "react";
import type { AppRouteKey } from "@app/registry/routes";
import type { DeviationCaseSummary } from "@features/obligations-and-cases/contracts";
import { Button, EmptyState, Page, PageHeader, Panel, Stack, StatusPill } from "../../../renderer/components/Ui";

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
    body: "Sena betalningar, uteblivna händelser och avvikelseärenden samlas här."
  },
  {
    title: "Saknar verifikat eller matchning",
    body: "Poster med pengar eller dokument där beviskedjan fortfarande är ofullständig."
  },
  {
    title: "Pågående jobb",
    body: "Import, OCR och andra bakgrundsjobb ska vara synliga utan att skapa brus."
  },
  {
    title: "Kommande deadlines",
    body: "Åtaganden, fakturor och uppföljning som snart kräver uppmärksamhet."
  },
  {
    title: "Översikt per entitet",
    body: "Snabb status per person, bolag, verksamhet och fastighet."
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

function priorityTone(priority: "high" | "medium" | "low"): "danger" | "warning" | "neutral" {
  if (priority === "high") {
    return "danger";
  }
  if (priority === "medium") {
    return "warning";
  }
  return "neutral";
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
        <Panel title="Försenat eller avvikande">
          <p className="ui-muted">{error}</p>
        </Panel>
      );
    }

    if (deviations.length === 0) {
      return (
        <Panel title="Försenat eller avvikande">
          <EmptyState>Inga aktiva avvikelser just nu.</EmptyState>
        </Panel>
      );
    }

    return (
      <Panel
        title="Försenat eller avvikande"
        subtitle="Avvikelser som kräver beslut eller uppföljning."
        status={<StatusPill tone="warning">{deviations.length} öppna</StatusPill>}
      >
        <Stack>
          {deviations.slice(0, 6).map((item) => {
            const priority = getDeviationPriority(item);
            const sourceRef = item.obligationId ?? item.sourceId;
            return (
              <button
                key={item.caseId}
                className="ui-card selectable"
                type="button"
                onClick={() => onDrilldownDeviation(item)}
              >
                <div className="ui-card__header">
                  <div className="ui-card__title-block">
                    <h4>{formatRuleLabel(item.rule)}</h4>
                    <p className="ui-muted">
                      källa: {item.sourceType} · id: {sourceRef}
                    </p>
                  </div>
                  <StatusPill tone={priorityTone(priority)}>{priority}</StatusPill>
                </div>
                <small>
                  case: {item.caseId} · status: {item.status}
                </small>
              </button>
            );
          })}
        </Stack>
      </Panel>
    );
  }, [deviations, error, onDrilldownDeviation]);

  return (
    <Page>
      <PageHeader
        eyebrow="Shell Core"
        title="Landningsyta"
        description="Det här är den operativa startsidan. Fokus ligger på det som krävs nu, inte på intern arkitektur."
        actions={
          <>
            <Button tone="primary" onClick={() => onNavigate("document-inbox")}>
              Öppna inkorg
            </Button>
            <Button tone="secondary" onClick={() => onNavigate("jobs")}>
              Visa jobb
            </Button>
          </>
        }
      />

      <Panel
        className="ui-hero-dropzone"
        title="Inkommande material"
        subtitle="Här ska nytt material kunna landa fritt och direkt bli en del av arbetsflödet."
        status={<StatusPill tone="info">Drop eller klistra in</StatusPill>}
      />

      <section className="ui-panel-grid">
        {deviationPanel}
        {panels.map((panel) => (
          <Panel key={panel.title} title={panel.title}>
            <p>{panel.body}</p>
          </Panel>
        ))}
      </section>
    </Page>
  );
}


