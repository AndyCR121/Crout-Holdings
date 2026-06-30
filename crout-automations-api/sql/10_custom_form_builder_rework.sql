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
