import { useEffect, useState } from "react";
import {
  Button,
  Actions,
  EmptyState,
  Field,
  FieldGrid,
  Page,
  PageHeader,
  Panel,
  SplitLayout,
  Stack,
  StatusPill
} from "../../../renderer/components/Ui";
import type {
  EntityDetails,
  EntityListFilter,
  EntitySummary,
  EntityType,
  EntityUpdateInput,
  UpdateAccountInput,
  UpdateOwnershipInput
} from "../contracts";

const entityTypes: EntityType[] = ["person", "aktiebolag", "enskild-naringsverksamhet", "fastighet"];
const entityTypeFilterOptions: Array<EntityType | ""> = ["", ...entityTypes];

export function EntityRegistryPage() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<EntityDetails | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | EntityType>("");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<EntityType>("person");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<EntityType>("person");
  const [accountName, setAccountName] = useState("");
  const [accountRenameId, setAccountRenameId] = useState("");
  const [accountRenameValue, setAccountRenameValue] = useState("");
  const [relationOwnerEntityId, setRelationOwnerEntityId] = useState("");
  const [relationTargetEntityId, setRelationTargetEntityId] = useState("");
  const [relationSharePercent, setRelationSharePercent] = useState("0");
  const [relationToUpdate, setRelationToUpdate] = useState<UpdateOwnershipInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(preferredId?: string | null) {
    const filter: EntityListFilter = {
      type: typeFilter || undefined,
      query: nameFilter.trim() || undefined
    };
    const list = await window.purrifer.entityRegistry.listEntities(filter);
    setEntities(list);

    const nextSelectedId = preferredId ?? selectedEntityId ?? list[0]?.entityId ?? null;
    setSelectedEntityId(nextSelectedId);
    if (!nextSelectedId) {
      setSelectedEntity(null);
      setEditName("");
      setEditType("person");
    }
  }

  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "Kunde inte läsa entiteter.")
    );
  }, [nameFilter, typeFilter]);

  useEffect(() => {
    if (!selectedEntityId) {
      setSelectedEntity(null);
      return;
    }

    void window.purrifer.entityRegistry
      .getEntityDetails(selectedEntityId)
      .then((item) => {
        setSelectedEntity(item);
        setEditName(item.name);
        setEditType(item.type);
        setRelationOwnerEntityId(item.entityId);
        setRelationTargetEntityId("");
        setRelationSharePercent("0");
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Kunde inte läsa entitetsdetaljer.")
      );
  }, [selectedEntityId]);

  async function createEntity() {
    setError(null);
    try {
      const created = await window.purrifer.entityRegistry.createEntity(createName, createType);
      setCreateName("");
      setCreateType("person");
      await refresh(created.entityId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa entitet.");
    }
  }

  async function updateEntity() {
    if (!selectedEntityId) {
      setError("Välj en entitet innan uppdatering.");
      return;
    }

    const payload: EntityUpdateInput = { entityId: selectedEntityId };
    if (editName.trim()) {
      payload.name = editName.trim();
    }
    if (editType) {
      payload.type = editType;
    }

    if (!payload.name && !payload.type) {
      setError("Välj namn eller typ att uppdatera.");
      return;
    }

    setError(null);
    try {
      const updated = await window.purrifer.entityRegistry.updateEntity(payload);
      await refresh(updated.entityId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera entitet.");
    }
  }

  async function deleteEntity() {
    if (!selectedEntityId) {
      return;
    }

    setError(null);
    try {
      await window.purrifer.entityRegistry.deleteEntity(selectedEntityId);
      setSelectedEntityId(null);
      await refresh(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte ta bort entitet.");
    }
  }

  async function createAccount() {
    if (!selectedEntityId) {
      setError("Välj entitet innan konto skapas.");
      return;
    }
    if (!accountName.trim()) {
      setError("Ange kontonamn.");
      return;
    }

    setError(null);
    try {
      await window.purrifer.entityRegistry.createAccount(selectedEntityId, accountName.trim());
      setAccountName("");
      await refresh(selectedEntityId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa konto.");
    }
  }

  async function updateAccount() {
    if (!selectedEntity || !accountRenameId || !accountRenameValue.trim()) {
      return;
    }

    const payload: UpdateAccountInput = { accountId: accountRenameId, name: accountRenameValue.trim() };
    setError(null);
    try {
      await window.purrifer.entityRegistry.updateAccount(payload);
      setAccountRenameId("");
      setAccountRenameValue("");
      await refresh(selectedEntity.entityId);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera konto.");
    }
  }

  async function deleteAccount(accountId: string) {
    setError(null);
    try {
      await window.purrifer.entityRegistry.deleteAccount(accountId);
      setAccountRenameId("");
      setAccountRenameValue("");
      await refresh(selectedEntity?.entityId ?? null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte ta bort konto.");
    }
  }

  async function createRelation() {
    setError(null);
    try {
      await window.purrifer.entityRegistry.createOwnershipRelation(
        relationOwnerEntityId,
        relationTargetEntityId,
        Number(relationSharePercent)
      );
      setRelationOwnerEntityId(selectedEntity?.entityId ?? "");
      setRelationTargetEntityId("");
      setRelationSharePercent("0");
      await refresh(selectedEntity?.entityId ?? null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte skapa relation.");
    }
  }

  async function saveRelation() {
    if (!relationToUpdate) {
      return;
    }
    setError(null);
    try {
      const payload: UpdateOwnershipInput = {
        relationId: relationToUpdate.relationId,
        sharePercent: Number(relationToUpdate.sharePercent)
      };
      await window.purrifer.entityRegistry.updateOwnershipRelation(payload);
      setRelationToUpdate(null);
      await refresh(selectedEntity?.entityId ?? null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte uppdatera relation.");
    }
  }

  async function deleteRelation(relationId: string) {
    setError(null);
    try {
      await window.purrifer.entityRegistry.deleteOwnershipRelation(relationId);
      await refresh(selectedEntity?.entityId ?? null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Kunde inte ta bort relation.");
    }
  }

  function formatTypeLabel(type: EntityType): string {
    if (type === "enskild-naringsverksamhet") {
      return "enskild näringsverksamhet";
    }
    return type;
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Entity Registry"
        title="Entiteter, ägande och konton"
        description="Modulär entitetskatalog med filtrering, relationer och validerad validering."
      />

      {error ? <div className="ui-error-banner">{error}</div> : null}

      <Panel title="Ny entitet">
        <FieldGrid>
          <Field label="Filter: Namn">
            <input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="Sök namn" />
          </Field>
          <Field label="Filter: Typ">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "" | EntityType)}>
              {entityTypeFilterOptions.map((itemType) => (
                <option key={itemType || "all"} value={itemType || ""}>
                  {itemType ? formatTypeLabel(itemType) : "Alla"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Skapa namn">
            <input value={createName} onChange={(event) => setCreateName(event.target.value)} />
          </Field>
          <Field label="Skapa typ">
            <select value={createType} onChange={(event) => setCreateType(event.target.value as EntityType)}>
              {entityTypes.map((entry) => (
                <option key={entry} value={entry}>
                  {formatTypeLabel(entry)}
                </option>
              ))}
            </select>
          </Field>
        </FieldGrid>
        <Button onClick={() => void createEntity()}>Skapa entitet</Button>
      </Panel>

      <SplitLayout>
        <Panel title="Entitetslista" status={<StatusPill>{entities.length}</StatusPill>}>
          <Stack>
            {entities.map((entity) => (
              <button
                key={entity.entityId}
                className={entity.entityId === selectedEntityId ? "ui-card selectable selected" : "ui-card selectable"}
                type="button"
                onClick={() => setSelectedEntityId(entity.entityId)}
              >
                <h4>{entity.name}</h4>
                <p className="ui-muted">{entity.entityId} · {entity.type}</p>
              </button>
            ))}
            {entities.length === 0 ? <EmptyState>Inga entiteter matchar filter.</EmptyState> : null}
          </Stack>
        </Panel>

        <Panel
          title="Detaljer"
          status={<StatusPill>{selectedEntity?.entityId ?? "-"}</StatusPill>}
          actions={
            <Button tone="danger" onClick={() => void deleteEntity()} disabled={!selectedEntityId}>
              Ta bort vald
            </Button>
          }
        >
          {!selectedEntity ? (
            <EmptyState>Välj en entitet.</EmptyState>
          ) : (
            <FieldGrid>
              <Field label="Namn">
                <input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </Field>
              <Field label="Typ">
                <select value={editType} onChange={(event) => setEditType(event.target.value as EntityType)}>
                  {entityTypes.map((entry) => (
                    <option key={entry} value={entry}>
                      {formatTypeLabel(entry)}
                    </option>
                  ))}
                </select>
              </Field>
              <Button tone="secondary" onClick={() => void updateEntity()}>
                Spara entitetsändringar
              </Button>
            </FieldGrid>
          )}
        </Panel>
      </SplitLayout>

      <SplitLayout>
        <Panel title="Konton" status={<StatusPill>{selectedEntity?.accounts.length ?? 0}</StatusPill>}>
          {selectedEntity ? (
            <Stack>
              {selectedEntity.accounts.map((account) => {
                const isEditing = accountRenameId === account.accountId;
                return (
                  <article key={account.accountId} className="ui-card">
                    <h4>{account.name}</h4>
                    <p className="ui-muted">{account.accountId}</p>
                    <FieldGrid>
                      {isEditing ? (
                        <>
                          <Field label="Nytt namn">
                            <input
                              value={accountRenameValue}
                              onChange={(event) => setAccountRenameValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  void updateAccount();
                                }
                              }}
                            />
                          </Field>
                          <Actions>
                            <Button tone="secondary" onClick={() => void updateAccount()}>
                              Spara
                            </Button>
                            <Button
                              tone="secondary"
                              onClick={() => {
                                setAccountRenameId("");
                                setAccountRenameValue("");
                              }}
                            >
                              Avbryt
                            </Button>
                          </Actions>
                        </>
                      ) : (
                          <Actions>
                            <Button
                              tone="secondary"
                              onClick={() => {
                                setAccountRenameId(account.accountId);
                                setAccountRenameValue(account.name);
                            }}
                            >
                              Byt namn
                            </Button>
                            <Button tone="danger" onClick={() => void deleteAccount(account.accountId)}>
                              Ta bort
                            </Button>
                          </Actions>
                      )}
                    </FieldGrid>
                  </article>
                );
              })}
              {selectedEntity.accounts.length === 0 ? <EmptyState>Inga konton för entiteten.</EmptyState> : null}
              <FieldGrid>
                <Field label="Skapa konto">
                  <input value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                </Field>
                <Button onClick={() => void createAccount()}>Lägg till konto</Button>
              </FieldGrid>
            </Stack>
          ) : (
            <EmptyState>Välj en entitet för att hantera konton.</EmptyState>
          )}
        </Panel>

        <Panel title="Äganderelationer" status={<StatusPill>{selectedEntity?.ownerships.length ?? 0}</StatusPill>}>
          <FieldGrid>
            <Field label="Ägare">
              <input
                value={relationOwnerEntityId}
                onChange={(event) => setRelationOwnerEntityId(event.target.value)}
                placeholder="Owner entityId"
              />
            </Field>
            <Field label="Mål">
              <input
                value={relationTargetEntityId}
                onChange={(event) => setRelationTargetEntityId(event.target.value)}
                placeholder="Target entityId"
              />
            </Field>
            <Field label="Andel %">
              <input value={relationSharePercent} onChange={(event) => setRelationSharePercent(event.target.value)} />
            </Field>
          </FieldGrid>
          <Button onClick={() => void createRelation()} disabled={!relationOwnerEntityId || !relationTargetEntityId}>
            Skapa relation
          </Button>

          <Panel title="Relationer">
            <Stack>
              {(selectedEntity?.ownerships ?? []).map((relation) => (
                <article key={relation.relationId} className="ui-card">
                  <h4>
                    {relation.ownerEntityName} → {relation.targetEntityName}
                  </h4>
                  <p className="ui-muted">
                    {relation.relationId} · {relation.ownerEntityId} → {relation.targetEntityId}
                  </p>
                  <p>
                    {isNaN(relation.sharePercent) ? 0 : relation.sharePercent} %
                  </p>
                  {relationToUpdate?.relationId === relation.relationId ? (
                    <FieldGrid>
                      <Field label="Ny andel %">
                        <input
                          value={relationToUpdate.sharePercent}
                          onChange={(event) =>
                            setRelationToUpdate({ ...relationToUpdate, sharePercent: Number(event.target.value) })
                          }
                        />
                      </Field>
                      <Actions>
                        <Button onClick={() => void saveRelation()}>Spara</Button>
                        <Button tone="secondary" onClick={() => setRelationToUpdate(null)}>
                          Avbryt
                        </Button>
                      </Actions>
                    </FieldGrid>
                  ) : (
                    <Actions>
                      <Button
                        tone="secondary"
                        onClick={() =>
                          setRelationToUpdate({
                            relationId: relation.relationId,
                            sharePercent: relation.sharePercent
                          })
                        }
                      >
                        Redigera andel
                      </Button>
                      <Button tone="secondary" onClick={() => void deleteRelation(relation.relationId)}>
                        Ta bort
                      </Button>
                    </Actions>
                  )}
                </article>
              ))}
              {(selectedEntity?.ownerships ?? []).length === 0 ? (
                <EmptyState>Ingen äganderelation registrerad för vald entitet.</EmptyState>
              ) : null}
            </Stack>
          </Panel>
        </Panel>
      </SplitLayout>
    </Page>
  );
}
