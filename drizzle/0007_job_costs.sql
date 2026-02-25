-- Phase 2B: Job Costing
CREATE TABLE IF NOT EXISTS `job_costs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jobId` int NOT NULL,
  `companyId` int NOT NULL,
  `category` enum('labor','materials','subcontractor','equipment','other') NOT NULL DEFAULT 'other',
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `costDate` timestamp NOT NULL DEFAULT NOW(),
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  `updatedAt` timestamp NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  CONSTRAINT `job_costs_pk` PRIMARY KEY(`id`)
);

CREATE INDEX `job_costs_jobId_idx` ON `job_costs` (`jobId`);
CREATE INDEX `job_costs_companyId_idx` ON `job_costs` (`companyId`);
