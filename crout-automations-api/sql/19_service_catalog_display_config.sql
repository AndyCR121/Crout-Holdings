USE crout_automations;

SET @add_display_name = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Services'
      AND COLUMN_NAME = 'DisplayName'
  ),
  'SELECT ''Services.DisplayName already exists''',
  'ALTER TABLE Services ADD COLUMN DisplayName VARCHAR(255) NULL AFTER ServiceDescription'
);
PREPARE stmt FROM @add_display_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_display_tagline = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Services'
      AND COLUMN_NAME = 'DisplayTagline'
  ),
  'SELECT ''Services.DisplayTagline already exists''',
  'ALTER TABLE Services ADD COLUMN DisplayTagline VARCHAR(255) NULL AFTER DisplayName'
);
PREPARE stmt FROM @add_display_tagline;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_icon_key = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Services'
      AND COLUMN_NAME = 'IconKey'
  ),
  'SELECT ''Services.IconKey already exists''',
  'ALTER TABLE Services ADD COLUMN IconKey VARCHAR(100) NULL AFTER DisplayTagline'
);
PREPARE stmt FROM @add_icon_key;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_icon_svg = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Services'
      AND COLUMN_NAME = 'IconSvg'
  ),
  'SELECT ''Services.IconSvg already exists''',
  'ALTER TABLE Services ADD COLUMN IconSvg MEDIUMTEXT NULL AFTER IconKey'
);
PREPARE stmt FROM @add_icon_svg;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_display_order = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Services'
      AND COLUMN_NAME = 'DisplayOrder'
  ),
  'SELECT ''Services.DisplayOrder already exists''',
  'ALTER TABLE Services ADD COLUMN DisplayOrder INT NULL AFTER IconSvg'
);
PREPARE stmt FROM @add_display_order;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE Services
SET
  DisplayName = COALESCE(NULLIF(DisplayName, ''), ServiceName),
  DisplayTagline = COALESCE(NULLIF(DisplayTagline, ''), NULLIF(ServiceDescription, '')),
  IconKey = COALESCE(NULLIF(IconKey, ''), CASE
    WHEN LOWER(ServiceName) LIKE '%quote%' THEN 'quote-system'
    WHEN LOWER(ServiceName) LIKE '%whatsapp%' THEN 'whatsapp-agent'
    WHEN LOWER(ServiceName) LIKE '%project%' THEN 'project-management'
    WHEN LOWER(ServiceName) LIKE '%marketing%' THEN 'marketing-systems'
    WHEN LOWER(ServiceName) LIKE '%policy%' THEN 'policy-comparison'
    ELSE NULL
  END),
  DisplayOrder = COALESCE(DisplayOrder, service_id);
