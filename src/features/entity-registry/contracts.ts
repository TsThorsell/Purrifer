export type EntityType = "person" | "aktiebolag" | "enskild-naringsverksamhet" | "fastighet";

export interface EntitySummary {
  entityId: string;
  name: string;
  type: EntityType;
}

export interface AccountSummary {
  accountId: string;
  entityId: string;
  name: string;
}

export interface OwnershipRelation {
  relationId: string;
  ownerEntityId: string;
  targetEntityId: string;
  sharePercent: number;
}

export interface EntityDetails extends EntitySummary {
  accounts: AccountSummary[];
  ownerships: OwnershipRelation[];
}

export interface EntityRegistryApi {
  createEntity(name: string, type: EntityType): Promise<EntitySummary>;
  listEntities(): Promise<EntitySummary[]>;
  getEntityDetails(entityId: string): Promise<EntityDetails>;
  createOwnershipRelation(
    ownerEntityId: string,
    targetEntityId: string,
    sharePercent: number
  ): Promise<OwnershipRelation>;
  createAccount(entityId: string, name: string): Promise<AccountSummary>;
}

export const entityRegistryChannels = {
  createEntity: "entity-registry:create-entity",
  listEntities: "entity-registry:list-entities",
  getEntityDetails: "entity-registry:get-entity-details",
  createOwnershipRelation: "entity-registry:create-ownership-relation",
  createAccount: "entity-registry:create-account"
} as const;

