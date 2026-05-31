import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { HoldingDetails, HoldingEvent, HoldingSummary } from "../contracts";

export class HoldingsAndEventsRepository {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async createHolding(item: HoldingDetails): Promise<void> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO holdings (holding_id, entity_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      `
    ).run(item.holdingId, item.entityId, item.name, item.createdAt, item.updatedAt);
  }

  async listHoldings(entityId?: string): Promise<HoldingSummary[]> {
    const db = await this.sqliteDatabase.open();
    const rows = (entityId
      ? db
          .prepare(
            `
            SELECT holding_id, entity_id, name, updated_at
            FROM holdings
            WHERE entity_id = ?
            ORDER BY updated_at DESC
            `
          )
          .all(entityId)
      : db
          .prepare(
            `
            SELECT holding_id, entity_id, name, updated_at
            FROM holdings
            ORDER BY updated_at DESC
            `
          )
          .all()) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      holdingId: String(row.holding_id),
      entityId: String(row.entity_id),
      name: String(row.name),
      updatedAt: String(row.updated_at)
    }));
  }

  async findHoldingById(holdingId: string): Promise<HoldingDetails | undefined> {
    const db = await this.sqliteDatabase.open();
    const row = db
      .prepare(
        `
        SELECT holding_id, entity_id, name, created_at, updated_at
        FROM holdings
        WHERE holding_id = ?
        `
      )
      .get(holdingId) as Record<string, unknown> | undefined;

    if (!row) {
      return undefined;
    }

    const timelineRows = db
      .prepare(
        `
        SELECT event_id, holding_id, event_type, event_date, amount, note, created_at
        FROM holding_events
        WHERE holding_id = ?
        ORDER BY event_date DESC, created_at DESC
        `
      )
      .all(holdingId) as Array<Record<string, unknown>>;

    return {
      holdingId: String(row.holding_id),
      entityId: String(row.entity_id),
      name: String(row.name),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      timeline: timelineRows.map((eventRow) => ({
        eventId: String(eventRow.event_id),
        holdingId: String(eventRow.holding_id),
        eventType: eventRow.event_type as HoldingEvent["eventType"],
        eventDate: String(eventRow.event_date),
        amount: Number(eventRow.amount),
        note: eventRow.note ? String(eventRow.note) : undefined,
        createdAt: String(eventRow.created_at)
      }))
    };
  }

  async createHoldingEvent(item: HoldingEvent): Promise<void> {
    const db = await this.sqliteDatabase.open();
    const tx = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO holding_events (event_id, holding_id, event_type, event_date, amount, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      ).run(item.eventId, item.holdingId, item.eventType, item.eventDate, item.amount, item.note ?? null, item.createdAt);
      db.prepare(
        `
        UPDATE holdings
        SET updated_at = ?
        WHERE holding_id = ?
        `
      ).run(item.createdAt, item.holdingId);
    });
    tx();
  }
}
