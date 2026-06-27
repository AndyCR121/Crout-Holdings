-- Active: 1781367621525@@localhost@3306@crout_automations
-- Crout Automations — Schema Sync Generator (MySQL 8.x)
-- Purpose:
--   Generate schema-only ALTER/CREATE statements to update a target/live schema
--   so it matches a source/local schema.
--
-- IMPORTANT:
--   This script does NOT copy data.
--   This script does NOT delete rows.
--   This script does NOT drop tables/columns by default.
--   This script GENERATES migration SQL for review.
--
-- Expected workflow:
--   1. Put both schemas on the same MySQL server/session:
--        - Source/local schema: your up-to-date local schema
--        - Target/live schema: the live schema to update
--
--      Example:
--        source schema = crout_automations_local
--        target schema = crout_automations
--
--   2. Edit the variables below.
--   3. Run this script.
--   4. Review:
--        SELECT * FROM __schema_sync_output ORDER BY id;
--   5. Copy the generated_sql output into a migration file and run it on live.
--
-- Notes:
--   - This script handles:
--       CREATE TABLE for missing tables
--       ADD COLUMN for missing columns
--       MODIFY COLUMN for changed column definition/order/default/nullability
--       ADD indexes for missing indexes
--       ADD foreign keys for missing foreign keys
--   - It intentionally does NOT:
--       DROP tables
--       DROP columns
--       DROP indexes
--       DROP foreign keys
--       Rename columns/tables
--       Copy data
--
--   - Generated columns are included in ADD/MODIFY column generation.
SET @source_schema := 'crout_automations_dev.dbo.crout_automations';
SET @target_schema := 'crout_automations_prod.dbo.crout_automations';

DROP TEMPORARY TABLE IF EXISTS __schema_sync_output;

CREATE TEMPORARY TABLE __schema_sync_output (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  change_type VARCHAR(80) NOT NULL,
  table_name VARCHAR(128) NULL,
  object_name VARCHAR(256) NULL,
  generated_sql LONGTEXT NOT NULL
);

-- ============================================================
-- 1. Missing tables
-- ============================================================

INSERT INTO __schema_sync_output (change_type, table_name, object_name, generated_sql)
SELECT
  'CREATE_TABLE' AS change_type,
  s.TABLE_NAME,
  s.TABLE_NAME,
  CONCAT(
    '-- TODO: Table `', s.TABLE_NAME, '` is missing in target schema.', CHAR(10),
    '-- Run SHOW CREATE TABLE `', @source_schema, '`.`', s.TABLE_NAME, '` and apply the CREATE TABLE manually,', CHAR(10),
    '-- replacing the schema name with `', @target_schema, '`.', CHAR(10),
    'SHOW CREATE TABLE `', @source_schema, '`.`', s.TABLE_NAME, '`;'
  ) AS generated_sql
FROM INFORMATION_SCHEMA.TABLES s
LEFT JOIN INFORMATION_SCHEMA.TABLES t
  ON t.TABLE_SCHEMA = @target_schema
 AND t.TABLE_NAME = s.TABLE_NAME
WHERE s.TABLE_SCHEMA = @source_schema
  AND s.TABLE_TYPE = 'BASE TABLE'
  AND t.TABLE_NAME IS NULL
ORDER BY s.TABLE_NAME;

-- ============================================================
-- 2. Missing columns
-- ============================================================

