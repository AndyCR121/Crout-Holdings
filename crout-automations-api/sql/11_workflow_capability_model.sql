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

CREATE TABLE IF NOT EXISTS ServiceWorkflowCapabilities (
  id                         INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id                 INT            NOT NULL,
  role                       VARCHAR(20)    NOT NULL,
  capability_type            VARCHAR(120)   NOT NULL,
  name                       VARCHAR(255)   NOT NULL,
  description                TEXT               NULL,
  price                      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  display_order              INT            NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)     NOT NULL DEFAULT 1,
  integration_id             INT                NULL,
  requires_credentials       TINYINT(1)     NOT NULL DEFAULT 0,
  configuration_schema_json  JSON               NULL,
  created_at                 DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_capability_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_capability_integration FOREIGN KEY (integration_id) REFERENCES IntegrationDefinitions(id) ON DELETE SET NULL,
  UNIQUE KEY ux_workflow_capability_service_role_name (service_id, role, name),
  KEY ix_workflow_capability_service (service_id)
);

CREATE TABLE IF NOT EXISTS UserServiceWorkflowSteps (
  id                              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_service_id                 INT          NOT NULL,
  service_id                      INT          NOT NULL,
  service_workflow_capability_id  INT          NOT NULL,
  role                            VARCHAR(20)  NOT NULL,
  capability_type                 VARCHAR(120) NOT NULL,
  integration_id                  INT              NULL,
  status                          VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  configuration_json              JSON             NULL,
  credential_values_json          LONGTEXT         NULL,
  confirmed_at                    DATETIME         NULL,
  confirmed_by_user_id            INT              NULL,
  created_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_step_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_step_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_step_capability FOREIGN KEY (service_workflow_capability_id) REFERENCES ServiceWorkflowCapabilities(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_step_integration FOREIGN KEY (integration_id) REFERENCES IntegrationDefinitions(id) ON DELETE SET NULL,
  CONSTRAINT fk_workflow_step_confirmed_by FOREIGN KEY (confirmed_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
  UNIQUE KEY ux_workflow_step_user_service_capability (user_service_id, service_workflow_capability_id),
  KEY ix_workflow_step_user_service (user_service_id),
  KEY ix_workflow_step_role (role),
  KEY ix_workflow_step_status (status)
);

CREATE TABLE IF NOT EXISTS UserServiceCustomForms (
  id                      INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_service_id         INT         NOT NULL,
  workflow_step_id        INT         NOT NULL,
  form_schema_json        JSON        NOT NULL,
  production_webhook_url  TEXT            NULL,
  is_active               TINYINT(1)  NOT NULL DEFAULT 1,
  created_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_form_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_form_workflow_step FOREIGN KEY (workflow_step_id) REFERENCES UserServiceWorkflowSteps(id) ON DELETE CASCADE,
  UNIQUE KEY ux_custom_form_user_service (user_service_id)
);
