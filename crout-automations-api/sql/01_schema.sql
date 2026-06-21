-- Crout Automations — Schema (MySQL 8.3)
CREATE DATABASE IF NOT EXISTS crout_automations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crout_automations;

CREATE TABLE IF NOT EXISTS Users (
  user_id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Username     VARCHAR(100) NOT NULL UNIQUE,
  PasswordHash VARCHAR(64)  NOT NULL COMMENT 'HMAC-SHA256 hex',
  FirstName    VARCHAR(100) NOT NULL,
  Surname      VARCHAR(100) NOT NULL,
  Email        VARCHAR(255) NOT NULL UNIQUE,
  CellNumber   VARCHAR(30)      NULL,
  Active       TINYINT(1)   NOT NULL DEFAULT 1,
  IsAdmin      TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  ServiceDescription TEXT               NULL
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

CREATE TABLE IF NOT EXISTS Packages (
  package_id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  parent_package_id     INT               NULL,
  PackageName           VARCHAR(255)  NOT NULL,
  PackageDescription    TEXT              NULL,
  Discount              DECIMAL(5,4)  NOT NULL DEFAULT 0,
  minimumRequiredAddons INT               NULL,
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
  Active          TINYINT(1)   NOT NULL DEFAULT 1,
  Status          TINYINT      NOT NULL DEFAULT 0 COMMENT '0=Disabled 1=InDevelopment 2=Live 3=Pending',
  CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_us_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_us_service FOREIGN KEY (service_id) REFERENCES Services(service_id),
  CONSTRAINT fk_us_package FOREIGN KEY (package_id) REFERENCES Packages(package_id) ON DELETE SET NULL
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
  service_trigger_config_id    INT NOT NULL,
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
