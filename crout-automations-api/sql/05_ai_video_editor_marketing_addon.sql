USE crout_automations;

INSERT INTO Addons (service_id, AddonName, AddonDescription, Price)
SELECT 4, 'AI Video Editor', 'Scheduled AI-generated videos with media review, timeline editing, and backend workflow rendering.', 6000.00
WHERE NOT EXISTS (SELECT 1 FROM Addons WHERE service_id = 4 AND AddonName = 'AI Video Editor');

UPDATE ServiceTriggerConfigs
SET service_id = 4
WHERE service_id = 6
  AND workflow_id IN ('ai-video-render', 'ai-video-brief', 'ai-video-email-preview', 'ai-video-assets');

UPDATE VideoProjects
SET service_id = 4
WHERE service_id = 6;

UPDATE VideoProjects vp
LEFT JOIN UserServices us ON us.id = vp.user_service_id
SET vp.user_service_id = NULL
WHERE us.service_id = 6;

DELETE FROM UserServices WHERE service_id = 6;
DELETE FROM ServiceFeatures WHERE service_id = 6;
DELETE FROM Services WHERE service_id = 6 AND ServiceName = 'AI Video Editor';
