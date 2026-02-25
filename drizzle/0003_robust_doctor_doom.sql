CREATE TABLE `quote_option_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`optionSetId` int NOT NULL,
	`quoteId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`featureList` json DEFAULT ('[]'),
	`quantity` decimal(10,3) DEFAULT '1.000',
	`unitPrice` decimal(10,2) DEFAULT '0.00',
	`total` decimal(10,2) DEFAULT '0.00',
	`isSelected` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_option_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_option_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_option_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `googlePlaceId` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `googleReviewsEnabled` boolean DEFAULT false;