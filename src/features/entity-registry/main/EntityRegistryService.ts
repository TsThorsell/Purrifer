import { AppError } from "@app/shared/errors/AppError";
import { FileSequenceStore } from "@app/shared/storage/FileSequenceStore";
import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type {
  AccountSummary,
  EntityDetails,
  EntityListFilter,
  EntitySummary,
  EntityType,
  EntityUpdateInput,
  OwnershipFilter,
  OwnershipRelation,
  UpdateAccountInput,
  UpdateOwnershipInput
} from "../contracts";

const VALID_ENTITY_TYPES: ReadonlySet<EntityType> = new Set([
  "person",
  "aktiebolag",
  "enskild-naringsverksamhet",
  "fastighet"
]);

export class EntityRegistryService {
  constructor(
    private readonly sqliteDatabase: SqliteDatabase,
    private readonly sequenceStore: FileSequenceStore
  ) {}

  async createEntity(name: string, type: EntityType): Promise<EntitySummary> {
    const normalizedName = this.normalizeRequiredString(name, "Namn");
    this.assertEntityType(type);

    const db = await this.sqliteDatabase.open();
    const existing = db
      .prepare("SELECT entity_id FROM entities WHERE LOWER(name) = LOWER(?) LIMIT 1")
      .get(normalizedName) as Record<string, unknown> | undefined;

    if (existing) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NAME_DUPLICATE",
        message: `Namn '${normalizedName}' används redan av en entitet.`,
        type: "business",
        details: "Ändra namnet till en unik benämning före skapa."
      });
    }

    const entityId = await this.sequenceStore.next("E");
    db.prepare("INSERT INTO entities(entity_id, name, type) VALUES (?, ?, ?)").run(
      entityId,
      normalizedName,
      type
    );

    return { entityId, name: normalizedName, type };
  }

  async listEntities(filter: EntityListFilter = {}): Promise<EntitySummary[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const params: Array<string> = [];

    if (filter.type) {
      this.assertEntityType(filter.type);
      conditions.push("type = ?");
      params.push(filter.type);
    }

    if (filter.query?.trim()) {
      conditions.push("LOWER(name) LIKE LOWER(?)");
      params.push(`%${filter.query.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT entity_id, name, type FROM entities ${whereClause} ORDER BY name ASC`)
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      entityId: String(row.entity_id),
      name: String(row.name),
      type: row.type as EntityType
    }));
  }

  async getEntityDetails(entityId: string): Promise<EntityDetails> {
    const normalizedEntityId = this.normalizeRequiredString(entityId, "entityId");
    const db = await this.sqliteDatabase.open();
    const entityRow = (await this.getEntityRow(db, normalizedEntityId)) as Record<string, unknown> | undefined;
    if (!entityRow) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${normalizedEntityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const accounts = await this.listAccounts(normalizedEntityId);
    const ownerships = await this.listOwnerships({
      ownerEntityId: normalizedEntityId
    });
    const ownedBy = await this.listOwnerships({
      targetEntityId: normalizedEntityId
    });

    return {
      entityId: String(entityRow.entity_id),
      name: String(entityRow.name),
      type: entityRow.type as EntityType,
      accounts,
      ownerships: [...ownerships, ...ownedBy]
    };
  }

  async updateEntity(input: EntityUpdateInput): Promise<EntitySummary> {
    const normalizedEntityId = this.normalizeRequiredString(input.entityId, "entityId");
    const normalizedName = input.name?.trim();
    const normalizedType = input.type;

    if (!normalizedName && !normalizedType) {
      throw new AppError({
        code: "BUSINESS_ENTITY_UPDATE_NO_FIELDS",
        message: "Ingen ändring skickades.",
        type: "business",
        details: "Skicka namn eller typ för att uppdatera."
      });
    }

    if (normalizedName !== undefined && !normalizedName) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NAME_REQUIRED",
        message: "Entitetsnamn kravs.",
        type: "business"
      });
    }

    if (normalizedType) {
      this.assertEntityType(normalizedType);
    }

    const db = await this.sqliteDatabase.open();
    const currentRow = (await this.getEntityRow(db, normalizedEntityId)) as Record<string, unknown> | undefined;
    if (!currentRow) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${normalizedEntityId} kunde inte hittas.`,
        type: "business"
      });
    }

    if (normalizedName && normalizedName.toLowerCase() !== String(currentRow.name).toLowerCase()) {
      const duplicate = db
        .prepare("SELECT entity_id FROM entities WHERE LOWER(name) = LOWER(?) AND entity_id != ? LIMIT 1")
        .get(normalizedName, normalizedEntityId) as Record<string, unknown> | undefined;
      if (duplicate) {
        throw new AppError({
          code: "BUSINESS_ENTITY_NAME_DUPLICATE",
          message: `Namn '${normalizedName}' används redan.`,
          type: "business",
          details: "Använd en unik titel."
        });
      }
    }

    const nextName = normalizedName || String(currentRow.name);
    const nextType = normalizedType || (currentRow.type as EntityType);

    db.prepare("UPDATE entities SET name = ?, type = ? WHERE entity_id = ?").run(
      nextName,
      nextType,
      normalizedEntityId
    );

    return {
      entityId: normalizedEntityId,
      name: nextName,
      type: nextType
    };
  }

  async deleteEntity(entityId: string): Promise<void> {
    const normalizedEntityId = this.normalizeRequiredString(entityId, "entityId");
    const db = await this.sqliteDatabase.open();

    const current = (await this.getEntityRow(db, normalizedEntityId)) as Record<string, unknown> | undefined;
    if (!current) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${normalizedEntityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const dependencyRows = [
      { label: "konto", count: this.countRows(db, "entity_accounts", "entity_id", normalizedEntityId) },
      { label: "ägarrelation", count: this.countRows(db, "entity_ownerships", "owner_entity_id", normalizedEntityId) },
      { label: "målrelation", count: this.countRows(db, "entity_ownerships", "target_entity_id", normalizedEntityId) },
      { label: "innehav", count: this.countRows(db, "holdings", "entity_id", normalizedEntityId) },
      { label: "uppgift", count: this.countRows(db, "obligations", "entity_id", normalizedEntityId) },
      { label: "faktura", count: this.countRows(db, "invoices", "entity_id", normalizedEntityId) },
      { label: "betalning", count: this.countRows(db, "payment_events", "entity_id", normalizedEntityId) },
      { label: "pensionsscenario", count: this.countRows(db, "retirement_scenarios", "entity_id", normalizedEntityId) },
      { label: "pensionsantagande", count: this.countRows(db, "retirement_assumptions", "entity_id", normalizedEntityId) },
      { label: "budget", count: this.countRows(db, "reports_budgets", "entity_id", normalizedEntityId) }
    ];
    const blocks = dependencyRows.filter((entry) => entry.count > 0).map((entry) => entry.label);

    if (blocks.length > 0) {
      throw new AppError({
        code: "BUSINESS_ENTITY_DELETE_BLOCKED",
        message: `Entitet ${normalizedEntityId} kan inte tas bort.`,
        type: "business",
        details: `Den har beroenden i: ${blocks.join(", ")}. Ta bort beroenden först.`
      });
    }

    try {
      db.prepare("DELETE FROM entities WHERE entity_id = ?").run(normalizedEntityId);
    } catch (reason: unknown) {
      throw this.toConflictAwareError(reason, `Entitet ${normalizedEntityId} kan inte tas bort p.g.a. beroenden.`);
    }
  }

  async createOwnershipRelation(
    ownerEntityId: string,
    targetEntityId: string,
    sharePercent: number
  ): Promise<OwnershipRelation> {
    const normalizedOwnerEntityId = this.normalizeRequiredString(ownerEntityId, "ownerEntityId");
    const normalizedTargetEntityId = this.normalizeRequiredString(targetEntityId, "targetEntityId");
    const normalizedSharePercent = this.normalizeSharePercent(sharePercent);

    if (normalizedOwnerEntityId === normalizedTargetEntityId) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_SELF_REFERENCE",
        message: "Ägaren får inte vara målentiteten.",
        type: "business",
        details: "Välj olika entiteter för ägare och målobjekt."
      });
    }

    const db = await this.sqliteDatabase.open();
    const ownerExists = await this.assertEntityExistsRecord(db, normalizedOwnerEntityId);
    const targetExists = await this.assertEntityExistsRecord(db, normalizedTargetEntityId);

    if (!ownerExists || !targetExists) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_ENTITY_NOT_FOUND",
        message: "Båda entiteterna i relationen måste existera.",
        type: "business",
        details: `Owner finns=${ownerExists}, target finns=${targetExists}. Kontrollera båda entitets-id:n.`
      });
    }

    const relationExists = db
      .prepare(
        "SELECT relation_id FROM entity_ownerships WHERE owner_entity_id = ? AND target_entity_id = ? LIMIT 1"
      )
      .get(normalizedOwnerEntityId, normalizedTargetEntityId) as
      | Record<string, unknown>
      | undefined;
    if (relationExists) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_RELATION_DUPLICATE",
        message: "Det finns redan en äganderelation mellan dessa två entiteter.",
        type: "business",
        details: "Uppdatera gärna befintlig relation istället för att skapa ny."
      });
    }

    const currentShare = (db
      .prepare("SELECT COALESCE(SUM(share_percent), 0) AS share_sum FROM entity_ownerships WHERE target_entity_id = ?")
      .get(normalizedTargetEntityId) as { share_sum: number } | undefined)?.share_sum as number;

    if (currentShare + normalizedSharePercent > 100) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_SHARE_EXCEEDED",
        message: "Målet skulle överstiga 100% ägande.",
        type: "business",
        details: `Nuvarande total på målet ${normalizedTargetEntityId}: ${currentShare}%. Ny andel ${normalizedSharePercent}%.`
      });
    }

    const relationId = await this.sequenceStore.next("R");
    db.prepare(
      "INSERT INTO entity_ownerships(relation_id, owner_entity_id, target_entity_id, share_percent) VALUES (?, ?, ?, ?)"
    ).run(relationId, normalizedOwnerEntityId, normalizedTargetEntityId, normalizedSharePercent);

    const relations = await this.listOwnerships({ ownerEntityId: normalizedOwnerEntityId, targetEntityId: normalizedTargetEntityId });
    const created = relations.find((entry) => entry.relationId === relationId);
    if (!created) {
      throw new AppError({
        code: "TECHNICAL_UNKNOWN",
        message: "Relation skapades men kunde inte läsas tillbaka.",
        type: "technical"
      });
    }
    return created;
  }

  async updateOwnershipRelation(input: UpdateOwnershipInput): Promise<OwnershipRelation> {
    const normalizedRelationId = this.normalizeRequiredString(input.relationId, "relationId");
    const normalizedSharePercent = this.normalizeSharePercent(input.sharePercent);
    const db = await this.sqliteDatabase.open();

    const relation = db
      .prepare("SELECT relation_id, target_entity_id FROM entity_ownerships WHERE relation_id = ?")
      .get(normalizedRelationId) as Record<string, unknown> | undefined;
    if (!relation) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_RELATION_NOT_FOUND",
        message: `Relation ${normalizedRelationId} kunde inte hittas.`,
        type: "business"
      });
    }

    const targetEntityId = String(relation.target_entity_id);
    const currentShare = (db
      .prepare("SELECT COALESCE(SUM(share_percent), 0) AS share_sum FROM entity_ownerships WHERE target_entity_id = ? AND relation_id != ?")
      .get(targetEntityId, normalizedRelationId) as { share_sum: number } | undefined)?.share_sum as number;

    if (currentShare + normalizedSharePercent > 100) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_SHARE_EXCEEDED",
        message: "Målet skulle överstiga 100% ägande.",
        type: "business",
        details: `Nuvarande total på målet ${targetEntityId}: ${currentShare}%. Föreslagen andel ${normalizedSharePercent}%.`
      });
    }

    db.prepare("UPDATE entity_ownerships SET share_percent = ? WHERE relation_id = ?").run(
      normalizedSharePercent,
      normalizedRelationId
    );

    const relationItems = await this.listOwnerships();
    const updated = relationItems.find((entry) => entry.relationId === normalizedRelationId);
    if (!updated) {
      throw new AppError({
        code: "TECHNICAL_UNKNOWN",
        message: "Relation uppdaterades men kunde inte läsas tillbaka.",
        type: "technical"
      });
    }
    return updated;
  }

  async deleteOwnershipRelation(relationId: string): Promise<void> {
    const normalizedRelationId = this.normalizeRequiredString(relationId, "relationId");
    const db = await this.sqliteDatabase.open();
    const result = db
      .prepare("DELETE FROM entity_ownerships WHERE relation_id = ?")
      .run(normalizedRelationId);
    if (result.changes === 0) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_RELATION_NOT_FOUND",
        message: `Relation ${normalizedRelationId} kunde inte hittas.`,
        type: "business"
      });
    }
  }

  async createAccount(entityId: string, name: string): Promise<AccountSummary> {
    const normalizedEntityId = this.normalizeRequiredString(entityId, "entityId");
    const normalizedName = this.normalizeRequiredString(name, "Namn");

    const db = await this.sqliteDatabase.open();
    const entityExists = await this.assertEntityExistsRecord(db, normalizedEntityId);
    if (!entityExists) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${normalizedEntityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const duplicate = db
      .prepare("SELECT account_id FROM entity_accounts WHERE entity_id = ? AND LOWER(name) = LOWER(?) LIMIT 1")
      .get(normalizedEntityId, normalizedName) as Record<string, unknown> | undefined;
    if (duplicate) {
      throw new AppError({
        code: "BUSINESS_ACCOUNT_NAME_DUPLICATE",
        message: `Kontonamn '${normalizedName}' används redan för entiteten.`,
        type: "business",
        details: "Välj ett annat namn eller uppdatera det existerande kontot."
      });
    }

    const accountId = await this.sequenceStore.next("A");
    db.prepare("INSERT INTO entity_accounts(account_id, entity_id, name) VALUES (?, ?, ?)").run(
      accountId,
      normalizedEntityId,
      normalizedName
    );

    return { accountId, entityId: normalizedEntityId, name: normalizedName };
  }

  async updateAccount(input: UpdateAccountInput): Promise<AccountSummary> {
    const normalizedAccountId = this.normalizeRequiredString(input.accountId, "accountId");
    const normalizedName = this.normalizeRequiredString(input.name, "Namn");

    const db = await this.sqliteDatabase.open();
    const account = db
      .prepare("SELECT account_id, entity_id FROM entity_accounts WHERE account_id = ?")
      .get(normalizedAccountId) as Record<string, unknown> | undefined;
    if (!account) {
      throw new AppError({
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: `Konto ${normalizedAccountId} kunde inte hittas.`,
        type: "business"
      });
    }

    const duplicate = db
      .prepare(
        "SELECT account_id FROM entity_accounts WHERE entity_id = ? AND LOWER(name) = LOWER(?) AND account_id != ? LIMIT 1"
      )
      .get(String(account.entity_id), normalizedName, normalizedAccountId) as Record<string, unknown> | undefined;
    if (duplicate) {
      throw new AppError({
        code: "BUSINESS_ACCOUNT_NAME_DUPLICATE",
        message: `Kontonamn '${normalizedName}' används redan för denna entitet.`,
        type: "business",
        details: "Välj ett annat namn."
      });
    }

    db.prepare("UPDATE entity_accounts SET name = ? WHERE account_id = ?").run(
      normalizedName,
      normalizedAccountId
    );
    return { accountId: normalizedAccountId, entityId: String(account.entity_id), name: normalizedName };
  }

  async deleteAccount(accountId: string): Promise<void> {
    const normalizedAccountId = this.normalizeRequiredString(accountId, "accountId");
    const db = await this.sqliteDatabase.open();

    const result = db
      .prepare("DELETE FROM entity_accounts WHERE account_id = ?")
      .run(normalizedAccountId);

    if (result.changes === 0) {
      throw new AppError({
        code: "BUSINESS_ACCOUNT_NOT_FOUND",
        message: `Konto ${normalizedAccountId} kunde inte hittas.`,
        type: "business"
      });
    }
  }

  async listAccounts(entityId: string): Promise<AccountSummary[]> {
    const normalizedEntityId = this.normalizeRequiredString(entityId, "entityId");
    const db = await this.sqliteDatabase.open();
    const entityExists = await this.assertEntityExistsRecord(db, normalizedEntityId);
    if (!entityExists) {
      throw new AppError({
        code: "BUSINESS_ENTITY_NOT_FOUND",
        message: `Entitet ${normalizedEntityId} kunde inte hittas.`,
        type: "business"
      });
    }

    const rows = db
      .prepare("SELECT account_id, entity_id, name FROM entity_accounts WHERE entity_id = ? ORDER BY name ASC")
      .all(normalizedEntityId) as Array<Record<string, unknown>>;
    return rows.map((entry) => ({
      accountId: String(entry.account_id),
      entityId: String(entry.entity_id),
      name: String(entry.name)
    }));
  }

  async listOwnerships(filter: OwnershipFilter = {}): Promise<OwnershipRelation[]> {
    const db = await this.sqliteDatabase.open();
    const conditions: string[] = [];
    const params: Array<string> = [];

    if (filter.ownerEntityId?.trim()) {
      conditions.push("r.owner_entity_id = ?");
      params.push(filter.ownerEntityId.trim());
    }

    if (filter.targetEntityId?.trim()) {
      conditions.push("r.target_entity_id = ?");
      params.push(filter.targetEntityId.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `
        SELECT
          r.relation_id,
          r.owner_entity_id,
          r.target_entity_id,
          r.share_percent,
          COALESCE(ownerEntity.name, '?') AS owner_name,
          COALESCE(targetEntity.name, '?') AS target_name
        FROM entity_ownerships AS r
        LEFT JOIN entities AS ownerEntity ON ownerEntity.entity_id = r.owner_entity_id
        LEFT JOIN entities AS targetEntity ON targetEntity.entity_id = r.target_entity_id
        ${whereClause}
        ORDER BY r.relation_id ASC
        `
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((entry) => ({
      relationId: String(entry.relation_id),
      ownerEntityId: String(entry.owner_entity_id),
      targetEntityId: String(entry.target_entity_id),
      sharePercent: Number(entry.share_percent),
      ownerEntityName: String(entry.owner_name),
      targetEntityName: String(entry.target_name)
    }));
  }

  private async getEntityRow(db: any, entityId: string): Promise<Record<string, unknown> | undefined> {
    return db
      .prepare("SELECT entity_id, name, type FROM entities WHERE entity_id = ?")
      .get(entityId) as Record<string, unknown> | undefined;
  }

  private async assertEntityExistsRecord(db: any, entityId: string): Promise<boolean> {
    const row = db
      .prepare("SELECT 1 AS ok FROM entities WHERE entity_id = ? LIMIT 1")
      .get(entityId) as { ok?: number } | undefined;
    return row?.ok === 1;
  }

  private countRows(db: any, table: string, column: string, entityId: string): number {
    const row = db.prepare(`SELECT COUNT(1) AS count FROM ${table} WHERE ${column} = ?`).get(entityId) as {
      count?: number;
    };
    return Number(row.count ?? 0);
  }

  private normalizeRequiredString(value: string, fieldLabel: string): string {
    const normalized = value?.trim?.();
    if (!normalized) {
      throw new AppError({
        code: "BUSINESS_ENTITY_FIELD_REQUIRED",
        message: `${fieldLabel} kravs.`,
        type: "business"
      });
    }
    return normalized;
  }

  private assertEntityType(value: EntityType): void {
    if (!VALID_ENTITY_TYPES.has(value)) {
      throw new AppError({
        code: "BUSINESS_ENTITY_TYPE_INVALID",
        message: `Entitetstyp ${value} är inte tillåten.`,
        type: "business",
        details: `Tillåtna typer: ${Array.from(VALID_ENTITY_TYPES).join(", ")}`
      });
    }
  }

  private normalizeSharePercent(sharePercent: number): number {
    const normalized = Number(sharePercent);
    if (!Number.isFinite(normalized)) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_SHARE_INVALID",
        message: "Ägarandel måste vara ett tal.",
        type: "business"
      });
    }
    if (normalized <= 0 || normalized > 100) {
      throw new AppError({
        code: "BUSINESS_OWNERSHIP_SHARE_INVALID",
        message: "Ägarandel måste vara > 0 och <= 100.",
        type: "business",
        details: "Ange heltal eller decimaltal."
      });
    }
    return normalized;
  }

  private toConflictAwareError(reason: unknown, fallbackMessage: string): never {
    if (reason instanceof Error) {
      if (/SQLITE_CONSTRAINT/.test(reason.message)) {
        throw new AppError({
          code: "BUSINESS_ENTITY_DELETE_CONSTRAINT",
          message: fallbackMessage,
          type: "business",
          details: "Kolla först relaterade poster i andra moduler."
        });
      }
      throw reason as never;
    }
    throw new AppError({
      code: "TECHNICAL_UNKNOWN",
      message: fallbackMessage,
      type: "technical"
    });
  }
}
