USE crout_automations;

CREATE TABLE IF NOT EXISTS PricingComponents (
  pricing_component_id INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  component_key        VARCHAR(100)  NOT NULL UNIQUE,
  component_name       VARCHAR(255)  NOT NULL,
  category             VARCHAR(100)  NOT NULL,
  pricing_type         VARCHAR(50)   NOT NULL DEFAULT 'fixed',
  amount               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_required_default  TINYINT(1)    NOT NULL DEFAULT 0,
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  createdAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pricing_components_category (category),
  KEY idx_pricing_components_active (is_active)
);

INSERT INTO PricingComponents
  (component_key, component_name, category, pricing_type, amount, is_required_default, is_active)
VALUES
  ('ai_usage_base_6m_tokens','AI Usage Base (6M bundled tokens)','ai_usage','fixed',1000.00,1,1),
  ('integration_email','Email / Gmail / IMAP','integration','fixed',500.00,0,1),
  ('integration_trello_jira','Trello / Jira','integration','from_price',1000.00,0,1),
  ('integration_drive_client','Google Drive (client-shared environment)','integration','fixed',300.00,0,1),
  ('integration_drive_crout','Google Drive (Crout-managed environment)','integration','fixed',600.00,0,1),
  ('integration_whatsapp','WhatsApp Integration','integration','fixed',2000.00,0,1),
  ('whatsapp_marketing_500','WhatsApp Marketing Messages (per 500)','whatsapp_billing','usage_block',2000.00,0,1),
  ('whatsapp_utility_500','WhatsApp Utility Messages (per 500)','whatsapp_billing','usage_block',800.00,0,1),
  ('whatsapp_authentication_500','WhatsApp Authentication Messages (per 500)','whatsapp_billing','usage_block',600.00,0,1),
  ('whatsapp_service_response','WhatsApp Service Response (client initiated)','whatsapp_billing','usage_block',0.00,0,1),
  ('report_template','Template Report','reporting','fixed',500.00,0,1),
  ('report_complex_template','Template Complex Report','reporting','fixed',1000.00,0,1),
  ('report_custom_new','Brand-New Custom Report','reporting','fixed',2000.00,0,1),
  ('dashboard_standard','Dashboard Integration','dashboard','fixed',500.00,0,1),
  ('dashboard_custom_jwt','Custom Dashboard Integration (JWT)','dashboard','fixed',1000.00,0,1),
  ('complexity_insurance_grade','Insurance-Grade Workflows','complexity','percentage_uplift',30.00,0,1)
ON DUPLICATE KEY UPDATE
  component_name = VALUES(component_name),
  category = VALUES(category),
  pricing_type = VALUES(pricing_type),
  amount = VALUES(amount),
  is_required_default = VALUES(is_required_default),
  is_active = VALUES(is_active);

SET @schema_name = DATABASE();

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'UserServices' AND COLUMN_NAME = 'subscriptionAmount'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN subscriptionAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER Config',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'UserServices' AND COLUMN_NAME = 'pricingSnapshot'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN pricingSnapshot JSON NULL AFTER subscriptionAmount',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'UserServices' AND COLUMN_NAME = 'paymentDate'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN paymentDate DATETIME NULL AFTER pricingSnapshot',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'UserServices' AND COLUMN_NAME = 'dueDate'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE UserServices ADD COLUMN dueDate DATETIME NULL AFTER paymentDate',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE Services SET Price = 5000.00 WHERE Price < 5000.00;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'DevServices' AND INDEX_NAME = 'uq_devservices_userService_active'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE DevServices ADD UNIQUE KEY uq_devservices_userService_active (userServiceId, isActive)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'DevServices' AND INDEX_NAME = 'uq_devservices_userServiceId'
);
SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE DevServices DROP INDEX uq_devservices_userServiceId',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'DevServices' AND INDEX_NAME = 'uq_devservices_active_userServiceId'
);
SET @sql = IF(@idx_exists = 0,
  'SELECT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE UserServices us
JOIN Services s ON s.service_id = us.service_id
SET
  us.subscriptionAmount = s.Price + 1000.00,
  us.pricingSnapshot = JSON_OBJECT(
    'baseWorkflow', s.Price,
    'requiredComponents', JSON_ARRAY(JSON_OBJECT('key', 'ai_usage_base_6m_tokens', 'amount', 1000.00)),
    'total', s.Price + 1000.00
  ),
  us.paymentDate = COALESCE(us.paymentDate, us.CreatedAt),
  us.dueDate = COALESCE(us.dueDate, DATE_ADD(COALESCE(us.paymentDate, us.CreatedAt), INTERVAL 30 DAY))
WHERE us.subscriptionAmount = 0.00 OR us.subscriptionAmount IS NULL;

UPDATE DevServices ds
JOIN UserServices us ON us.id = ds.userServiceId
SET ds.cost = us.subscriptionAmount
WHERE ds.cost = 0.00;
