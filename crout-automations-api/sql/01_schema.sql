-- Crout Automations — Schema (MySQL 8.3)
CREATE DATABASE IF NOT EXISTS crout_automations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crout_automations;

CREATE TABLE IF NOT EXISTS Users (
  user_id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Username     VARCHAR(100) NOT NULL UNIQUE,
  PasswordHash VARCHAR(64)  NOT NULL COMMENT 'HMAC-SHA256 hex',
  token_version INT         NOT NULL DEFAULT 0,
  FirstName    VARCHAR(100) NOT NULL,
  Surname      VARCHAR(100) NOT NULL,
  Email        VARCHAR(255) NOT NULL UNIQUE,
  CellNumber   VARCHAR(30)      NULL,
  Active       TINYINT(1)   NOT NULL DEFAULT 1,
  IsAdmin      TINYINT(1)   NOT NULL DEFAULT 0,
  isDev        TINYINT(1)   NOT NULL DEFAULT 0,
  referral     VARCHAR(100)     NULL,
  ProfilePicture LONGTEXT       NULL,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_referral (referral),
  KEY idx_users_isDev (isDev)
);

CREATE TABLE IF NOT EXISTS Companies (
  company_id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id            INT          NOT NULL,
  CompanyName        VARCHAR(255) NOT NULL,
  Industry           VARCHAR(255)     NULL,
  VATNumber          VARCHAR(50)      NULL,
  RegistrationNumber VARCHAR(50)      NULL,
  Email              VARCHAR(255)     NULL,
  Phone              VARCHAR(50)      NULL,
  Address            TEXT             NULL,
  Active             TINYINT(1)   NOT NULL DEFAULT 1,
  CreatedAt          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Services (
  service_id         INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ServiceName        VARCHAR(255)   NOT NULL,
  Price              DECIMAL(10,2)  NOT NULL,
  HasAddons          TINYINT(1)     NOT NULL DEFAULT 0,
  Conditional        TINYINT(1)     NOT NULL DEFAULT 0,
  Active             TINYINT(1)     NOT NULL DEFAULT 1,
  ServiceDescription TEXT               NULL,
  DisplayName        VARCHAR(255)       NULL,
  DisplayTagline     VARCHAR(255)       NULL,
  IconKey            VARCHAR(100)       NULL,
  IconSvg            MEDIUMTEXT         NULL,
  DisplayOrder       INT                NULL
);

CREATE TABLE IF NOT EXISTS ServiceFeatures (
  feature_id INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id INT          NOT NULL,
  Feature    VARCHAR(255) NOT NULL,
  SortOrder  INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_feature_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Addons (
  addon_id         INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id       INT            NOT NULL,
  AddonName        VARCHAR(255)   NOT NULL,
  AddonDescription TEXT               NULL,
  Price            DECIMAL(10,2)  NOT NULL,
  CONSTRAINT fk_addon_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PricingComponents (
  pricing_component_id INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  component_key        VARCHAR(100)  NOT NULL UNIQUE,
  component_name       VARCHAR(255)  NOT NULL,
  category             VARCHAR(100)  NOT NULL,
  pricing_type         VARCHAR(50)   NOT NULL DEFAULT 'fixed',
  amount               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_required_default  TINYINT(1)    NOT NULL DEFAULT 0,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pricing_components_category (category),
  KEY idx_pricing_components_active (is_active)
);

CREATE TABLE IF NOT EXISTS Packages (
  package_id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_package_id     INT               NULL,
  PackageName           VARCHAR(255)  NOT NULL,
  PackageDescription    TEXT              NULL,
  Discount              DECIMAL(5,4)  NOT NULL DEFAULT 0,
  minimumRequiredAddons INT               NULL,
  Active                TINYINT(1)     NOT NULL DEFAULT 1,
  CONSTRAINT fk_package_parent FOREIGN KEY (parent_package_id) REFERENCES Packages(package_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS PackageServices (
  package_id INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (package_id, service_id),
  CONSTRAINT fk_ps_package FOREIGN KEY (package_id) REFERENCES Packages(package_id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS UserServices (
  id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id      INT          NOT NULL,
  service_id      INT          NOT NULL,
  package_id      INT              NULL,
  subscription_id VARCHAR(255)     NULL,
  Config          JSON             NULL,
  subscriptionAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    pricingSnapshot JSON             NULL,
    devGuideStep    TINYINT      NOT NULL DEFAULT 0,
    isMaintenance   TINYINT(1)   NOT NULL DEFAULT 0,
    paymentDate     DATETIME         NULL,
  dueDate         DATETIME         NULL,
  Active          TINYINT(1)   NOT NULL DEFAULT 1,
  Status          TINYINT      NOT NULL DEFAULT 0 COMMENT '0=Disabled 1=InDevelopment 2=Live 3=Pending',
  CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_us_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_us_service FOREIGN KEY (service_id) REFERENCES Services(service_id),
  CONSTRAINT fk_us_package FOREIGN KEY (package_id) REFERENCES Packages(package_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Integrations (
  integration_id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_service_id           INT          NOT NULL,
  company_id                INT          NOT NULL,
  workflow_id               VARCHAR(255)     NULL,
  workflow_name             VARCHAR(255) NOT NULL,
  custom_form_title         VARCHAR(255)     NULL,
  custom_form_webhook_url   TEXT             NULL,
  status                    VARCHAR(20)  NOT NULL DEFAULT 'Development',
  published_by              INT              NULL,
  published_date            DATETIME         NULL,
  paused_by                 INT              NULL,
  paused_date               DATETIME         NULL,
  last_error                TEXT             NULL,
  node_mappings_json        JSON             NULL,
  workflow_definition_json  JSON             NULL,
  custom_form_draft_schema_json JSON        NULL,
  custom_form_published_schema_json JSON    NULL,
  custom_form_version       INT          NOT NULL DEFAULT 0,
  custom_form_published_by  INT              NULL,
  custom_form_published_at  DATETIME         NULL,
  createdAt                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_integrations_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  CONSTRAINT fk_integrations_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_integrations_published_by FOREIGN KEY (published_by) REFERENCES Users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_integrations_paused_by FOREIGN KEY (paused_by) REFERENCES Users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_integrations_custom_form_published_by FOREIGN KEY (custom_form_published_by) REFERENCES Users(user_id) ON DELETE SET NULL,
  UNIQUE KEY ux_integrations_user_service (user_service_id),
  KEY ix_integrations_company_status (company_id, status)
);

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

CREATE TABLE IF NOT EXISTS DevServices (
  devServiceId   INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId         INT           NOT NULL,
  userServiceId  INT           NOT NULL,
  commissionPerc DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
  cost           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  totalCommission DECIMAL(12,2)
    GENERATED ALWAYS AS (ROUND(cost * (commissionPerc / 100), 2)) STORED,
  isActive       TINYINT(1)    NOT NULL DEFAULT 1,
  activeUserServiceId INT
    GENERATED ALWAYS AS (CASE WHEN isActive = 1 THEN userServiceId ELSE NULL END) STORED,
  createdAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_devservices_user FOREIGN KEY (userId) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_devservices_userservice FOREIGN KEY (userServiceId) REFERENCES UserServices(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_devservices_active_userServiceId (activeUserServiceId),
  KEY idx_devservices_userId (userId),
  KEY idx_devservices_userServiceId (userServiceId)
);

CREATE TABLE IF NOT EXISTS ServiceRequests (
  request_id  INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id  INT         NOT NULL,
  service_id  INT         NOT NULL,
  package_id  INT             NULL,
  RequestNote TEXT            NULL,
  Status      VARCHAR(50) NOT NULL DEFAULT 'Pending',
  CreatedAt   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_req_service FOREIGN KEY (service_id) REFERENCES Services(service_id),
  CONSTRAINT fk_req_package FOREIGN KEY (package_id) REFERENCES Packages(package_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ServiceTriggerConfigs (
  service_trigger_config_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id                INT NOT NULL,
  user_service_id           INT NULL,
  workflow_id               VARCHAR(255) NULL,
  trigger_type              VARCHAR(40) NOT NULL,
  Label                     VARCHAR(255) NOT NULL,
  Description               TEXT NULL,
  endpoint_path             VARCHAR(500) NULL,
  method                    VARCHAR(10) NOT NULL DEFAULT 'POST',
  requires_confirmation     TINYINT(1) NOT NULL DEFAULT 0,
  payload_template          JSON NULL,
  fields_json               JSON NULL,
  file_upload_json          JSON NULL,
  response_mode             VARCHAR(30) NOT NULL DEFAULT 'inline',
  is_active                 TINYINT(1) NOT NULL DEFAULT 1,
  sort_order                INT NOT NULL DEFAULT 0,
  CreatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_trigger_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_trigger_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  UNIQUE KEY ux_trigger_service_type_label (service_id, trigger_type, Label),
  INDEX ix_trigger_service_active (service_id, is_active),
  INDEX ix_trigger_user_service_active (user_service_id, is_active)
);

CREATE TABLE IF NOT EXISTS ServiceTriggerExecutions (
  service_trigger_execution_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_trigger_config_id    INT NULL,
  user_id                      INT NOT NULL,
  company_id                   INT NOT NULL,
  user_service_id              INT NULL,
  request_payload              JSON NULL,
  response_payload             JSON NULL,
  Status                       VARCHAR(40) NOT NULL DEFAULT 'queued',
  mode                         VARCHAR(20) NOT NULL DEFAULT 'mock',
  error_message                TEXT NULL,
  CreatedAt                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exec_config FOREIGN KEY (service_trigger_config_id) REFERENCES ServiceTriggerConfigs(service_trigger_config_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE SET NULL,
  INDEX ix_exec_company_created (company_id, CreatedAt),
  INDEX ix_exec_user_service_created (user_service_id, CreatedAt)
);

CREATE TABLE IF NOT EXISTS VideoProjects (
  video_project_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id       INT NOT NULL,
  user_service_id  INT NULL,
  service_id       INT NOT NULL,
  Title            VARCHAR(255) NOT NULL,
  Status           VARCHAR(40) NOT NULL DEFAULT 'draft',
  scheduled_for    DATETIME NULL,
  platform         VARCHAR(40) NOT NULL DEFAULT 'instagram',
  output_url       VARCHAR(1000) NULL,
  metadata_json    JSON NULL,
  timeline_json    JSON NULL,
  timeline_version INT NOT NULL DEFAULT 1,
  CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_video_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_video_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE SET NULL,
  CONSTRAINT fk_video_service FOREIGN KEY (service_id) REFERENCES Services(service_id),
  INDEX ix_video_company_schedule (company_id, scheduled_for),
  INDEX ix_video_user_service (user_service_id)
);

CREATE TABLE IF NOT EXISTS ContactRequests (
    contact_request_id INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Name               VARCHAR(160) NOT NULL,
    Email              VARCHAR(255) NOT NULL,
    Phone              VARCHAR(50)      NULL,
    Business           VARCHAR(160)     NULL,
    Service            VARCHAR(255) NOT NULL,
    Message            TEXT         NOT NULL,
    Referral           VARCHAR(64)      NULL,
    ConfigJson         JSON             NULL,
    Source             VARCHAR(255)     NULL,
    EmailSent          TINYINT(1)   NOT NULL DEFAULT 0,
    CreatedAt          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_contact_requests_email (Email),
  KEY idx_contact_requests_created (CreatedAt)
  );

CREATE TABLE IF NOT EXISTS PasswordResetOtps (
  password_reset_otp_id INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reset_request_id      CHAR(36)    NOT NULL,
  user_id               INT         NOT NULL,
  otp_hash              VARCHAR(64) NOT NULL COMMENT 'HMAC-SHA256 hex',
  attempt_count         TINYINT     NOT NULL DEFAULT 0,
  expires_at            DATETIME    NOT NULL,
  verified_at           DATETIME        NULL,
  consumed_at           DATETIME        NULL,
  invalidated_at        DATETIME        NULL,
  created_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  KEY idx_password_reset_request (reset_request_id),
  KEY idx_password_reset_user (user_id, created_at)
);
