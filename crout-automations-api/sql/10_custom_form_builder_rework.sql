-- Active: 1781367621525@@localhost@3306@crout_automations
SET @schema_name := DATABASE();

SET @service_trigger_configs_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'ServiceTriggerConfigs'
);

SET @integrations_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Integrations'
);

SET @users_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Users'
);

SET @add_custom_form_title := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_title'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_title VARCHAR(255) NULL AFTER workflow_name'
    )
  )
);
PREPARE stmt FROM @add_custom_form_title;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_webhook_url := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_webhook_url'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_webhook_url TEXT NULL AFTER custom_form_title'
    )
  )
);
PREPARE stmt FROM @add_custom_form_webhook_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_draft_schema_json := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_draft_schema_json'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_draft_schema_json JSON NULL AFTER workflow_definition_json'
    )
  )
);
PREPARE stmt FROM @add_custom_form_draft_schema_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_schema_json := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_published_schema_json'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_schema_json JSON NULL AFTER custom_form_draft_schema_json'
    )
  )
);
PREPARE stmt FROM @add_custom_form_published_schema_json;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_version := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_version'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_version INT NOT NULL DEFAULT 0 AFTER custom_form_published_schema_json'
    )
  )
);
PREPARE stmt FROM @add_custom_form_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_by := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_published_by'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_by INT NULL AFTER custom_form_version'
    )
  )
);
PREPARE stmt FROM @add_custom_form_published_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_at := (
  SELECT IF(
    @integrations_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema_name
          AND TABLE_NAME = 'Integrations'
          AND COLUMN_NAME = 'custom_form_published_at'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD COLUMN custom_form_published_at DATETIME NULL AFTER custom_form_published_by'
    )
  )
);
PREPARE stmt FROM @add_custom_form_published_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_custom_form_published_by_fk := (
  SELECT IF(
    @integrations_exists = 0 OR @users_exists = 0,
    'SELECT 1',
    IF(
      EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = @schema_name
          AND CONSTRAINT_NAME = 'fk_integrations_custom_form_published_by'
      ),
      'SELECT 1',
      'ALTER TABLE Integrations ADD CONSTRAINT fk_integrations_custom_form_published_by FOREIGN KEY (custom_form_published_by) REFERENCES Users(user_id) ON DELETE SET NULL'
    )
  )
);
PREPARE stmt FROM @add_custom_form_published_by_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @cleanup_legacy_form_trigger_configs := IF(
  @service_trigger_configs_exists = 0,
  'SELECT 1',
  'DELETE FROM ServiceTriggerConfigs WHERE trigger_type = ''form'''
);
PREPARE stmt FROM @cleanup_legacy_form_trigger_configs;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @clear_legacy_trigger_draft_schemas := IF(
  @integrations_exists = 0,
  'SELECT 1',
  'UPDATE Integrations
   SET custom_form_title = NULL,
       custom_form_webhook_url = NULL,
       custom_form_draft_schema_json = NULL
   WHERE JSON_VALID(custom_form_draft_schema_json)
     AND JSON_UNQUOTE(JSON_EXTRACT(custom_form_draft_schema_json, ''$.triggerType'')) = ''form'''
);
PREPARE stmt FROM @clear_legacy_trigger_draft_schemas;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @clear_legacy_trigger_published_schemas := IF(
  @integrations_exists = 0,
  'SELECT 1',
  'UPDATE Integrations
   SET custom_form_published_schema_json = NULL,
       custom_form_version = 0,
       custom_form_published_by = NULL,
       custom_form_published_at = NULL
   WHERE JSON_VALID(custom_form_published_schema_json)
     AND JSON_UNQUOTE(JSON_EXTRACT(custom_form_published_schema_json, ''$.triggerType'')) = ''form'''
);
PREPARE stmt FROM @clear_legacy_trigger_published_schemas;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
