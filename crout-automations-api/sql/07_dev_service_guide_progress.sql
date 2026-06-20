SET @schema_name := DATABASE();

SET @add_dev_guide_step := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE UserServices ADD COLUMN devGuideStep TINYINT NOT NULL DEFAULT 0 AFTER pricingSnapshot',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'devGuideStep'
);

PREPARE stmt FROM @add_dev_guide_step;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_is_maintenance := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE UserServices ADD COLUMN isMaintenance TINYINT(1) NOT NULL DEFAULT 0 AFTER devGuideStep',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'UserServices'
    AND COLUMN_NAME = 'isMaintenance'
);

PREPARE stmt FROM @add_is_maintenance;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
