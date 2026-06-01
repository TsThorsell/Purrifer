import { useEffect, useMemo, useState } from "react";
import type {
  SearchIndexQualityReport,
  SearchNavigationTarget,
  SearchObjectType,
  SearchResultItem
} from "../contracts";
import { Actions, Button, EmptyState, Field, FieldGrid, Page, PageHeader, Panel, Stack, StatusPill } from "../../../renderer/components/Ui";

interface SearchAndIndexPageProps {
  onOpenTarget: (target: SearchNavigationTarget) => void;
}

const orderedTypes: SearchObjectType[] = [
  "document",
  "voucher",
  "supplier-invoice",
  "payment-event",
  "obligation",
  "case"
];

const typeLabels: Record<SearchObjectType, string> = {
  document: "Dokument",
  voucher: "Verifikat",
  "supplier-invoice": "Leverantörsfaktura",
  "payment-event": "Betalhändelse",
  obligation: "Åtagande",
  case: "Ärende"
};

export function SearchAndIndexPage({ onOpenTarget }: SearchAndIndexPageProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [objectTypeFilter, setObjectTypeFilter] = useState<"all" | SearchObjectType>("all");
  const [sortMode, setSortMode] = useState<"relevance" | "date">("relevance");
  const [qualityReport, setQualityReport] = useState<SearchIndexQualityReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const indexedAt = qualityReport?.indexedAt ?? null;

  useEffect(() => {
    void loadQualityReport();
  }, []);

  async function runSearch() {
    setError(null);
    setStatusMessage(null);
    try {
      const items = await window.purrifer.searchAndIndex.searchAll(query);
      setResults(items);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte köra sökning.");
    }
  }

  async function loadQualityReport() {
    try {
      const report = await window.purrifer.searchAndIndex.getIndexQualityReport();
      setQualityReport(report);
    } catch (reason: unknown) {
      console.warn("[search] kunde inte läsa indexkvalitetsrapport:", reason);
    }
  }

  async function rebuildIndex() {
    const okay = confirm("Vill du bygga om hela search-indexet nu?");
    if (!okay) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsRebuilding(true);
    try {
      const result = await window.purrifer.searchAndIndex.rebuildSearchIndex();
      const status = result.quality
        ? `Index byggt: ${result.indexedCount} poster (${result.indexedAt}) · ${result.quality.totalIndexedItems} indexerade totalt.`
        : `Index byggt: ${result.indexedCount} poster (${result.indexedAt}).`;
      setStatusMessage(status);
      setQualityReport(result.quality ?? null);
      await runSearch();
      await loadQualityReport();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte bygga om index.");
    } finally {
      setIsRebuilding(false);
    }
  }

  const objectTypeQualitySummary = qualityReport
    ? Object.entries(qualityReport.countsByObjectType)
    : [];

  const visibleResults = useMemo(() => {
    const filtered =
      objectTypeFilter === "all"
        ? results
        : results.filter((item) => item.objectType === objectTypeFilter);

    const sorted = [...filtered];

    if (sortMode === "date") {
      sorted.sort((left, right) => {
        const leftDate = left.sortDate ?? "";
        const rightDate = right.sortDate ?? "";
        if (leftDate && rightDate) {
          return rightDate.localeCompare(leftDate);
        }
        if (leftDate) {
          return -1;
        }
        if (rightDate) {
          return 1;
        }
        return left.title.localeCompare(right.title, "sv");
      });
    }

    return sorted;
  }, [objectTypeFilter, results, sortMode]);

  const groupedResults = useMemo(() => {
    const groups = orderedTypes.map((objectType) => ({
      objectType,
      label: typeLabels[objectType],
      items: visibleResults.filter((item) => item.objectType === objectType)
    }));
    return groups.filter((group) => group.items.length > 0);
  }, [visibleResults]);

  return (
    <Page>
      <PageHeader
        eyebrow="Search and Index"
        title="Mastersearch"
        description="Sök över dokument, verifikat, fakturor, betalningar, åtaganden och ärenden."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}
      {statusMessage ? <div className="ui-success-banner">{statusMessage}</div> : null}

      <Panel title="Sökning">
        <FieldGrid>
          <Field label="Sökfras" className="ui-field-span">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sök på namn, id eller status"
            />
          </Field>
          <Field label="Filter objekttyp">
            <select
              value={objectTypeFilter}
              onChange={(event) => setObjectTypeFilter(event.target.value as "all" | SearchObjectType)}
            >
              <option value="all">Alla</option>
              {orderedTypes.map((entry) => (
                <option key={entry} value={entry}>
                  {typeLabels[entry]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sortering">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as "relevance" | "date")}
            >
              <option value="relevance">Relevans</option>
              <option value="date">Datum</option>
            </select>
          </Field>
        </FieldGrid>
        <Actions>
          <Button onClick={() => void runSearch()}>Sök</Button>
          <Button
            tone="secondary"
            onClick={() => void rebuildIndex()}
            disabled={isRebuilding}
          >
            {isRebuilding ? "Bygger om..." : "Bygg om index"}
          </Button>
        </Actions>
      </Panel>

      <Panel title="Indexkvalitet" status={<StatusPill>{qualityReport?.totalIndexedItems ?? 0}</StatusPill>}>
        <p className="ui-muted">Senast indexerat: {indexedAt ?? "aldrig"}</p>
        {objectTypeQualitySummary.length > 0 ? (
          <ul>
            {objectTypeQualitySummary.map(([objectType, count]) => (
              <li key={objectType}>
                {objectType}: {count}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ui-muted">Ingen indexdata tillgänglig ännu.</p>
        )}
      </Panel>

      <Panel title="Träffar" status={<StatusPill>{visibleResults.length}</StatusPill>}>
        {groupedResults.length > 0 ? (
          <Stack>
            {groupedResults.map((group) => (
              <Panel
                key={group.objectType}
                title={group.label}
                status={<StatusPill>{group.items.length}</StatusPill>}
              >
                <Stack>
                  {group.items.map((item) => (
                    <button
                      key={`${item.objectType}-${item.objectId}`}
                      className="ui-card selectable"
                      type="button"
                      onClick={() =>
                        onOpenTarget({
                          route: item.targetRoute,
                          objectType: item.objectType,
                          objectId: item.objectId,
                          title: item.title,
                          summary: item.summary
                        })
                      }
                    >
                      <h4>{item.title}</h4>
                      <p className="ui-muted">{typeLabels[item.objectType]} · {item.objectId}</p>
                      <p>{item.summary}</p>
                      {item.sortDate ? <small>datum: {item.sortDate}</small> : null}
                    </button>
                  ))}
                </Stack>
              </Panel>
            ))}
          </Stack>
        ) : (
          <EmptyState>Inga träffar. Prova en annan sökfras eller bygg om index.</EmptyState>
        )}
      </Panel>
    </Page>
  );
}
