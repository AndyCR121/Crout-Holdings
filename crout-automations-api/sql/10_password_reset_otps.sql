-- Active: 1781367621525@@localhost@3306@crout_automations
SET @schema_name = DATABASE();

SET @add_token_version_sql = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema_name
        AND TABLE_NAME = 'Users'
        AND COLUMN_NAME = 'token_version'
    ),
    'SELECT 1',
    'ALTER TABLE Users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER PasswordHash'
  )
);
PREPARE add_token_version_stmt FROM @add_token_version_sql;
EXECUTE add_token_version_stmt;
DEALLOCATE PREPARE add_token_version_stmt;

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
