-- Active: 1781367621525@@localhost@3306@crout_automations
SET @add_template_workflow_id := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Integrations' AND COLUMN_NAME = 'template_workflow_id'),
    'SELECT 1',
    'ALTER TABLE Integrations ADD COLUMN template_workflow_id VARCHAR(255) NULL AFTER workflow_name'
  )
);
PREPARE stmt FROM @add_template_workflow_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_template_service_tag := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Integrations' AND COLUMN_NAME = 'template_service_tag'),
    'SELECT 1',
    'ALTER TABLE Integrations ADD COLUMN template_service_tag VARCHAR(255) NULL AFTER template_workflow_id'
  )
);
PREPARE stmt FROM @add_template_service_tag;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_template_version := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Integrations' AND COLUMN_NAME = 'template_version'),
    'SELECT 1',
    'ALTER TABLE Integrations ADD COLUMN template_version VARCHAR(255) NULL AFTER template_service_tag'
  )
);
PREPARE stmt FROM @add_template_version;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_template_snapshot_hash := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Integrations' AND COLUMN_NAME = 'template_snapshot_hash'),
    'SELECT 1',
    'ALTER TABLE Integrations ADD COLUMN template_snapshot_hash CHAR(64) NULL AFTER template_version'
  )
);
PREPARE stmt FROM @add_template_snapshot_hash;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_template_resolved_at := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Integrations' AND COLUMN_NAME = 'template_resolved_at'),
    'SELECT 1',
    'ALTER TABLE Integrations ADD COLUMN template_resolved_at DATETIME NULL AFTER template_snapshot_hash'
  )
);
PREPARE stmt FROM @add_template_resolved_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
