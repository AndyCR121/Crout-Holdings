-- Active: 1781193513914@@169.255.58.150@3306@crout_automations
-- Active: 1769864219179@@ls23.host-ww.net@3306@crouthol_automations_main
-- Schema sync reviewed migration generated on 2026-07-07T06:59:11.6190207+00:00
-- Source: Development [db:3306/crout_automations]
-- Target: Production [169.255.58.150:3306/crout_automations]
-- Generated only from SafeAutoApply differences.

-- SafeAutoApply: create missing table `AddonIntegrations`
CREATE TABLE `AddonIntegrations` (
  `addon_id` int NOT NULL,
  `integration_definition_id` int NOT NULL,
  PRIMARY KEY (`addon_id`,`integration_definition_id`),
  KEY `fk_addon_integrations_definition` (`integration_definition_id`),
  CONSTRAINT `fk_addon_integrations_addon` FOREIGN KEY (`addon_id`) REFERENCES `Addons` (`addon_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_addon_integrations_definition` FOREIGN KEY (`integration_definition_id`) REFERENCES `IntegrationDefinitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- SafeAutoApply: create missing table `ServiceAddons`
CREATE TABLE `ServiceAddons` (
  `service_id` int NOT NULL,
  `addon_id` int NOT NULL,
  PRIMARY KEY (`service_id`,`addon_id`),
  KEY `fk_service_addons_addon` (`addon_id`),
  CONSTRAINT `fk_service_addons_addon` FOREIGN KEY (`addon_id`) REFERENCES `Addons` (`addon_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_addons_service` FOREIGN KEY (`service_id`) REFERENCES `Services` (`service_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
