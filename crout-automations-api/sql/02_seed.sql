-- Crout Automations — Seed Data
-- HMAC-SHA256(secret='crout-automations-secret-2026')
-- Andrew/pwd1 => 46ac9751bd26a64ea89c86ff4ec44cb5d237c197eafeb3fd69f28842b8682b6c
-- Jaco/pwd2   => 0caa77b9629fd93e1ce1b2b9d57a10c4ea5bd6b7a4c7d914302938c72daf3d16
USE crout_automations;

INSERT INTO Users (user_id,Username,PasswordHash,FirstName,Surname,Email,CellNumber,Active,IsAdmin) VALUES
(1,'Andrew','46ac9751bd26a64ea89c86ff4ec44cb5d237c197eafeb3fd69f28842b8682b6c','Andrew','Crout','andrew@crout-holdings.com','(+27) 64 656 9894',1,1),
(2,'Jaco','0caa77b9629fd93e1ce1b2b9d57a10c4ea5bd6b7a4c7d914302938c72daf3d16','Jaco','Visser','admin@woodenweld.co.za','(+27) 79 024 6945',1,0);

INSERT INTO Companies (company_id,user_id,CompanyName,Industry,Email,Phone,Address,Active) VALUES
(1,1,'Crout Holdings','Technology / Automation','andrew@crout-holdings.com','(+27) 64 656 9894','Bloemfontein, Free State, ZA',1),
(2,2,'WoodenWeld','Manufacturing / Woodwork','admin@woodenweld.co.za','(+27) 79 024 6945',NULL,1),
(3,2,'Globefurn','Furniture / Retail',NULL,NULL,NULL,1);

INSERT INTO Services (service_id,ServiceName,Price,HasAddons,Conditional,ServiceDescription) VALUES
(1,'WhatsApp Agent',3000.00,1,0,'A flexible WhatsApp Agent that handles enquiries, automates quotes, creates job cards, and manages client comms.'),
(2,'Quote System',3000.00,1,0,'End-to-end quote automation — triggered by email, webhook, or WhatsApp, linked to Xero, and approved automatically.'),
(3,'Project Management System',3000.00,1,0,'Auto-generate job cards from any trigger — email, webhook, or WhatsApp — synced with Trello and managed by AI agents.'),
(4,'Marketing Systems',3000.00,1,0,'Automated marketing workflows — bulk messaging, campaign triggers, and scheduled broadcasts via WhatsApp and email.'),
(5,'WhatsApp Agent [Xero Suite Add-on]',3000.00,1,1,'The WhatsApp Agent as a conditional add-on within the Xero Suite package.');

INSERT INTO ServiceFeatures (service_id,Feature,SortOrder) VALUES
(1,'Client Support',1),(1,'Team Notifications',2),(1,'Client Notifications',3),
(1,'Quote Gathering & Generation',4),(1,'Marketing Reach',5),(1,'Custom Flows',6),
(2,'Xero Integration',1),(2,'Multi-Platform Accounting',2),(2,'Custom Calculations',3),
(2,'Auto Invoice Follow-Ups',4),(2,'Quote-to-Invoice Pipeline',5),(2,'Smart Summaries',6),
(3,'Auto Trello Card Creation',1),(3,'Trello Board Management',2),(3,'Jira Integration',3),
(3,'Custom Trigger Workflows',4),(3,'Team Notifications',5),(3,'Custom Systems',6),
(4,'Branded Image Generation',1),(4,'Faceless & Face Videos',2),(4,'All Social Platforms',3),
(4,'Weekly Scheduling',4),(4,'SEO & Analytics',5),(4,'After-Hours Receptionist',6);

