SET @schema_name := DATABASE();

CREATE TABLE IF NOT EXISTS IntegrationDefinitions (
  id                           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                         VARCHAR(255) NOT NULL,
  description                  TEXT             NULL,
  integration_type             VARCHAR(120) NOT NULL,
  has_credentials              TINYINT(1)   NOT NULL DEFAULT 0,
  credential_form_schema_json  JSON             NULL,
  is_active                    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_integration_definitions_name (name),
  KEY ix_integration_definitions_active (is_active)
);

SET @add_description_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'description'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN description TEXT NULL AFTER name'
  )
);
PREPARE stmt FROM @add_description_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_integration_type_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'integration_type'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN integration_type VARCHAR(120) NOT NULL DEFAULT ''generic'' AFTER description'
  )
);
PREPARE stmt FROM @add_integration_type_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_has_credentials_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'has_credentials'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN has_credentials TINYINT(1) NOT NULL DEFAULT 0 AFTER integration_type'
  )
);
PREPARE stmt FROM @add_has_credentials_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_credential_form_schema_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'credential_form_schema_json'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN credential_form_schema_json JSON NULL AFTER has_credentials'
  )
);
PREPARE stmt FROM @add_credential_form_schema_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_is_active_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'is_active'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER credential_form_schema_json'
  )
);
PREPARE stmt FROM @add_is_active_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_created_at_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'created_at'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active'
  )
);
PREPARE stmt FROM @add_created_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_updated_at_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND COLUMN_NAME = 'updated_at'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
  )
);
PREPARE stmt FROM @add_updated_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_name_unique_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND INDEX_NAME = 'ux_integration_definitions_name'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD CONSTRAINT ux_integration_definitions_name UNIQUE (name)'
  )
);
PREPARE stmt FROM @add_name_unique_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_active_index_sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'IntegrationDefinitions'
        AND INDEX_NAME = 'ix_integration_definitions_active'
    ),
    'SELECT 1',
    'ALTER TABLE IntegrationDefinitions ADD INDEX ix_integration_definitions_active (is_active)'
  )
);
PREPARE stmt FROM @add_active_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
