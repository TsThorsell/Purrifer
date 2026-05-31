import { useEffect, useState } from "react";
import type { EntityDetails, EntitySummary, EntityType } from "../contracts";

const entityTypes: EntityType[] = [
  "person",
  "aktiebolag",
  "enskild-naringsverksamhet",
  "fastighet"
];

export function EntityRegistryPage() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityDetails | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<EntityType>("person");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const list = await window.purrifer.entityRegistry.listEntities();
    setEntities(list);
    if (!selectedEntityId && list[0]) {
      setSelectedEntityId(list[0].entityId);
    }
  }

  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte lasa entiteter.")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEntityId) {
      setSelectedEntity(null);
      return;
    }
    void window.purrifer.entityRegistry
      .getEntityDetails(selectedEntityId)
      .then(setSelectedEntity)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte lasa entitetsdetaljer.")
      );
  }, [selectedEntityId]);

  async function createEntity() {
    setError(null);
    try {
      const created = await window.purrifer.entityRegistry.createEntity(name, type);
      setName("");
      setSelectedEntityId(created.entityId);
      await refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa entitet.");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Entity Registry</p>
          <h2>Entiteter, agande och konton</h2>
        </div>
      </header>
      {error ? <div className="error-banner">{error}</div> : null}
      <article className="panel-card">
        <div className="detail-grid">
          <div>
            <p className="detail-label">Namn</p>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <p className="detail-label">Typ</p>
            <select value={type} onChange={(event) => setType(event.target.value as EntityType)}>
              {entityTypes.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={() => void createEntity()}>
              Skapa entitet
            </button>
          </div>
        </div>
      </article>
      <section className="split-layout">
        <article className="panel-card">
          <div className="panel-topline">
            <h3>Entiteter</h3>
            <span className="status-pill neutral">{entities.length}</span>
          </div>
          <div className="stacked-list">
            {entities.map((entity) => (
              <button
                key={entity.entityId}
                className={entity.entityId === selectedEntityId ? "list-card selectable selected" : "list-card selectable"}
                type="button"
                onClick={() => setSelectedEntityId(entity.entityId)}
              >
                <h4>{entity.name}</h4>
                <p className="muted">
                  {entity.entityId} · {entity.type}
                </p>
              </button>
            ))}
          </div>
        </article>
        <article className="panel-card">
          <h3>Detaljer</h3>
          {!selectedEntity ? (
            <div className="empty-state">
              <p>Valj en entitet.</p>
            </div>
          ) : (
            <div className="detail-grid">
              <div>
                <p className="detail-label">Namn</p>
                <p>{selectedEntity.name}</p>
              </div>
              <div>
                <p className="detail-label">Typ</p>
                <p>{selectedEntity.type}</p>
              </div>
              <div className="detail-span">
                <p className="detail-label">Konton</p>
                <p>{selectedEntity.accounts.length}</p>
              </div>
              <div className="detail-span">
                <p className="detail-label">Aganderelationer</p>
                <p>{selectedEntity.ownerships.length}</p>
              </div>
            </div>
          )}
        </article>
      </section>
    </section>
  );
}

