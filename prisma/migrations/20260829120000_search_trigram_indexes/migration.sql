-- Trigram (GIN) indexes for every column the application searches with
-- `contains` / ILIKE '%…%'.
--
-- A btree index cannot serve a leading-wildcard match, so those searches were
-- sequential scans: fast on a small table, linearly slower as the table grows.
-- A GIN index built with `gin_trgm_ops` indexes the three-character sequences
-- of a value and *can* serve them.
--
-- Why the whole thing is wrapped in a DO block:
--   * Some managed PostgreSQL hosts do not let the application role install
--     extensions. If `pg_trgm` is unavailable we log a notice and skip the
--     indexes instead of failing the deploy — the site still works, searches
--     just fall back to a sequential scan. Moving to another host later, or
--     asking the host to enable the extension, is enough to pick them up:
--     re-running this migration body is safe and idempotent.
--   * The column list is checked against information_schema first, so a future
--     rename cannot turn this migration into a hard deploy failure.
--
-- `CREATE INDEX` (not CONCURRENTLY) is deliberate: Prisma runs each migration
-- inside a transaction, and CONCURRENTLY is not allowed there. It takes a
-- brief write lock per table; on a catalogue of this size that is milliseconds.

DO $trgm$
DECLARE
  has_trgm  boolean;
  target    record;
  idx_name  text;
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
      RAISE NOTICE 'pg_trgm could not be installed (%). Continuing without search indexes.', SQLERRM;
    WHEN OTHERS THEN
      RAISE NOTICE 'pg_trgm could not be installed (%). Continuing without search indexes.', SQLERRM;
  END;

  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') INTO has_trgm;

  IF NOT has_trgm THEN
    RAISE NOTICE 'pg_trgm is not available on this server — text-search indexes skipped. Enable the extension and re-run this migration to add them.';
    RETURN;
  END IF;

  FOR target IN
    SELECT * FROM (VALUES
      -- Dashboard: booking search
      ('Booking',        'bookingNumber'),
      ('Booking',        'productTitle'),
      ('Booking',        'contactName'),
      ('Booking',        'contactEmail'),
      ('Booking',        'contactPhone'),
      -- Dashboard: user search
      ('User',           'name'),
      ('User',           'email'),
      ('User',           'phone'),
      -- Dashboard: audit log search
      ('AuditLog',       'action'),
      ('AuditLog',       'entityType'),
      ('AuditLog',       'entityId'),
      ('AuditLog',       'actorLabel'),
      -- Public catalogue search
      ('Destination',    'name'),
      ('Destination',    'region'),
      ('Destination',    'shortDescription'),
      ('Event',          'title'),
      ('Event',          'shortDescription'),
      ('Tour',           'title'),
      ('Tour',           'shortDescription'),
      ('Activity',       'name'),
      ('Accommodation',  'name'),
      -- Train finder
      ('TrainSchedule',  'originStation'),
      ('TrainSchedule',  'destinationStation'),
      -- Travel assistant lookups
      ('VisaCountry',    'name'),
      ('VisaCountry',    'slug'),
      ('FaqItem',        'question'),
      ('FaqItem',        'answer')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name   = target.tbl
        AND column_name  = target.col
    ) THEN
      idx_name := 'idx_trgm_' || lower(target.tbl) || '_' || lower(target.col);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I USING gin (%I gin_trgm_ops)',
        idx_name, target.tbl, target.col
      );
    END IF;
  END LOOP;
END
$trgm$;
