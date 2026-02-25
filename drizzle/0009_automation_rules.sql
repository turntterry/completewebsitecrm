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
