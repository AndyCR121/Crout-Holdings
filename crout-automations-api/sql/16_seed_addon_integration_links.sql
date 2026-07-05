INSERT IGNORE INTO AddonIntegrations (addon_id, integration_definition_id)
SELECT a.addon_id, i.id
FROM Addons a
JOIN IntegrationDefinitions i ON i.name = 'Google Sheets Trigger'
WHERE a.AddonName = 'Custom Setup'
  AND a.service_id = 3;

INSERT IGNORE INTO AddonIntegrations (addon_id, integration_definition_id)
SELECT a.addon_id, i.id
FROM Addons a
JOIN IntegrationDefinitions i ON i.name = 'Google Sheets Action'
WHERE a.AddonName = 'Payroll Excel Generation'
  AND a.service_id = 3;

INSERT IGNORE INTO AddonIntegrations (addon_id, integration_definition_id)
SELECT a.addon_id, i.id
FROM Addons a
JOIN IntegrationDefinitions i ON i.name = 'IMAP Trigger'
WHERE a.AddonName = 'Custom Setup'
  AND a.service_id = 3;
