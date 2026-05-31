import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  AccountSummary,
  EntityDetails,
  EntitySummary,
  EntityType,
  OwnershipRelation
} from "../contracts";

export class EntityRegistryService {
  constructor(
    private readonly sqliteDatabase: SqliteDatabase,
    private readonly sequenceStore: FileSequenceStore
  ) {}

  async createEntity(name: string, type: EntityType): Promise<EntitySummary> {
    if (!name.trim()) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NAME_REQUIRED",
        message: "Entitetsnamn kravs.",
        type: "business"
      });
    }

    const entityId = await this.sequenceStore.next("E");
    const db = await this.sqliteDatabase.open();
    db.prepare("INSERT INTO entities(entity_id, name, type) VALUES (?, ?, ?)").run(
      entityId,
      name.trim(),
      type
    );

    return { entityId, name: name.trim(), type };
  }

  async listEntities(): Promise<EntitySummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = db
      .prepare("SELECT entity_id, name, type FROM entities ORDER BY name ASC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      entityId: String(row.entity_id),
      name: String(row.name),
      type: row.type as EntityType
    }));
  }

  async getEntityDetails(entityId: string): Promise<EntityDetails> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare("SELECT entity_id, name, type FROM entities WHERE entity_id = ?")
      .get(entityId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${entityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const accounts = db
      .prepare("SELECT account_id, entity_id, name FROM entity_accounts WHERE entity_id = ? ORDER BY name ASC")
      .all(entityId) as Array<Record<string, unknown>>;
    const ownerships = db
      .prepare(
        "SELECT relation_id, owner_entity_id, target_entity_id, share_percent FROM entity_ownerships WHERE owner_entity_id = ? OR target_entity_id = ? ORDER BY relation_id ASC"
      )
      .all(entityId, entityId) as Array<Record<string, unknown>>;

    return {
      entityId: String(row.entity_id),
      name: String(row.name),
      type: row.type as EntityType,
      accounts: accounts.map((entry) => ({
        accountId: String(entry.account_id),
        entityId: String(entry.entity_id),
        name: String(entry.name)
      })),
      ownerships: ownerships.map((entry) => ({
        relationId: String(entry.relation_id),
        ownerEntityId: String(entry.owner_entity_id),
        targetEntityId: String(entry.target_entity_id),
        sharePercent: Number(entry.share_percent)
      }))
    };
  }

  async createOwnershipRelation(
    ownerEntityId: string,
    targetEntityId: string,
    sharePercent: number
  ): Promise<OwnershipRelation> {
    const relationId = await this.sequenceStore.next("R");
    const db = await this.sqliteDatabase.open();
    db.prepare(
      "INSERT INTO entity_ownerships(relation_id, owner_entity_id, target_entity_id, share_percent) VALUES (?, ?, ?, ?)"
    ).run(relationId, ownerEntityId, targetEntityId, sharePercent);
    return { relationId, ownerEntityId, targetEntityId, sharePercent };
  }

  async createAccount(entityId: string, name: string): Promise<AccountSummary> {
    const accountId = await this.sequenceStore.next("A");
    const db = await this.sqliteDatabase.open();
    db.prepare("INSERT INTO entity_accounts(account_id, entity_id, name) VALUES (?, ?, ?)").run(
      accountId,
      entityId,
      name.trim()
    );
    return { accountId, entityId, name: name.trim() };
  }
}

