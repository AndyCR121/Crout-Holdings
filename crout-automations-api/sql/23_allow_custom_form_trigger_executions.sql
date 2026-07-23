-- Custom-form triggers are generated dynamically from an Integration record and do
-- not have a persisted ServiceTriggerConfigs row. Preserve their execution history
-- through user_service_id while allowing the configuration reference to be null.
ALTER TABLE ServiceTriggerExecutions
  DROP FOREIGN KEY fk_exec_config;

ALTER TABLE ServiceTriggerExecutions
  MODIFY service_trigger_config_id INT NULL;

ALTER TABLE ServiceTriggerExecutions
  ADD CONSTRAINT fk_exec_config
    FOREIGN KEY (service_trigger_config_id)
    REFERENCES ServiceTriggerConfigs(service_trigger_config_id)
    ON DELETE CASCADE;
