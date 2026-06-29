SET @schema_name := DATABASE();
SET @integrations_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
);

SET @add_custom_form_title := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_title VARCHAR(255) NULL AFTER workflow_name',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_title'
);

PREPARE stmt FROM @add_custom_form_title;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_webhook_url := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_webhook_url TEXT NULL AFTER custom_form_title',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_webhook_url'
);

PREPARE stmt FROM @add_custom_form_webhook_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_draft_schema_json := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_draft_schema_json JSON NULL AFTER workflow_definition_json',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_draft_schema_json'
);

PREPARE stmt FROM @add_custom_form_draft_schema_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_schema_json := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_schema_json JSON NULL AFTER custom_form_draft_schema_json',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_published_schema_json'
);

PREPARE stmt FROM @add_custom_form_published_schema_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_version := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_version INT NOT NULL DEFAULT 0 AFTER custom_form_published_schema_json',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_version'
);

PREPARE stmt FROM @add_custom_form_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_by := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_by INT NULL AFTER custom_form_version',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_published_by'
);

PREPARE stmt FROM @add_custom_form_published_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_at := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_at DATETIME NULL AFTER custom_form_published_by',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND COLUMN_NAME = 'custom_form_published_at'
);

PREPARE stmt FROM @add_custom_form_published_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_by_fk := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      COUNT(*) = 0,
      'ALTER TABLE Integrations ADD CONSTRAINT fk_integrations_custom_form_published_by FOREIGN KEY (custom_form_published_by) REFERENCES Users(user_id) ON DELETE SET NULL',
      'SELECT 1'
    )
  )
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
    AND CONSTRAINT_NAME = 'fk_integrations_custom_form_published_by'
);

PREPARE stmt FROM @add_custom_form_published_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
