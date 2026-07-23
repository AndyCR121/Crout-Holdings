USE crout_automations;

CREATE TABLE IF NOT EXISTS ServiceTriggerConfigs (
  service_trigger_config_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id                INT NOT NULL,
  user_service_id           INT NULL,
  workflow_id               VARCHAR(255) NULL,
  trigger_type              VARCHAR(40) NOT NULL,
  Label                     VARCHAR(255) NOT NULL,
  Description               TEXT NULL,
  endpoint_path             VARCHAR(500) NULL,
  method                    VARCHAR(10) NOT NULL DEFAULT 'POST',
  requires_confirmation     TINYINT(1) NOT NULL DEFAULT 0,
  payload_template          JSON NULL,
  fields_json               JSON NULL,
  file_upload_json          JSON NULL,
  response_mode             VARCHAR(30) NOT NULL DEFAULT 'inline',
  is_active                 TINYINT(1) NOT NULL DEFAULT 1,
  sort_order                INT NOT NULL DEFAULT 0,
  CreatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_trigger_service FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE,
  CONSTRAINT fk_trigger_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE CASCADE,
  UNIQUE KEY ux_trigger_service_type_label (service_id, trigger_type, Label),
  INDEX ix_trigger_service_active (service_id, is_active),
  INDEX ix_trigger_user_service_active (user_service_id, is_active)
);

