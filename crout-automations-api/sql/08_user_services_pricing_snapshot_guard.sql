USE crout_automations;

SET @schema_name = DATABASE();

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'subscriptionAmount'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN subscriptionAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER Config',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'pricingSnapshot'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN pricingSnapshot JSON NULL AFTER subscriptionAmount',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'paymentDate'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN paymentDate DATETIME NULL AFTER pricingSnapshot',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'dueDate'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN dueDate DATETIME NULL AFTER paymentDate',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
