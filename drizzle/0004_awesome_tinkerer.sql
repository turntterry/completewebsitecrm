CREATE TABLE `client_hub_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`companyId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`quoteId` int,
	`invoiceId` int,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_hub_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_hub_tokens_token_unique` UNIQUE(`token`)
);
