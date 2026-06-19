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
  isDev        TINYINT(1)   NOT NULL DEFAULT 0,
  referral     VARCHAR(100)     NULL,
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

CREATE TABLE IF NOT EXISTS DevServices (
  devServiceId   INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId         INT           NOT NULL,
  userServiceId  INT           NOT NULL,
  commissionPerc DECIMAL(5,2)  NOT NULL DEFAULT 20.00,
  cost           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  totalCommission DECIMAL(12,2)
    GENERATED ALWAYS AS (ROUND(cost * (commissionPerc / 100), 2)) STORED,
  isActive       TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_devservices_user FOREIGN KEY (userId) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_devservices_userservice FOREIGN KEY (userServiceId) REFERENCES UserServices(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_devservices_userServiceId (userServiceId),
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
