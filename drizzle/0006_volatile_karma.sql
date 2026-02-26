CREATE TABLE `quote_tool_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(64) DEFAULT 'Droplets',
	`iconColor` varchar(32) DEFAULT '#3b82f6',
	`enabled` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`pricingConfig` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_tool_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_tool_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`jobMinimum` decimal(10,2) DEFAULT '0.00',
	`defaultExpirationDays` int DEFAULT 7,
	`packageDiscountsEnabled` boolean DEFAULT false,
	`discount2Services` decimal(5,2) DEFAULT '5.00',
	`discount3Services` decimal(5,2) DEFAULT '7.00',
	`discount4Services` decimal(5,2) DEFAULT '10.00',
	`discount5PlusServices` decimal(5,2) DEFAULT '12.00',
	`onlineBookingEnabled` boolean DEFAULT true,
	`requireAdvanceBooking` boolean DEFAULT false,
	`advanceBookingDays` int DEFAULT 1,
	`commercialRoutingEnabled` boolean DEFAULT false,
	`standaloneToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_tool_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_tool_settings_companyId_unique` UNIQUE(`companyId`)
);