INSERT INTO __schema_sync_output (change_type, table_name, object_name, generated_sql)
SELECT
  'ADD_COLUMN' AS change_type,
  s.TABLE_NAME,
  s.COLUMN_NAME,
  CONCAT(
    'ALTER TABLE `', @target_schema, '`.`', s.TABLE_NAME, '` ',
    'ADD COLUMN `', s.COLUMN_NAME, '` ',
    CASE
      WHEN s.GENERATION_EXPRESSION IS NOT NULL AND s.GENERATION_EXPRESSION <> '' THEN
        CONCAT(
          s.COLUMN_TYPE,
          ' GENERATED ALWAYS AS (', s.GENERATION_EXPRESSION, ') ',
          s.EXTRA
        )
      ELSE
        CONCAT(
          s.COLUMN_TYPE,
          IF(s.CHARACTER_SET_NAME IS NOT NULL, CONCAT(' CHARACTER SET ', s.CHARACTER_SET_NAME), ''),
          IF(s.COLLATION_NAME IS NOT NULL, CONCAT(' COLLATE ', s.COLLATION_NAME), ''),
          IF(s.IS_NULLABLE = 'NO', ' NOT NULL', ' NULL'),
          CASE
            WHEN s.COLUMN_DEFAULT IS NULL THEN
              IF(s.IS_NULLABLE = 'YES', ' DEFAULT NULL', '')
            WHEN UPPER(s.COLUMN_DEFAULT) IN ('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()', 'CURRENT_DATE', 'CURRENT_DATE()', 'CURRENT_TIME', 'CURRENT_TIME()') THEN
              CONCAT(' DEFAULT ', REPLACE(s.COLUMN_DEFAULT, '()', ''))
            ELSE
              CONCAT(' DEFAULT ', QUOTE(s.COLUMN_DEFAULT))
          END,
          IF(s.EXTRA IS NOT NULL AND s.EXTRA <> '', CONCAT(' ', s.EXTRA), ''),
          IF(s.COLUMN_COMMENT IS NOT NULL AND s.COLUMN_COMMENT <> '', CONCAT(' COMMENT ', QUOTE(s.COLUMN_COMMENT)), '')
        )
    END,
    CASE
      WHEN s.ORDINAL_POSITION = 1 THEN ' FIRST'
      ELSE CONCAT(
        ' AFTER `',
        (
          SELECT sp.COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS sp
          WHERE sp.TABLE_SCHEMA = s.TABLE_SCHEMA
            AND sp.TABLE_NAME = s.TABLE_NAME
            AND sp.ORDINAL_POSITION = s.ORDINAL_POSITION - 1
          LIMIT 1
        ),
        '`'
      )
    END,
    ';'
  ) AS generated_sql
FROM INFORMATION_SCHEMA.COLUMNS s
JOIN INFORMATION_SCHEMA.TABLES st
  ON st.TABLE_SCHEMA = s.TABLE_SCHEMA
 AND st.TABLE_NAME = s.TABLE_NAME
 AND st.TABLE_TYPE = 'BASE TABLE'
LEFT JOIN INFORMATION_SCHEMA.COLUMNS t
  ON t.TABLE_SCHEMA = @target_schema
 AND t.TABLE_NAME = s.TABLE_NAME
 AND t.COLUMN_NAME = s.COLUMN_NAME
WHERE s.TABLE_SCHEMA = @source_schema
  AND t.COLUMN_NAME IS NULL
  AND EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES tt
    WHERE tt.TABLE_SCHEMA = @target_schema
      AND tt.TABLE_NAME = s.TABLE_NAME
      AND tt.TABLE_TYPE = 'BASE TABLE'
  )
ORDER BY s.TABLE_NAME, s.ORDINAL_POSITION;

-- ============================================================
-- 3. Changed columns
-- ============================================================

INSERT INTO __schema_sync_output (change_type, table_name, object_name, generated_sql)
SELECT
  'MODIFY_COLUMN' AS change_type,
  s.TABLE_NAME,
  s.COLUMN_NAME,
  CONCAT(
    'ALTER TABLE `', @target_schema, '`.`', s.TABLE_NAME, '` ',
    'MODIFY COLUMN `', s.COLUMN_NAME, '` ',
    CASE
      WHEN s.GENERATION_EXPRESSION IS NOT NULL AND s.GENERATION_EXPRESSION <> '' THEN
        CONCAT(
          s.COLUMN_TYPE,
          ' GENERATED ALWAYS AS (', s.GENERATION_EXPRESSION, ') ',
          s.EXTRA
        )
      ELSE
        CONCAT(
          s.COLUMN_TYPE,
          IF(s.CHARACTER_SET_NAME IS NOT NULL, CONCAT(' CHARACTER SET ', s.CHARACTER_SET_NAME), ''),
          IF(s.COLLATION_NAME IS NOT NULL, CONCAT(' COLLATE ', s.COLLATION_NAME), ''),
          IF(s.IS_NULLABLE = 'NO', ' NOT NULL', ' NULL'),
          CASE
            WHEN s.COLUMN_DEFAULT IS NULL THEN
              IF(s.IS_NULLABLE = 'YES', ' DEFAULT NULL', '')
            WHEN UPPER(s.COLUMN_DEFAULT) IN ('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()', 'CURRENT_DATE', 'CURRENT_DATE()', 'CURRENT_TIME', 'CURRENT_TIME()') THEN
              CONCAT(' DEFAULT ', REPLACE(s.COLUMN_DEFAULT, '()', ''))
            ELSE
              CONCAT(' DEFAULT ', QUOTE(s.COLUMN_DEFAULT))
          END,
          IF(s.EXTRA IS NOT NULL AND s.EXTRA <> '', CONCAT(' ', s.EXTRA), ''),
          IF(s.COLUMN_COMMENT IS NOT NULL AND s.COLUMN_COMMENT <> '', CONCAT(' COMMENT ', QUOTE(s.COLUMN_COMMENT)), '')
        )
    END,
    CASE
      WHEN s.ORDINAL_POSITION = 1 THEN ' FIRST'
      ELSE CONCAT(
        ' AFTER `',
        (
          SELECT sp.COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS sp
          WHERE sp.TABLE_SCHEMA = s.TABLE_SCHEMA
            AND sp.TABLE_NAME = s.TABLE_NAME
            AND sp.ORDINAL_POSITION = s.ORDINAL_POSITION - 1
          LIMIT 1
        ),
        '`'
      )
    END,
    ';'
  ) AS generated_sql
