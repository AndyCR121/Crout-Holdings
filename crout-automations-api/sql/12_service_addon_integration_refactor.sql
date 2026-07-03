USE crout_automations;

SET @schema_name := DATABASE();

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Services'
    AND COLUMN_NAME = 'BaseCost'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Services ADD COLUMN BaseCost DECIMAL(12,2) NOT NULL DEFAULT 5000.00 AFTER ServiceName',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Services'
    AND COLUMN_NAME = 'TokensCost'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Services ADD COLUMN TokensCost DECIMAL(12,2) NOT NULL DEFAULT 1000.00 AFTER BaseCost',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Services'
    AND COLUMN_NAME = 'TotalTokens'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Services ADD COLUMN TotalTokens BIGINT NOT NULL DEFAULT 6000000 AFTER TokensCost',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Services
SET BaseCost = CASE
      WHEN BaseCost = 5000.00 AND Price <> 0 THEN Price
      ELSE BaseCost
    END,
    TokensCost = CASE
      WHEN TokensCost = 1000.00 AND Price <> 0 THEN 0.00
      ELSE TokensCost
    END
WHERE Price IS NOT NULL;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Addons'
    AND COLUMN_NAME = 'Type'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Addons ADD COLUMN Type VARCHAR(20) NOT NULL DEFAULT ''Action'' AFTER AddonDescription',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Addons'
    AND COLUMN_NAME = 'MonthlyPrice'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Addons ADD COLUMN MonthlyPrice DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER Type',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Addons'
    AND COLUMN_NAME = 'IsActive'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Addons ADD COLUMN IsActive TINYINT(1) NOT NULL DEFAULT 1 AFTER MonthlyPrice',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Addons'
    AND COLUMN_NAME = 'DisplayOrder'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Addons ADD COLUMN DisplayOrder INT NOT NULL DEFAULT 0 AFTER IsActive',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Addons
SET MonthlyPrice = CASE
      WHEN MonthlyPrice = 0.00 AND Price <> 0 THEN Price
      ELSE MonthlyPrice
    END;

CREATE TABLE IF NOT EXISTS ServiceAddons (
  service_id INT NOT NULL,
  addon_id   INT NOT NULL,
  PRIMARY KEY (service_id, addon_id),
  CONSTRAINT fk_service_addons_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_service_addons_addon FOREIGN KEY (addon_id) REFERENCES Addons(addon_id) ON DELETE CASCADE
);

INSERT IGNORE INTO ServiceAddons (service_id, addon_id)
SELECT service_id, addon_id
FROM Addons
WHERE service_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS AddonIntegrations (
  addon_id                   INT NOT NULL,
  integration_definition_id  INT NOT NULL,
  PRIMARY KEY (addon_id, integration_definition_id),
  CONSTRAINT fk_addon_integrations_addon FOREIGN KEY (addon_id) REFERENCES Addons(addon_id) ON DELETE CASCADE,
  CONSTRAINT fk_addon_integrations_definition FOREIGN KEY (integration_definition_id) REFERENCES IntegrationDefinitions(id) ON DELETE CASCADE
);
