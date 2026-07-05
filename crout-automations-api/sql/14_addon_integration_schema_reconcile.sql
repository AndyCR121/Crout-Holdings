SET @schema_name := DATABASE();

CREATE TABLE IF NOT EXISTS ServiceAddons (
  service_id INT NOT NULL,
  addon_id   INT NOT NULL,
  PRIMARY KEY (service_id, addon_id),
  CONSTRAINT fk_service_addons_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_service_addons_addon FOREIGN KEY (addon_id) REFERENCES Addons(addon_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AddonIntegrations (
  addon_id                   INT NOT NULL,
  integration_definition_id  INT NOT NULL,
  PRIMARY KEY (addon_id, integration_definition_id),
  CONSTRAINT fk_addon_integrations_addon FOREIGN KEY (addon_id) REFERENCES Addons(addon_id) ON DELETE CASCADE,
  CONSTRAINT fk_addon_integrations_definition FOREIGN KEY (integration_definition_id) REFERENCES IntegrationDefinitions(id) ON DELETE CASCADE
);

INSERT IGNORE INTO ServiceAddons (service_id, addon_id)
SELECT service_id, addon_id
FROM Addons
WHERE service_id IS NOT NULL;
