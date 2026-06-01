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
  ownerEntityName: string;
  targetEntityName: string;
}

export interface OwnershipRelationInput {
  ownerEntityId: string;
  targetEntityId: string;
  sharePercent: number;
}

export interface CreateAccountInput {
  entityId: string;
  name: string;
}

export interface UpdateAccountInput {
  accountId: string;
  name: string;
}

export interface OwnershipFilter {
  ownerEntityId?: string;
  targetEntityId?: string;
}

export interface EntityUpdateInput {
  entityId: string;
  name?: string;
  type?: EntityType;
}

export interface UpdateOwnershipInput {
  relationId: string;
  sharePercent: number;
}

export interface EntityListFilter {
  type?: EntityType;
  query?: string;
}

export interface EntityDetails extends EntitySummary {
  accounts: AccountSummary[];
  ownerships: OwnershipRelation[];
}

export interface EntityRegistryApi {
  createEntity(name: string, type: EntityType): Promise<EntitySummary>;
  listEntities(filter?: EntityListFilter): Promise<EntitySummary[]>;
  getEntityDetails(entityId: string): Promise<EntityDetails>;
  updateEntity(input: EntityUpdateInput): Promise<EntitySummary>;
  deleteEntity(entityId: string): Promise<void>;
  createOwnershipRelation(
    ownerEntityId: string,
    targetEntityId: string,
    sharePercent: number
  ): Promise<OwnershipRelation>;
  updateOwnershipRelation(input: UpdateOwnershipInput): Promise<OwnershipRelation>;
  deleteOwnershipRelation(relationId: string): Promise<void>;
  createAccount(entityId: string, name: string): Promise<AccountSummary>;
  updateAccount(input: UpdateAccountInput): Promise<AccountSummary>;
  deleteAccount(accountId: string): Promise<void>;
  listAccounts(entityId: string): Promise<AccountSummary[]>;
  listOwnerships(filter?: OwnershipFilter): Promise<OwnershipRelation[]>;
}

export const entityRegistryChannels = {
  createEntity: "entity-registry:create-entity",
  listEntities: "entity-registry:list-entities",
  getEntityDetails: "entity-registry:get-entity-details",
  updateEntity: "entity-registry:update-entity",
  deleteEntity: "entity-registry:delete-entity",
  createOwnershipRelation: "entity-registry:create-ownership-relation",
  updateOwnershipRelation: "entity-registry:update-ownership-relation",
  deleteOwnershipRelation: "entity-registry:delete-ownership-relation",
  createAccount: "entity-registry:create-account",
  updateAccount: "entity-registry:update-account",
  deleteAccount: "entity-registry:delete-account",
  listAccounts: "entity-registry:list-accounts",
  listOwnerships: "entity-registry:list-ownerships"
} as const;
