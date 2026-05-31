import { mkdir } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

type BetterSqliteDatabase = InstanceType<typeof Database>;

export class SqliteDatabase {
  private db: BetterSqliteDatabase | null = null;

  constructor(private readonly baseDirectory: string) {}

  async open(): Promise<BetterSqliteDatabase> {
    if (this.db) {
      return this.db;
    }

    const dataDirectory = path.join(this.baseDirectory, "data");
    await mkdir(dataDirectory, { recursive: true });
    const filePath = path.join(dataDirectory, "purrifer.sqlite");
    const db = new Database(filePath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    this.runMigrations(db);
    this.db = db;
    return db;
  }

  private runMigrations(db: BetterSqliteDatabase): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `);

    const versionRow = db.prepare("SELECT MAX(version) as version FROM schema_version").get() as {
      version?: number;
    };
    const current = versionRow.version ?? 0;

    if (current < 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sequences (
          prefix TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inbox_items (
          document_id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          source TEXT NOT NULL,
          received_at TEXT NOT NULL,
          status TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          stored_path TEXT NOT NULL,
          text_preview TEXT
        );

        CREATE TABLE IF NOT EXISTS vouchers (
          voucher_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          verification_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          source_document_id TEXT NOT NULL,
          source_file_name TEXT NOT NULL,
          source_stored_path TEXT NOT NULL,
          source_mime_type TEXT NOT NULL,
          source_received_at TEXT NOT NULL,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS document_review_templates (
          id TEXT PRIMARY KEY,
          template_type TEXT NOT NULL,
          template_key TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (1)").run();
    }

    if (current < 2) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS entities (
          entity_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entity_accounts (
          account_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );

        CREATE TABLE IF NOT EXISTS entity_ownerships (
          relation_id TEXT PRIMARY KEY,
          owner_entity_id TEXT NOT NULL,
          target_entity_id TEXT NOT NULL,
          share_percent REAL NOT NULL,
          FOREIGN KEY(owner_entity_id) REFERENCES entities(entity_id),
          FOREIGN KEY(target_entity_id) REFERENCES entities(entity_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (2)").run();
    }

    if (current < 3) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
          invoice_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          supplier_name TEXT NOT NULL,
          gross_amount REAL NOT NULL,
          net_amount REAL NOT NULL,
          vat_amount REAL NOT NULL,
          status TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );

        CREATE TABLE IF NOT EXISTS payment_events (
          payment_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          payment_date TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );

        CREATE TABLE IF NOT EXISTS payment_matches (
          match_id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          payment_id TEXT NOT NULL,
          amount REAL NOT NULL,
          FOREIGN KEY(invoice_id) REFERENCES invoices(invoice_id),
          FOREIGN KEY(payment_id) REFERENCES payment_events(payment_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (3)").run();
    }

    if (current < 4) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS obligations (
          obligation_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL,
          entity_id TEXT,
          due_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (4)").run();
    }

    if (current < 5) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS obligation_cases (
          case_id TEXT PRIMARY KEY,
          obligation_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(obligation_id) REFERENCES obligations(obligation_id)
        );

        CREATE TABLE IF NOT EXISTS case_checklist_items (
          checklist_item_id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          label TEXT NOT NULL,
          completed_at TEXT,
          FOREIGN KEY(case_id) REFERENCES obligation_cases(case_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (5)").run();
    }

    if (current < 6) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS deviation_cases (
          case_id TEXT PRIMARY KEY,
          obligation_id TEXT,
          rule TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          detected_at TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES obligation_cases(case_id),
          FOREIGN KEY(obligation_id) REFERENCES obligations(obligation_id),
          UNIQUE(rule, source_type, source_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (6)").run();
    }

    if (current < 7) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS search_index (
          object_type TEXT NOT NULL,
          object_id TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          matched_text TEXT NOT NULL,
          target_route TEXT NOT NULL,
          indexed_at TEXT NOT NULL,
          PRIMARY KEY(object_type, object_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (7)").run();
    }

    if (current < 8) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS reports_budgets (
          budget_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER,
          category_key TEXT NOT NULL,
          category_label TEXT NOT NULL,
          budget_amount REAL NOT NULL,
          confidence TEXT NOT NULL DEFAULT 'partial',
          created_at TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id),
          UNIQUE(entity_id, year, month, category_key)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (8)").run();
    }

    if (current < 9) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS holdings (
          holding_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );

        CREATE TABLE IF NOT EXISTS holding_events (
          event_id TEXT PRIMARY KEY,
          holding_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_date TEXT NOT NULL,
          amount REAL NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(holding_id) REFERENCES holdings(holding_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (9)").run();
    }
    if (current < 10) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS import_batches (
          batch_id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          total_rows INTEGER NOT NULL,
          valid_rows INTEGER NOT NULL,
          invalid_rows INTEGER NOT NULL,
          rows_json TEXT NOT NULL
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (10)").run();
    }
    if (current < 11) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS import_row_mappings (
          batch_id TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          entity_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          object_type TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY(batch_id, row_number),
          FOREIGN KEY(batch_id) REFERENCES import_batches(batch_id),
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id),
          FOREIGN KEY(account_id) REFERENCES entity_accounts(account_id)
        );

        CREATE TABLE IF NOT EXISTS import_commits (
          commit_id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL,
          committed_at TEXT NOT NULL,
          total_rows INTEGER NOT NULL,
          committed_rows INTEGER NOT NULL,
          FOREIGN KEY(batch_id) REFERENCES import_batches(batch_id)
        );

        CREATE TABLE IF NOT EXISTS import_commit_rows (
          commit_row_id TEXT PRIMARY KEY,
          commit_id TEXT NOT NULL,
          batch_id TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          entity_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          object_type TEXT NOT NULL,
          row_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(commit_id) REFERENCES import_commits(commit_id),
          FOREIGN KEY(batch_id) REFERENCES import_batches(batch_id),
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id),
          FOREIGN KEY(account_id) REFERENCES entity_accounts(account_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (11)").run();
    }
    if (current < 12) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS raw_ingest_batches (
          ingest_batch_id TEXT PRIMARY KEY,
          source_system TEXT NOT NULL,
          created_at TEXT NOT NULL,
          source_folders_json TEXT NOT NULL,
          total_discovered INTEGER NOT NULL,
          total_new INTEGER NOT NULL,
          total_duplicates INTEGER NOT NULL,
          total_errors INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS raw_ingest_files (
          ingest_batch_id TEXT NOT NULL,
          full_path TEXT NOT NULL,
          file_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          file_hash TEXT NOT NULL,
          status TEXT NOT NULL,
          duplicate_scope TEXT,
          error_message TEXT,
          PRIMARY KEY(ingest_batch_id, file_hash),
          FOREIGN KEY(ingest_batch_id) REFERENCES raw_ingest_batches(ingest_batch_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (12)").run();
    }
    if (current < 13) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS retirement_assumptions (
          entity_id TEXT PRIMARY KEY,
          monthly_income REAL NOT NULL,
          monthly_withdrawal REAL NOT NULL,
          annual_return_rate REAL NOT NULL,
          annual_interest_rate REAL NOT NULL,
          horizon_years INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );

        CREATE TABLE IF NOT EXISTS retirement_scenarios (
          scenario_id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          base_capital REAL NOT NULL,
          projected_capital REAL NOT NULL,
          net_monthly_cashflow REAL NOT NULL,
          assumptions_json TEXT NOT NULL,
          uncertainty_json TEXT NOT NULL,
          interpretation_note TEXT NOT NULL,
          hitl_approved INTEGER NOT NULL DEFAULT 0,
          hitl_approved_at TEXT,
          hitl_review_note TEXT,
          calculated_at TEXT NOT NULL,
          FOREIGN KEY(entity_id) REFERENCES entities(entity_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (13)").run();
    }
    if (current < 14) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS canonical_preprocess_batches (
          preprocess_batch_id TEXT PRIMARY KEY,
          ingest_batch_id TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          source_system TEXT NOT NULL,
          source_exported_at TEXT,
          created_at TEXT NOT NULL,
          total_records INTEGER NOT NULL,
          validation_ok INTEGER NOT NULL,
          validation_error_count INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          FOREIGN KEY(ingest_batch_id) REFERENCES raw_ingest_batches(ingest_batch_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (14)").run();
    }
    if (current < 15) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS canonical_stage_batches (
          stage_batch_id TEXT PRIMARY KEY,
          preprocess_batch_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          total_records INTEGER NOT NULL,
          ready_count INTEGER NOT NULL,
          needs_review_count INTEGER NOT NULL,
          rejected_count INTEGER NOT NULL,
          FOREIGN KEY(preprocess_batch_id) REFERENCES canonical_preprocess_batches(preprocess_batch_id)
        );

        CREATE TABLE IF NOT EXISTS canonical_stage_records (
          stage_batch_id TEXT NOT NULL,
          record_id TEXT NOT NULL,
          record_type TEXT NOT NULL,
          source_file_id TEXT NOT NULL,
          status TEXT NOT NULL,
          reason_codes_json TEXT NOT NULL,
          dedupe_fingerprint TEXT NOT NULL,
          FOREIGN KEY(stage_batch_id) REFERENCES canonical_stage_batches(stage_batch_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (15)").run();
    }
    if (current < 16) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS canonical_stage_review_actions (
          stage_batch_id TEXT NOT NULL,
          record_id TEXT NOT NULL,
          action_status TEXT NOT NULL,
          review_note TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY(stage_batch_id, record_id),
          FOREIGN KEY(stage_batch_id) REFERENCES canonical_stage_batches(stage_batch_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (16)").run();
    }
    if (current < 17) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS canonical_commit_batches (
          commit_batch_id TEXT PRIMARY KEY,
          stage_batch_id TEXT NOT NULL,
          committed_at TEXT NOT NULL,
          committed_count INTEGER NOT NULL,
          FOREIGN KEY(stage_batch_id) REFERENCES canonical_stage_batches(stage_batch_id)
        );

        CREATE TABLE IF NOT EXISTS canonical_commit_records (
          commit_batch_id TEXT NOT NULL,
          stage_batch_id TEXT NOT NULL,
          record_id TEXT NOT NULL,
          record_type TEXT NOT NULL,
          object_type TEXT NOT NULL,
          object_id TEXT NOT NULL,
          FOREIGN KEY(commit_batch_id) REFERENCES canonical_commit_batches(commit_batch_id)
        );

        CREATE TABLE IF NOT EXISTS proof_chain_links (
          proof_link_id TEXT PRIMARY KEY,
          commit_batch_id TEXT NOT NULL,
          source_file_id TEXT NOT NULL,
          record_id TEXT NOT NULL,
          object_type TEXT NOT NULL,
          object_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(commit_batch_id) REFERENCES canonical_commit_batches(commit_batch_id)
        );
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (17)").run();
    }
    if (current < 18) {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_canonical_commit_stage_record
          ON canonical_commit_records(stage_batch_id, record_id);
      `);
      db.prepare("INSERT INTO schema_version(version) VALUES (18)").run();
    }
    if (current < 19) {
      const hasBatchColumn = (columnName: string) =>
        (db
          .prepare("SELECT 1 AS ok FROM pragma_table_info('raw_ingest_batches') WHERE name = ? LIMIT 1")
          .get(columnName) as { ok?: number } | undefined)?.ok === 1;
      const hasFileColumn = (columnName: string) =>
        (db
          .prepare("SELECT 1 AS ok FROM pragma_table_info('raw_ingest_files') WHERE name = ? LIMIT 1")
          .get(columnName) as { ok?: number } | undefined)?.ok === 1;

      if (!hasBatchColumn("scanner_device_name")) {
        db.exec("ALTER TABLE raw_ingest_batches ADD COLUMN scanner_device_name TEXT");
      }
      if (!hasBatchColumn("scanner_profile")) {
        db.exec("ALTER TABLE raw_ingest_batches ADD COLUMN scanner_profile TEXT");
      }
      if (!hasBatchColumn("scan_mode")) {
        db.exec("ALTER TABLE raw_ingest_batches ADD COLUMN scan_mode TEXT");
      }
      if (!hasBatchColumn("feeder_mode")) {
        db.exec("ALTER TABLE raw_ingest_batches ADD COLUMN feeder_mode TEXT");
      }
      if (!hasBatchColumn("scan_timestamp")) {
        db.exec("ALTER TABLE raw_ingest_batches ADD COLUMN scan_timestamp TEXT");
      }
      if (!hasFileColumn("scan_timestamp")) {
        db.exec("ALTER TABLE raw_ingest_files ADD COLUMN scan_timestamp TEXT");
      }
      db.prepare("INSERT INTO schema_version(version) VALUES (19)").run();
    }
  }
}