CREATE TABLE IF NOT EXISTS ServiceTriggerExecutions (
  service_trigger_execution_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_trigger_config_id    INT NULL,
  user_id                      INT NOT NULL,
  company_id                   INT NOT NULL,
  user_service_id              INT NULL,
  request_payload              JSON NULL,
  response_payload             JSON NULL,
  Status                       VARCHAR(40) NOT NULL DEFAULT 'queued',
  mode                         VARCHAR(20) NOT NULL DEFAULT 'mock',
  error_message                TEXT NULL,
  CreatedAt                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exec_config FOREIGN KEY (service_trigger_config_id) REFERENCES ServiceTriggerConfigs(service_trigger_config_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_exec_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE SET NULL,
  INDEX ix_exec_company_created (company_id, CreatedAt),
  INDEX ix_exec_user_service_created (user_service_id, CreatedAt)
);

CREATE TABLE IF NOT EXISTS VideoProjects (
  video_project_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_id       INT NOT NULL,
  user_service_id  INT NULL,
  service_id       INT NOT NULL,
  Title            VARCHAR(255) NOT NULL,
  Status           VARCHAR(40) NOT NULL DEFAULT 'draft',
  scheduled_for    DATETIME NULL,
  platform         VARCHAR(40) NOT NULL DEFAULT 'instagram',
  output_url       VARCHAR(1000) NULL,
  metadata_json    JSON NULL,
  timeline_json    JSON NULL,
  timeline_version INT NOT NULL DEFAULT 1,
  CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_video_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_video_user_service FOREIGN KEY (user_service_id) REFERENCES UserServices(id) ON DELETE SET NULL,
  CONSTRAINT fk_video_service FOREIGN KEY (service_id) REFERENCES Services(service_id),
  INDEX ix_video_company_schedule (company_id, scheduled_for),
  INDEX ix_video_user_service (user_service_id)
);

INSERT INTO Addons (service_id, AddonName, AddonDescription, Price)
SELECT 4, 'AI Video Editor', 'Scheduled AI-generated videos with media review, timeline editing, and backend workflow rendering.', 6000.00
WHERE NOT EXISTS (SELECT 1 FROM Addons WHERE service_id = 4 AND AddonName = 'AI Video Editor');

INSERT INTO UserServices (company_id, service_id, package_id, Config, Active, Status)
SELECT c.company_id, 4, NULL, '{"videoEditor":true,"triggers":true}', 1, 1
FROM Companies c
WHERE c.company_id = 1
  AND NOT EXISTS (SELECT 1 FROM UserServices WHERE company_id = c.company_id AND service_id = 4 AND Active = 1);

INSERT INTO ServiceTriggerConfigs
  (service_id, workflow_id, trigger_type, Label, Description, endpoint_path, method, requires_confirmation, payload_template, fields_json, file_upload_json, response_mode, sort_order)
VALUES
  (4, 'ai-video-render', 'webhook', 'Queue render', 'Send the current timeline to the AI render workflow.', '/webhook/ai-video-render', 'POST', 1,
   '{"source":"portal","action":"render"}', NULL, NULL, 'inline', 1),
  (4, 'ai-video-brief', 'form', 'Generate content brief', 'Create a script, scene plan, captions, and social metadata from campaign inputs.', '/webhook/ai-video-brief', 'POST', 0,
   '{"source":"portal","action":"brief"}',
   '[{"key":"topic","label":"Topic","type":"text","required":true,"placeholder":"June promo campaign"},{"key":"platform","label":"Platform","type":"select","required":true,"defaultValue":"instagram","options":[{"label":"Instagram","value":"instagram"},{"label":"TikTok","value":"tiktok"},{"label":"YouTube","value":"youtube"}]},{"key":"tone","label":"Tone","type":"select","defaultValue":"professional","options":[{"label":"Professional","value":"professional"},{"label":"Energetic","value":"energetic"},{"label":"Luxury","value":"luxury"}]},{"key":"notes","label":"Notes","type":"textarea","required":false}]',
   NULL, 'inline', 2),
  (4, 'ai-video-email-preview', 'email_mockup', 'Draft approval email', 'Build a structured email payload for video approval workflows.', '/webhook/video-approval-email', 'POST', 0,
   '{"source":"portal","action":"approvalEmail"}', NULL, NULL, 'inline', 3),
  (4, 'ai-video-assets', 'file_upload', 'Upload campaign assets', 'Validate and queue source clips, images, audio, or captions for the video workflow.', '/webhook/video-assets', 'POST', 0,
   '{"source":"portal","action":"uploadAssets"}', NULL,
   '{"allowedExtensions":["mp4","mov","png","jpg","jpeg","mp3","wav","srt"],"maxSizeMb":50,"maxCount":5}', 'inline', 4)
ON DUPLICATE KEY UPDATE Label = Label;

INSERT INTO VideoProjects
  (company_id, user_service_id, service_id, Title, Status, scheduled_for, platform, output_url, metadata_json, timeline_json)
SELECT
  1,
  us.id,
  4,
  'Crout weekly automation spotlight',
  'ready',
  DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 DAY),
  'instagram',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  '{"assets":[{"id":"clip-1","type":"video","name":"Generated intro clip","url":"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4","duration":12},{"id":"caption-1","type":"caption","name":"Hook captions","url":"","duration":8},{"id":"audio-1","type":"audio","name":"Voiceover draft","url":"","duration":18}],"caption":"Automations that keep working after hours.","hashtags":["#Automation","#AI","#CroutAutomations"]}',
  '{"tracks":[{"id":"video-track","type":"video","items":[{"id":"item-1","assetId":"clip-1","startTime":0,"endTime":12,"trimStart":0,"trimEnd":12,"position":{"x":50,"y":50,"scale":1}}]},{"id":"caption-track","type":"caption","items":[{"id":"item-2","assetId":"caption-1","startTime":1,"endTime":8,"position":{"x":50,"y":82,"scale":1}}]},{"id":"audio-track","type":"audio","items":[{"id":"item-3","assetId":"audio-1","startTime":0,"endTime":18}]}]}'
FROM UserServices us
WHERE us.company_id = 1 AND us.service_id = 4
  AND NOT EXISTS (SELECT 1 FROM VideoProjects WHERE company_id = 1 AND service_id = 4 AND Title = 'Crout weekly automation spotlight')
LIMIT 1;
