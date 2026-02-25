CREATE TABLE `activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`actorId` int,
	`actorName` varchar(255),
	`subjectType` varchar(64),
	`subjectId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`s3Key` text NOT NULL,
	`url` text NOT NULL,
	`label` varchar(64),
	`mimeType` varchar(128),
	`filename` varchar(255),
	`fileSize` int,
	`attachableType` varchar(64) NOT NULL,
	`attachableId` int NOT NULL,
	`uploadedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('email','sms') NOT NULL,
	`campaignType` enum('automated','one_off') DEFAULT 'one_off',
	`status` enum('draft','active','sent','inactive') DEFAULT 'draft',
	`subject` varchar(255),
	`body` text,
	`audience` json,
	`sentCount` int DEFAULT 0,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`completed` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`logoUrl` text,
	`address` text,
	`phone` varchar(32),
	`email` varchar(320),
	`website` text,
	`defaultTaxRate` decimal(5,2) DEFAULT '0.00',
	`invoiceTerms` varchar(64) DEFAULT 'due_on_receipt',
	`invoiceMessage` text,
	`quoteMessage` text,
	`quoteExpiryDays` int DEFAULT 30,
	`businessHours` json,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128),
	`email` varchar(320),
	`phone` varchar(32),
	`phone2` varchar(32),
	`notes` text,
	`tags` json DEFAULT ('[]'),
	`leadSource` varchar(64),
	`stripeCustomerId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	`description` varchar(255) NOT NULL,
	`details` text,
	`unitPrice` decimal(10,2) DEFAULT '0.00',
	`quantity` decimal(10,3) DEFAULT '1.000',
	`total` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoice_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int NOT NULL,
	`jobId` int,
	`invoiceNumber` int NOT NULL,
	`status` enum('draft','upcoming','sent','paid','past_due','archived') NOT NULL DEFAULT 'draft',
	`subtotal` decimal(10,2) DEFAULT '0.00',
	`taxRate` decimal(5,2) DEFAULT '0.00',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`tipAmount` decimal(10,2) DEFAULT '0.00',
	`total` decimal(10,2) DEFAULT '0.00',
	`amountPaid` decimal(10,2) DEFAULT '0.00',
	`balance` decimal(10,2) DEFAULT '0.00',
	`message` text,
	`internalNotes` text,
	`dueDate` timestamp,
	`sentAt` timestamp,
	`paidAt` timestamp,
	`stripePaymentIntentId` varchar(128),
	`reminderSentAt` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int NOT NULL,
	`propertyId` int,
	`quoteId` int,
	`jobNumber` int NOT NULL,
	`title` varchar(255),
	`status` enum('draft','scheduled','in_progress','requires_invoicing','completed','archived') NOT NULL DEFAULT 'draft',
	`isRecurring` boolean DEFAULT false,
	`recurrenceRule` varchar(64),
	`instructions` text,
	`internalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int,
	`firstName` varchar(128),
	`lastName` varchar(128),
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`city` varchar(128),
	`state` varchar(64),
	`zip` varchar(16),
	`services` json DEFAULT ('[]'),
	`notes` text,
	`source` varchar(64) DEFAULT 'website',
	`status` enum('new','contacted','follow_up','quoted','won','lost') NOT NULL DEFAULT 'new',
	`lostReason` text,
	`convertedToQuoteId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`companyId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('card','ach','check','cash','other') NOT NULL,
	`stripeChargeId` varchar(128),
	`stripePaymentIntentId` varchar(128),
	`notes` text,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`companyId` int NOT NULL,
	`address` text NOT NULL,
	`city` varchar(128),
	`state` varchar(64),
	`zip` varchar(16),
	`country` varchar(64) DEFAULT 'US',
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`notes` text,
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	`description` varchar(255) NOT NULL,
	`details` text,
	`featureList` json DEFAULT ('[]'),
	`unitPrice` decimal(10,2) DEFAULT '0.00',
	`quantity` decimal(10,3) DEFAULT '1.000',
	`total` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`lineItems` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int NOT NULL,
	`propertyId` int,
	`leadId` int,
	`quoteNumber` int NOT NULL,
	`title` varchar(255),
	`status` enum('draft','sent','accepted','changes_requested','expired','archived') NOT NULL DEFAULT 'draft',
	`subtotal` decimal(10,2) DEFAULT '0.00',
	`taxRate` decimal(5,2) DEFAULT '0.00',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`depositAmount` decimal(10,2) DEFAULT '0.00',
	`total` decimal(10,2) DEFAULT '0.00',
	`message` text,
	`internalNotes` text,
	`expiresAt` timestamp,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`referrerId` int NOT NULL,
	`referredCustomerId` int,
	`referredName` varchar(255),
	`referredEmail` varchar(320),
	`status` enum('pending','converted','rewarded') DEFAULT 'pending',
	`creditAmount` decimal(10,2) DEFAULT '50.00',
	`jobId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`customerId` int NOT NULL,
	`invoiceId` int,
	`platform` enum('google','facebook') NOT NULL,
	`method` enum('email','sms') NOT NULL,
	`status` enum('pending','sent','clicked','reviewed') DEFAULT 'pending',
	`sentAt` timestamp,
	`scheduledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visit_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visit_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`companyId` int NOT NULL,
	`status` enum('unscheduled','scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'unscheduled',
	`scheduledAt` timestamp,
	`scheduledEndAt` timestamp,
	`checkInAt` timestamp,
	`checkOutAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `crmRole` enum('owner','dispatcher','technician') DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `companyId` int;