INSERT INTO Addons (addon_id,service_id,AddonName,AddonDescription,Price) VALUES
(1,1,'Marketing Messaging','Broadcast marketing messages to your client list via WhatsApp.',800),
(2,1,'Automated Quoting [Xero]','Allow the WhatsApp agent to generate and send Xero-linked quotes automatically.',1200),
(3,1,'5M+ Token Upgrade','Increase your AI token allocation beyond the standard 2M included.',600),
(4,1,'Template/Forms Messaging','Send templated or form-based messages for structured client interactions.',500),
(5,2,'Xero Invoices','Automatically convert approved quotes into Xero invoices.',800),
(6,2,'Invoice Follow-Ups [Xero]','Automated follow-up reminders sent for outstanding Xero invoices.',600),
(7,3,'Custom Setup','Bespoke configuration and custom workflow design for your specific business.',1000),
(8,3,'Payroll Excel Generation','Auto-generate payroll-ready Excel reports from your job card data.',900),
(9,4,'Scheduled Broadcasts','Schedule recurring bulk messages at set times or dates.',500),
(10,4,'Campaign Analytics','Track delivery, open, and response rates per campaign.',600),
(11,5,'Marketing Messaging','Broadcast marketing messages to your client list via WhatsApp.',800),
(12,5,'Automated Quoting [Xero]','Allow the WhatsApp agent to generate and send Xero-linked quotes automatically.',1200),
(13,5,'5M+ Token Upgrade','Increase your AI token allocation beyond the standard 2M included.',600),
(14,5,'Template/Forms Messaging','Send templated or form-based messages for structured client interactions.',500);

INSERT INTO Packages (package_id,parent_package_id,PackageName,PackageDescription,Discount,minimumRequiredAddons) VALUES
(1,NULL,'WhatsApp Agent — Full Bundle','WhatsApp Agent base with all addons at a bundle discount.',0.15,2),
(2,NULL,'Quote System — Full Bundle','Quote System base with Xero Invoices and Invoice Follow-Ups at a bundle discount.',0.15,2),
(3,NULL,'Project Management — Full Bundle','Project Management System base with Custom Setup and Payroll Excel Generation at a bundle discount.',0.15,2),
(4,NULL,'Xero Suite (without WhatsApp)','Quote System + Project Management System bundle discount.',0.15,NULL),
(5,4,'Xero Suite (with WhatsApp Agent)','Everything in Xero Suite plus the full WhatsApp Agent.',0.20,NULL);

INSERT INTO PackageServices (package_id,service_id) VALUES
(1,1),(2,2),(3,3),(4,2),(4,3),(5,5);

INSERT INTO UserServices (company_id,service_id,package_id,Config,Active,Status) VALUES
(2,3,NULL,'{"integrations":["Trello","Google Sheets","IMAP Email"],"custom":"true"}',1,2),
(3,2,NULL,'{"integrations":["Google Sheets","AI Agent","IMAP Email"],"custom":"true"}',1,1);

INSERT INTO Addons (service_id, AddonName, AddonDescription, Price)
SELECT 4, 'AI Video Editor', 'Scheduled AI-generated videos with media review, timeline editing, and backend workflow rendering.', 6000.00
WHERE NOT EXISTS (SELECT 1 FROM Addons WHERE service_id = 4 AND AddonName = 'AI Video Editor');

INSERT INTO UserServices (company_id, service_id, package_id, Config, Active, Status)
SELECT 1, 4, NULL, '{"videoEditor":true,"triggers":true}', 1, 1
WHERE EXISTS (SELECT 1 FROM Companies WHERE company_id = 1)
  AND NOT EXISTS (SELECT 1 FROM UserServices WHERE company_id = 1 AND service_id = 4 AND Active = 1);

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
ON DUPLICATE KEY UPDATE
  workflow_id = VALUES(workflow_id),
  Description = VALUES(Description),
  endpoint_path = VALUES(endpoint_path),
  payload_template = VALUES(payload_template),
  fields_json = VALUES(fields_json),
  file_upload_json = VALUES(file_upload_json),
  sort_order = VALUES(sort_order);

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