FROM INFORMATION_SCHEMA.COLUMNS s
JOIN INFORMATION_SCHEMA.COLUMNS t
  ON t.TABLE_SCHEMA = @target_schema
 AND t.TABLE_NAME = s.TABLE_NAME
 AND t.COLUMN_NAME = s.COLUMN_NAME
WHERE s.TABLE_SCHEMA = @source_schema
  AND (
       COALESCE(s.COLUMN_TYPE, '') <> COALESCE(t.COLUMN_TYPE, '')
    OR COALESCE(s.IS_NULLABLE, '') <> COALESCE(t.IS_NULLABLE, '')
    OR COALESCE(s.COLUMN_DEFAULT, '__NULL__') <> COALESCE(t.COLUMN_DEFAULT, '__NULL__')
    OR COALESCE(s.EXTRA, '') <> COALESCE(t.EXTRA, '')
    OR COALESCE(s.COLUMN_COMMENT, '') <> COALESCE(t.COLUMN_COMMENT, '')
    OR COALESCE(s.CHARACTER_SET_NAME, '') <> COALESCE(t.CHARACTER_SET_NAME, '')
    OR COALESCE(s.COLLATION_NAME, '') <> COALESCE(t.COLLATION_NAME, '')
    OR COALESCE(s.GENERATION_EXPRESSION, '') <> COALESCE(t.GENERATION_EXPRESSION, '')
    OR s.ORDINAL_POSITION <> t.ORDINAL_POSITION
  )
ORDER BY s.TABLE_NAME, s.ORDINAL_POSITION;

-- ============================================================
-- 4. Missing indexes / unique constraints / primary keys
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS __source_indexes;
DROP TEMPORARY TABLE IF EXISTS __target_indexes;

CREATE TEMPORARY TABLE __source_indexes AS
SELECT
  TABLE_SCHEMA,
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  INDEX_TYPE,
  GROUP_CONCAT(
    CONCAT(
      '`', COLUMN_NAME, '`',
      IF(SUB_PART IS NOT NULL, CONCAT('(', SUB_PART, ')'), ''),
      IF(COLLATION = 'D', ' DESC', '')
    )
    ORDER BY SEQ_IN_INDEX
    SEPARATOR ', '
  ) AS column_list
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = @source_schema
GROUP BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE;

CREATE TEMPORARY TABLE __target_indexes AS
SELECT
  TABLE_SCHEMA,
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  INDEX_TYPE,
  GROUP_CONCAT(
    CONCAT(
      '`', COLUMN_NAME, '`',
      IF(SUB_PART IS NOT NULL, CONCAT('(', SUB_PART, ')'), ''),
      IF(COLLATION = 'D', ' DESC', '')
    )
    ORDER BY SEQ_IN_INDEX
    SEPARATOR ', '
  ) AS column_list
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = @target_schema
GROUP BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE;

INSERT INTO __schema_sync_output (change_type, table_name, object_name, generated_sql)
SELECT
  CASE
    WHEN s.INDEX_NAME = 'PRIMARY' THEN 'ADD_PRIMARY_KEY'
    WHEN s.NON_UNIQUE = 0 THEN 'ADD_UNIQUE_INDEX'
    ELSE 'ADD_INDEX'
  END AS change_type,
  s.TABLE_NAME,
  s.INDEX_NAME,
  CONCAT(
    'ALTER TABLE `', @target_schema, '`.`', s.TABLE_NAME, '` ADD ',
    CASE
      WHEN s.INDEX_NAME = 'PRIMARY' THEN CONCAT('PRIMARY KEY (', s.column_list, ')')
      WHEN s.NON_UNIQUE = 0 THEN CONCAT('UNIQUE KEY `', s.INDEX_NAME, '` (', s.column_list, ')')
      ELSE CONCAT('KEY `', s.INDEX_NAME, '` (', s.column_list, ')')
    END,
    ';'
  ) AS generated_sql
