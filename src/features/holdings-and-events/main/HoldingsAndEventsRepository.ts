import { SqliteDatabase } from "@app/shared/storage/SqliteDatabase";
import type { HoldingDetails, HoldingEvent, HoldingSummary } from "../contracts";
import type { HoldingTimelineFilter, HoldingTimelineItem } from "../contracts";

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
        ORDER BY event_date DESC, created_at DESC, event_id DESC
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

  async listHoldingTimeline(filter?: HoldingTimelineFilter): Promise<HoldingTimelineItem[]> {
    const db = await this.sqliteDatabase.open();

    const conditions: string[] = [];
    const params: Array<string> = [];

    if (filter?.holdingId?.trim()) {
      conditions.push("h.holding_id = ?");
      params.push(filter.holdingId.trim());
    }

    if (filter?.entityId?.trim()) {
      conditions.push("h.entity_id = ?");
      params.push(filter.entityId.trim());
    }

    if (filter?.eventType) {
      conditions.push("e.event_type = ?");
      params.push(filter.eventType);
    }

    if (filter?.fromEventDate?.trim()) {
      conditions.push("e.event_date >= ?");
      params.push(filter.fromEventDate.trim());
    }

    if (filter?.toEventDate?.trim()) {
      conditions.push("e.event_date <= ?");
      params.push(filter.toEventDate.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
        SELECT
          e.event_id,
          e.holding_id,
          h.entity_id,
          h.name AS holding_name,
          e.event_type,
          e.event_date,
          e.amount,
          e.note,
          e.created_at
        FROM holding_events AS e
        INNER JOIN holdings AS h ON h.holding_id = e.holding_id
        ${whereClause}
        ORDER BY e.event_date DESC, e.created_at DESC, e.event_id DESC
        `
      )
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      eventId: String(row.event_id),
      holdingId: String(row.holding_id),
      eventType: row.event_type as HoldingEvent["eventType"],
      eventDate: String(row.event_date),
      amount: Number(row.amount),
      note: row.note ? String(row.note) : undefined,
      createdAt: String(row.created_at),
      holdingName: String(row.holding_name),
      entityId: String(row.entity_id)
    }));
  }
}

