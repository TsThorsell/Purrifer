import { useMemo, useState } from "react";
import type { SearchNavigationTarget, SearchObjectType, SearchResultItem } from "../contracts";

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
  "supplier-invoice": "Leverantorsfaktura",
  "payment-event": "Betalhandelse",
  obligation: "Atagande",
  case: "Arende"
};

export function SearchAndIndexPage({ onOpenTarget }: SearchAndIndexPageProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [objectTypeFilter, setObjectTypeFilter] = useState<"all" | SearchObjectType>("all");
  const [sortMode, setSortMode] = useState<"relevance" | "date">("relevance");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setError(null);
    setStatusMessage(null);
    try {
      const items = await window.purrifer.searchAndIndex.searchAll(query);
      setResults(items);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte kora sokning.");
    }
  }

  async function rebuildIndex() {
    setError(null);
    setStatusMessage(null);
    try {
      const result = await window.purrifer.searchAndIndex.rebuildSearchIndex();
      setStatusMessage(`Index byggt: ${result.indexedCount} poster (${result.indexedAt}).`);
      await runSearch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte bygga om index.");
    }
  }

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
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Search and Index</p>
          <h2>Mastersearch</h2>
          <p className="muted">Sok over dokument, verifikat, fakturor, betalningar, ataganden och arenden.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {statusMessage ? <div className="status-pill neutral">{statusMessage}</div> : null}

      <section className="panel-card">
        <div className="detail-grid">
          <div className="detail-span">
            <p className="detail-label">Sokfras</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sok pa namn, id eller status"
            />
          </div>
          <div>
            <p className="detail-label">Filter objekttyp</p>
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
          </div>
          <div>
            <p className="detail-label">Sortering</p>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as "relevance" | "date")}>
              <option value="relevance">Relevans</option>
              <option value="date">Datum</option>
            </select>
          </div>
          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={() => void runSearch()}>
              Sok
            </button>
            <button className="secondary-button" type="button" onClick={() => void rebuildIndex()}>
              Bygg om index
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-topline">
          <h3>Traffar</h3>
          <span className="status-pill neutral">{visibleResults.length}</span>
        </div>
        <div className="stacked-list">
          {groupedResults.map((group) => (
            <article key={group.objectType} className="panel-card">
              <div className="panel-topline">
                <h4>{group.label}</h4>
                <span className="status-pill neutral">{group.items.length}</span>
              </div>
              <div className="stacked-list">
                {group.items.map((item) => (
                  <button
                    key={`${item.objectType}-${item.objectId}`}
                    className="list-card selectable"
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
                    <p className="muted">
                      {typeLabels[item.objectType]} · {item.objectId}
                    </p>
                    <p>{item.summary}</p>
                    {item.sortDate ? <small>datum: {item.sortDate}</small> : null}
                  </button>
                ))}
              </div>
            </article>
          ))}
          {visibleResults.length === 0 ? (
            <p className="muted">Inga traffar. Prova en annan sokfras eller bygg om index.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
