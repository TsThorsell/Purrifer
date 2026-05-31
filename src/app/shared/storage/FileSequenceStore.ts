import { SqliteDatabase } from "./SqliteDatabase";

export class FileSequenceStore {
  constructor(private readonly sqliteDatabase: SqliteDatabase) {}

  async next(prefix: string): Promise<string> {
    const db = await this.sqliteDatabase.open();
    db.prepare(
      `
      INSERT INTO sequences(prefix, value)
      VALUES (?, 1)
      ON CONFLICT(prefix) DO UPDATE SET value = value + 1;
      `
    ).run(prefix);

    const row = db.prepare("SELECT value FROM sequences WHERE prefix = ?").get(prefix) as {
      value: number;
    };

    const nextValue = row.value;
    return `${prefix}${String(nextValue).padStart(6, "0")}`;
  }
}