FROM __source_indexes s
LEFT JOIN __target_indexes t
  ON t.TABLE_NAME = s.TABLE_NAME
 AND t.INDEX_NAME = s.INDEX_NAME
WHERE t.INDEX_NAME IS NULL
  AND EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES tt
    WHERE tt.TABLE_SCHEMA = @target_schema
      AND tt.TABLE_NAME = s.TABLE_NAME
      AND tt.TABLE_TYPE = 'BASE TABLE'
  )
ORDER BY s.TABLE_NAME, s.INDEX_NAME;

-- ============================================================
-- 5. Missing foreign keys
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS __source_fks;
DROP TEMPORARY TABLE IF EXISTS __target_fks;

CREATE TEMPORARY TABLE __source_fks AS
SELECT
  k.CONSTRAINT_SCHEMA,
  k.TABLE_NAME,
  k.CONSTRAINT_NAME,
  k.REFERENCED_TABLE_NAME,
  GROUP_CONCAT(CONCAT('`', k.COLUMN_NAME, '`') ORDER BY k.ORDINAL_POSITION SEPARATOR ', ') AS column_list,
  GROUP_CONCAT(CONCAT('`', k.REFERENCED_COLUMN_NAME, '`') ORDER BY k.ORDINAL_POSITION SEPARATOR ', ') AS referenced_column_list,
  rc.UPDATE_RULE,
  rc.DELETE_RULE
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
 AND rc.TABLE_NAME = k.TABLE_NAME
WHERE k.CONSTRAINT_SCHEMA = @source_schema
  AND k.REFERENCED_TABLE_NAME IS NOT NULL
GROUP BY
  k.CONSTRAINT_SCHEMA,
  k.TABLE_NAME,
  k.CONSTRAINT_NAME,
  k.REFERENCED_TABLE_NAME,
  rc.UPDATE_RULE,
  rc.DELETE_RULE;

CREATE TEMPORARY TABLE __target_fks AS
SELECT
  k.CONSTRAINT_SCHEMA,
  k.TABLE_NAME,
  k.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
WHERE k.CONSTRAINT_SCHEMA = @target_schema
  AND k.REFERENCED_TABLE_NAME IS NOT NULL
GROUP BY k.CONSTRAINT_SCHEMA, k.TABLE_NAME, k.CONSTRAINT_NAME;

INSERT INTO __schema_sync_output (change_type, table_name, object_name, generated_sql)
SELECT
  'ADD_FOREIGN_KEY' AS change_type,
  s.TABLE_NAME,
  s.CONSTRAINT_NAME,
  CONCAT(
    'ALTER TABLE `', @target_schema, '`.`', s.TABLE_NAME, '` ',
    'ADD CONSTRAINT `', s.CONSTRAINT_NAME, '` ',
    'FOREIGN KEY (', s.column_list, ') ',
    'REFERENCES `', @target_schema, '`.`', s.REFERENCED_TABLE_NAME, '` (', s.referenced_column_list, ')',
    IF(s.DELETE_RULE IS NOT NULL AND s.DELETE_RULE <> 'RESTRICT', CONCAT(' ON DELETE ', s.DELETE_RULE), ''),
    IF(s.UPDATE_RULE IS NOT NULL AND s.UPDATE_RULE <> 'RESTRICT', CONCAT(' ON UPDATE ', s.UPDATE_RULE), ''),
    ';'
  ) AS generated_sql
FROM __source_fks s
LEFT JOIN __target_fks t
  ON t.TABLE_NAME = s.TABLE_NAME
 AND t.CONSTRAINT_NAME = s.CONSTRAINT_NAME
WHERE t.CONSTRAINT_NAME IS NULL
  AND EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES tt
    WHERE tt.TABLE_SCHEMA = @target_schema
      AND tt.TABLE_NAME = s.TABLE_NAME
      AND tt.TABLE_TYPE = 'BASE TABLE'
  )
ORDER BY s.TABLE_NAME, s.CONSTRAINT_NAME;

-- ============================================================
-- 6. Review generated output
-- ============================================================

SELECT
  id,
  change_type,
  table_name,
  object_name,
  generated_sql
FROM __schema_sync_output
ORDER BY id;

-- Optional convenience output:
-- This returns one copy-pasteable migration block.
SELECT GROUP_CONCAT(generated_sql ORDER BY id SEPARATOR '\n\n') AS full_generated_migration_sql
FROM __schema_sync_output;