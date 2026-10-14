-- ============================================================
-- LEXFORGE™ — AUDIT SCHEMA v2.1  (ARC-LXF-001)
-- Archer Chain Analytics | ISC: 102237785
-- Supersedes the v2.0 draft schema. Changes and reasons:
--   * delivery_token / delivery_timestamp removed from the generation log:
--     the token is issued AFTER the audit write (spec §3.1 step 9 -> 10) and the
--     log is append-only, so those columns could never be filled. Delivery facts
--     live in lexforge_delivery_events (append-only) instead.
--   * UNIQUE(transaction_id) replaced by UNIQUE(transaction_id, attempt) so a FAILED
--     attempt can be logged and a later retry can succeed.
--   * acerbe/bundle hash columns are NULL-able, but a CHECK forces them (and the
--     validation flags) to be present whenever generation_status = 'SUCCESS'.
--   * datetime('now','utc') replaced with strftime(...) — the 'utc' modifier
--     mis-converts 'now' on non-UTC hosts.
--   * prev_hash / row_hash added: SHA-256 hash chain for tamper evidence.
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lexforge_generation_log (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id        TEXT    NOT NULL,
    attempt               INTEGER NOT NULL DEFAULT 1,
    request_fingerprint   TEXT    NOT NULL,   -- sha256 of canonical request (docs, jurisdiction, language, variables)
    buyer_ref             TEXT    NOT NULL,   -- buyer_wallet as supplied by RaPaX (no other PII stored)
    jurisdiction          TEXT    NOT NULL,
    language_requested    TEXT    NOT NULL,
    documents_generated   TEXT    NOT NULL,   -- JSON array: code, template_path, language_used, hashes, fingerprint_id, file
    bundle_hash           TEXT,               -- sha256 of delivered bundle zip
    acerbe_fingerprints   TEXT,               -- JSON array of AcerbE fingerprint ids (one per document)
    generation_status     TEXT    NOT NULL CHECK (generation_status IN ('SUCCESS','FAILED')),
    validation_passed     INTEGER NOT NULL CHECK (validation_passed IN (0,1)),
    disclaimer_verified   INTEGER NOT NULL CHECK (disclaimer_verified IN (0,1)),
    trigger_timestamp     TEXT    NOT NULL,
    generation_timestamp  TEXT    NOT NULL,
    error_log             TEXT,               -- JSON; required when FAILED
    prev_hash             TEXT    NOT NULL,
    row_hash              TEXT    NOT NULL,
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (transaction_id, attempt),
    CHECK (
      generation_status <> 'SUCCESS' OR (
        bundle_hash IS NOT NULL AND acerbe_fingerprints IS NOT NULL
        AND validation_passed = 1 AND disclaimer_verified = 1
      )
    ),
    CHECK (generation_status <> 'FAILED' OR error_log IS NOT NULL)
);

CREATE TRIGGER IF NOT EXISTS lexforge_generation_log_no_update
    BEFORE UPDATE ON lexforge_generation_log
BEGIN
    SELECT RAISE(ABORT, 'lexforge_generation_log is append-only. UPDATE not permitted.');
END;

CREATE TRIGGER IF NOT EXISTS lexforge_generation_log_no_delete
    BEFORE DELETE ON lexforge_generation_log
BEGIN
    SELECT RAISE(ABORT, 'lexforge_generation_log is append-only. DELETE not permitted.');
END;

CREATE INDEX IF NOT EXISTS idx_gen_tx     ON lexforge_generation_log(transaction_id, attempt);
CREATE INDEX IF NOT EXISTS idx_gen_status ON lexforge_generation_log(generation_status);

-- Delivery / anchoring / download events (append-only)
CREATE TABLE IF NOT EXISTS lexforge_delivery_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id  TEXT NOT NULL,
    event_type      TEXT NOT NULL CHECK (event_type IN (
                      'TOKEN_ISSUED','DOWNLOADED','XRPL_ANCHORED','XRPL_FAILED','XRPL_SKIPPED')),
    detail          TEXT,               -- JSON; never contains token values or secrets
    prev_hash       TEXT NOT NULL,
    row_hash        TEXT NOT NULL,
    event_timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TRIGGER IF NOT EXISTS lexforge_delivery_events_no_update
    BEFORE UPDATE ON lexforge_delivery_events
BEGIN
    SELECT RAISE(ABORT, 'lexforge_delivery_events is append-only. UPDATE not permitted.');
END;

CREATE TRIGGER IF NOT EXISTS lexforge_delivery_events_no_delete
    BEFORE DELETE ON lexforge_delivery_events
BEGIN
    SELECT RAISE(ABORT, 'lexforge_delivery_events is append-only. DELETE not permitted.');
END;

CREATE INDEX IF NOT EXISTS idx_evt_tx ON lexforge_delivery_events(transaction_id, event_type);

-- Pipeline error log (append-only; resolution is recorded as a new row, not an UPDATE)
CREATE TABLE IF NOT EXISTS lexforge_pipeline_errors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id  TEXT,
    pipeline_step   INTEGER NOT NULL,   -- spec §3.1 step number
    error_code      TEXT NOT NULL,
    error_message   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_err_tx ON lexforge_pipeline_errors(transaction_id);
