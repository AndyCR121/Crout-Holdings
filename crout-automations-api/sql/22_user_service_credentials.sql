CREATE TABLE IF NOT EXISTS UserServiceCredentials (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_service_id INT NOT NULL,
  company_id INT NOT NULL,
  integration_definition_id INT NOT NULL,
  encrypted_values TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Missing',
  n8n_credential_id VARCHAR(255) NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_service_credentials_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_service_credentials_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_service_credentials_definition FOREIGN KEY (integration_definition_id) REFERENCES IntegrationDefinitions(id) ON DELETE RESTRICT,
  UNIQUE KEY ux_user_service_credentials_definition (user_service_id, integration_definition_id),
  KEY ix_user_service_credentials_company (company_id)
);
