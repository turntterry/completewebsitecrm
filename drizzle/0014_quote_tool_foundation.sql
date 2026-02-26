ALTER TABLE `quote_tool_settings`
  ADD COLUMN `customerTierLabels` json,
  ADD COLUMN `premiumTheme` json;

CREATE TABLE `quote_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionToken` varchar(64) NOT NULL,
  `source` varchar(120),
  `referrer` varchar(500),
  `utmSource` varchar(120),
  `utmMedium` varchar(120),
  `utmCampaign` varchar(120),
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `submittedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `quote_sessions_id` PRIMARY KEY(`id`),
  CONSTRAINT `quote_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);

CREATE TABLE `quote_session_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionId` int NOT NULL,
  `eventName` varchar(80) NOT NULL,
  `payload` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `quote_session_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `quote_config_versions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `companyId` int NOT NULL,
  `versionLabel` varchar(120) NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `config` json NOT NULL,
  `publishedAt` timestamp,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `quote_config_versions_id` PRIMARY KEY(`id`)
);
