CREATE TABLE `automation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`companyId` int NOT NULL,
	`triggerEvent` varchar(64) NOT NULL,
	`entityType` varchar(32),
	`entityId` int,
	`status` enum('success','failed','skipped') NOT NULL DEFAULT 'success',
	`actionsRun` json,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`trigger` enum('job_created','job_status_changed','job_completed','quote_sent','quote_accepted','invoice_created','invoice_overdue','lead_created','visit_completed','payment_received') NOT NULL,
	`triggerConfig` json,
	`conditions` json,
	`actions` json NOT NULL,
	`lastRunAt` timestamp,
	`runCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`companyId` int NOT NULL,
	`category` enum('labor','materials','subcontractor','equipment','other') NOT NULL DEFAULT 'other',
	`description` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`costDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediaTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(32) DEFAULT 'blue',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `package_discount_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceCount` int NOT NULL,
	`discountPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`label` varchar(50) DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `package_discount_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photoTagAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attachmentId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photoTagAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `quote_global_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobMinimum` decimal(10,2) NOT NULL DEFAULT '149.00',
	`quoteExpirationDays` int NOT NULL DEFAULT 30,
	`baseAddress` varchar(255) DEFAULT '',
	`baseLat` decimal(10,7),
	`baseLng` decimal(10,7),
	`freeMiles` decimal(6,2) NOT NULL DEFAULT '0.00',
	`pricePerMile` decimal(6,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_global_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_session_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`eventName` varchar(80) NOT NULL,
	`payload` json NOT NULL DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_session_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL DEFAULT 1,
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
--> statement-breakpoint
CREATE TABLE `service_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceKey` varchar(100) NOT NULL,
	`displayName` varchar(150) NOT NULL,
	`pricingMode` varchar(30) NOT NULL DEFAULT 'smartscale',
	`pricingConfig` json NOT NULL,
	`multipliers` json NOT NULL,
	`taxable` boolean NOT NULL DEFAULT true,
	`taxCode` varchar(50) DEFAULT '',
	`iconUrl` varchar(500) DEFAULT '',
	`photoUrl` varchar(500) DEFAULT '',
	`highlights` json NOT NULL DEFAULT ('[]'),
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_configs_serviceKey_unique` UNIQUE(`serviceKey`)
);
--> statement-breakpoint
CREATE TABLE `shareLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`jobId` int,
	`shareLinkType` enum('gallery','timeline') NOT NULL DEFAULT 'gallery',
	`title` varchar(255),
	`expiresAt` timestamp,
	`viewCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shareLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `shareLinks_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `sms_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int,
	`customerPhone` varchar(32) NOT NULL,
	`customerName` varchar(120),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageBody` varchar(255),
	`unreadCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`companyId` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`body` text NOT NULL,
	`twilioSid` varchar(64),
	`status` enum('queued','sent','delivered','failed','received') NOT NULL DEFAULT 'queued',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `attachments` ADD `takenAt` timestamp;--> statement-breakpoint
ALTER TABLE `companies` ADD `aiReceptionistEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `companies` ADD `aiPersonaName` varchar(80);--> statement-breakpoint
ALTER TABLE `companies` ADD `aiSystemPrompt` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `aiBusinessHours` json;--> statement-breakpoint
ALTER TABLE `companies` ADD `aiAfterHoursMessage` text;--> statement-breakpoint
ALTER TABLE `instant_quotes` ADD `propertyIntel` json;--> statement-breakpoint
ALTER TABLE `instant_quotes` ADD `preferredSlot` varchar(120);--> statement-breakpoint
ALTER TABLE `instant_quotes` ADD `preferredSlotLabel` varchar(200);--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `serviceKey` varchar(100);--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `description` text;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `color` varchar(100);--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `isActive` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `pricingType` enum('fixed','per_sqft','per_linear_ft','per_unit','tiered') DEFAULT 'per_sqft';--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `basePrice` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `pricePerUnit` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `minimumCharge` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `sizeTiers` json;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `storyMultiplier` json;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `conditionMultiplier` json;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `addOns` json;--> statement-breakpoint
ALTER TABLE `quote_tool_services` ADD `manualReviewRequired` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `isActive` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `headerTitle` varchar(300) DEFAULT 'Get Your Instant Quote';--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `headerSubtitle` text;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `primaryColor` varchar(20) DEFAULT '#2563eb';--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `logoUrl` text;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `buttonText` varchar(100) DEFAULT 'Get My Quote';--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `showPropertySqft` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `showStories` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `showCondition` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `showPropertyType` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `requireEmail` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `requirePhone` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `bundleDiscountEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `bundleDiscountTiers` json;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `maxServicesForInstantBooking` int DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `instantBookingBlockedServices` json DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `availabilityStartHour` int DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `availabilityEndHour` int DEFAULT 17 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `availabilityDaysAhead` int DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `availabilityPreferExternal` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `slotPaddingMinutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `maxSqftAuto` decimal(10,2) DEFAULT '5000' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `maxLinearFtAuto` decimal(10,2) DEFAULT '800' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `maxStoriesAuto` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `maxWindowsAuto` int DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `customerTierLabels` json;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `premiumTheme` json;--> statement-breakpoint
ALTER TABLE `quote_tool_settings` ADD `upsellCatalog` json;--> statement-breakpoint
ALTER TABLE `review_requests` ADD `reviewerName` varchar(120);--> statement-breakpoint
ALTER TABLE `review_requests` ADD `rating` int;--> statement-breakpoint
ALTER TABLE `review_requests` ADD `body` text;--> statement-breakpoint
ALTER TABLE `review_requests` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `visits` ADD `checkInLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkInLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkOutLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkOutLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkInAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `visits` ADD `checkOutAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `visits` ADD `durationMinutes` int;