USE crout_automations;

SET @add_services_active = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Services' AND COLUMN_NAME = 'Active'
  ),
  'SELECT ''Services.Active already exists''',
  'ALTER TABLE Services ADD COLUMN Active TINYINT(1) NOT NULL DEFAULT 1 AFTER Conditional'
);
PREPARE stmt FROM @add_services_active;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_packages_active = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Packages' AND COLUMN_NAME = 'Active'
  ),
  'SELECT ''Packages.Active already exists''',
  'ALTER TABLE Packages ADD COLUMN Active TINYINT(1) NOT NULL DEFAULT 1 AFTER minimumRequiredAddons'
);
PREPARE stmt FROM @add_packages_active;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
