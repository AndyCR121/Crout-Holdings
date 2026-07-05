INSERT INTO IntegrationDefinitions
  (name, description, integration_type, has_credentials, credential_form_schema_json, is_active)
VALUES
  (
    'Google Sheets Trigger',
    'Watch Google Sheets events through a reusable n8n trigger definition.',
    'n8n.google_sheets.trigger',
    1,
    CAST('{"fields":[{"key":"clientEmail","label":"Google service account email","type":"email","required":true,"placeholder":"service-account@project.iam.gserviceaccount.com"},{"key":"privateKey","label":"Google private key","type":"password","required":true,"hidden":true,"placeholder":"Paste the service account private key"},{"key":"spreadsheetId","label":"Spreadsheet identifier","type":"text","required":true,"placeholder":"1AbCdEfGhIjKlMnOpQrStUvWxYz"},{"key":"sheetName","label":"Worksheet or sheet name","type":"text","required":true,"placeholder":"Leads"},{"key":"triggerEvent","label":"Trigger event","type":"select","required":true,"defaultValue":"newRow","options":[{"label":"New row","value":"newRow"},{"label":"Updated row","value":"updatedRow"}]},{"key":"firstRowIsHeader","label":"First row contains headers","type":"checkbox","defaultValue":true}]}' AS JSON),
    1
  ),
  (
    'Google Sheets Action',
    'Write or update rows in Google Sheets through a reusable n8n action definition.',
    'n8n.google_sheets.action',
    1,
    CAST('{"fields":[{"key":"clientEmail","label":"Google service account email","type":"email","required":true,"placeholder":"service-account@project.iam.gserviceaccount.com"},{"key":"privateKey","label":"Google private key","type":"password","required":true,"hidden":true,"placeholder":"Paste the service account private key"},{"key":"spreadsheetId","label":"Spreadsheet identifier","type":"text","required":true,"placeholder":"1AbCdEfGhIjKlMnOpQrStUvWxYz"},{"key":"sheetName","label":"Worksheet or sheet name","type":"text","required":true,"placeholder":"Processed Leads"},{"key":"operation","label":"Action operation","type":"select","required":true,"defaultValue":"append","options":[{"label":"Append row","value":"append"},{"label":"Update row","value":"update"},{"label":"Upsert row","value":"upsert"}]},{"key":"lookupColumn","label":"Lookup column for updates","type":"text","required":false,"placeholder":"email"}]}' AS JSON),
    1
  ),
  (
    'IMAP Trigger',
    'Poll or receive mailbox events through a reusable IMAP-backed n8n trigger definition.',
    'n8n.imap.trigger',
    1,
    CAST('{"fields":[{"key":"host","label":"IMAP host","type":"text","required":true,"placeholder":"imap.example.com"},{"key":"port","label":"IMAP port","type":"number","required":true,"defaultValue":993},{"key":"username","label":"IMAP username","type":"text","required":true,"placeholder":"automation@example.com"},{"key":"password","label":"IMAP password","type":"password","required":true,"hidden":true,"placeholder":"Mailbox password or app password"},{"key":"mailbox","label":"Mailbox or folder","type":"text","required":true,"defaultValue":"INBOX","placeholder":"INBOX"},{"key":"useTls","label":"Use TLS or SSL","type":"checkbox","defaultValue":true},{"key":"searchCriteria","label":"Search criteria","type":"text","required":false,"placeholder":"UNSEEN"}]}' AS JSON),
    1
  )
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  integration_type = VALUES(integration_type),
  has_credentials = VALUES(has_credentials),
  credential_form_schema_json = VALUES(credential_form_schema_json),
  is_active = VALUES(is_active);
