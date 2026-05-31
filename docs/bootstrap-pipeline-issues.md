# Purrifer One-Time Bootstrap Pipeline - Issue Drafts

Label for all: `ready-for-agent`

## Issue 1
**Title:** Canonical Import Contract v1 + Schema Validator  
**Type:** AFK

### What to build
Define and implement a versioned canonical import contract for one-time bootstrap data, with a reusable validator that enforces required fields and safely handles backward-compatible evolution. The contract must cover `document_record`, `payment_event_record`, `supplier_invoice_record`, `voucher_link_record`, and reference records.

### Acceptance criteria
- Canonical contract supports mandatory versioning on batch and record level.
- Validator accepts valid records, rejects invalid records with explicit reason codes.
- Backward-compatible behavior is verified (optional new fields do not break import).

### Blocked by
None - can start immediately

---

## Issue 2
**Title:** Råzonsingest: Folder Batch Intake med hash-dedupe  
**Type:** AFK

### What to build
Create a local raw-zone intake flow where users can import entire folders as batches, assign source metadata, and deduplicate source files by hash before preprocess.

### Acceptance criteria
- User can ingest one or more local source folders as a named batch.
- Each file is stored with source metadata and deterministic hash.
- Duplicate files are identified and prevented from duplicate raw ingestion.

### Blocked by
Issue 1

---

## Issue 3
**Title:** AI-preprocess Runner (offline) till canonical records  
**Type:** HITL

### What to build
Build an offline preprocess runner that transforms raw files into canonical records using predefined extraction recipes, emitting confidence scores and review flags without writing directly to core domain objects.

### Acceptance criteria
- Runner produces canonical records for supported file families with confidence and review flags.
- No direct writes occur to committed domain objects during preprocess.
- HITL review approves recipe behavior for uncertain/edge extraction cases.

### Blocked by
Issue 1, Issue 2

---

## Issue 4
**Title:** Stage Import Gate: schema/ref/dedupe/status (`ready/needs-review/rejected`)  
**Type:** AFK

### What to build
Implement stage import gate in Purrifer that validates canonical records (schema, reference integrity, dedupe) and classifies each record into `ready`, `needs-review`, or `rejected`.

### Acceptance criteria
- Stage gate validates schema and reference integrity against known `Entitet`/`Konto`.
- Record-level dedupe is applied before staging outcome is finalized.
- Every staged record receives exactly one explicit status with reason metadata.

### Blocked by
Issue 1, Issue 2, Issue 3

---

## Issue 5
**Title:** Review Queue + Bulk Actions för `needs-review`  
**Type:** AFK

### What to build
Provide a review queue for staged records that need manual intervention, including bulk approval/edit workflows and explicit support for `inkomplett men accepterad` where justified.

### Acceptance criteria
- Review queue lists only `needs-review` records with actionable reason flags.
- User can perform bulk actions for similar records safely.
- Manual corrections are persisted and move records to a commit-eligible state.

### Blocked by
Issue 4

---

## Issue 6
**Title:** Commit Import till domänobjekt + beviskedjelänkar  
**Type:** AFK

### What to build
Commit approved staged records into operational domain objects (`Dokument`, `Verifikat`, `Leverantörsfaktura`, `Betalhändelse`, and linked relations) and establish proof-chain links where data is available.

### Acceptance criteria
- Only `ready` and manually approved records are commit-eligible.
- Commit creates/updates domain objects with correct domain vocabulary mapping.
- Proof-chain links are created and queryable for committed records.

### Blocked by
Issue 4, Issue 5

---

## Issue 7
**Title:** Spårbarhet/Audit View från råfil till slutobjekt  
**Type:** AFK

### What to build
Deliver end-to-end audit traceability from raw source file to preprocess record, stage decision, manual corrections, and final committed domain object.

### Acceptance criteria
- User can inspect full lineage from source file to committed object.
- Audit timeline includes correction and commit timestamps.
- Traceability is available for all committed records in pilot scope.

### Blocked by
Issue 6

---

## Issue 8
**Title:** Retry/Re-run Safety + idempotent batch replay  
**Type:** AFK

### What to build
Implement safe retry and replay behavior so that re-running the same batch does not duplicate committed data and partial failures can be resumed deterministically.

### Acceptance criteria
- Re-running the same batch is idempotent for already committed records.
- Partial failures can be resumed without corrupting stage/commit state.
- Duplicate prevention works across stage and commit boundaries.

### Blocked by
Issue 4, Issue 6

---

## Issue 9
**Title:** Pilot Migration Dashboard + quality KPI (ready-rate, review-rate)  
**Type:** HITL

### What to build
Create a pilot dashboard for migration quality and throughput, including ready-rate, review-rate, rejection reasons, and confidence distribution, used for go/no-go decision on full migration rollout.

### Acceptance criteria
- Dashboard surfaces key pilot KPIs and reason breakdowns clearly.
- Metrics can be inspected per batch/source and support operator decisions.
- HITL review confirms quality thresholds before full-scale migration.

### Blocked by
Issue 5, Issue 6, Issue 7, Issue 8
