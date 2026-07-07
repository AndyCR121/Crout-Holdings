USE crout_automations;

SET @schema_name := DATABASE();

-- Preflight: review these result sets before running the destructive/index steps below.
SELECT userServiceId, isActive, COUNT(*) AS duplicate_count
FROM DevServices
GROUP BY userServiceId, isActive
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS null_subscription_amounts
FROM UserServices
WHERE subscriptionAmount IS NULL;

-- Services: add missing pricing columns and align existing rows to the current model.
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

-- Addons: add missing merchandising columns and backfill MonthlyPrice from the legacy Price field.
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

-- UserServices: normalize existing values before tightening the column definition.
UPDATE UserServices
SET subscriptionAmount = 0.00
WHERE subscriptionAmount IS NULL;

ALTER TABLE UserServices
  MODIFY COLUMN subscriptionAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- DevServices: add the composite uniqueness rule expected by source.
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'DevServices'
    AND INDEX_NAME = 'uq_devservices_userService_active'
);
SET @sql = IF(
  @idx_exists = 0,
  'ALTER TABLE DevServices ADD UNIQUE KEY uq_devservices_userService_active (userServiceId, isActive)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Optional/manual: only run this if you explicitly want production to match source exactly.
-- The existing unique key on userServiceId is stricter than source and may be intentionally preserved.
-- ALTER TABLE DevServices DROP INDEX uq_devservices_userServiceId;

-- Intentional no-op: SchemaMigrations exists only in target and should usually be preserved.
-- DROP TABLE SchemaMigrations;
