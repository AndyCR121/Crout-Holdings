USE crout_automations;

SET @schema_name := DATABASE();

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'ProfilePicture'
);

SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE Users ADD COLUMN ProfilePicture LONGTEXT NULL AFTER referral',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
