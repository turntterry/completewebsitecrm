-- Migration 0013: Add missing tables and columns
-- Tables quote_global_settings, package_discount_tiers, service_configs were
-- defined in schema.ts but never had a migration file.
-- quote_tool_settings and quote_tool_services grew beyond what migration 0006 created.

-- ─── New tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `quote_global_settings` (
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

CREATE TABLE IF NOT EXISTS `package_discount_tiers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `serviceCount` int NOT NULL,
  `discountPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `label` varchar(50) DEFAULT '',
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `package_discount_tiers_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `service_configs` (
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

-- ─── Missing columns on quote_tool_settings (added after migration 0006) ──────

ALTER TABLE `quote_tool_settings`
  ADD COLUMN IF NOT EXISTS `isActive` boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS `headerTitle` varchar(300) DEFAULT 'Get Your Instant Quote',
  ADD COLUMN IF NOT EXISTS `headerSubtitle` text,
  ADD COLUMN IF NOT EXISTS `primaryColor` varchar(20) DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS `logoUrl` text,
  ADD COLUMN IF NOT EXISTS `buttonText` varchar(100) DEFAULT 'Get My Quote',
  ADD COLUMN IF NOT EXISTS `showPropertySqft` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `showStories` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `showCondition` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `showPropertyType` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `requireEmail` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `requirePhone` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `bundleDiscountEnabled` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `bundleDiscountTiers` json;

-- ─── Missing columns on quote_tool_services (added after migration 0006) ──────

ALTER TABLE `quote_tool_services`
  ADD COLUMN IF NOT EXISTS `serviceKey` varchar(100),
  ADD COLUMN IF NOT EXISTS `description` text,
  ADD COLUMN IF NOT EXISTS `color` varchar(100),
  ADD COLUMN IF NOT EXISTS `isActive` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `pricingType` enum('fixed','per_sqft','per_linear_ft','per_unit','tiered') DEFAULT 'per_sqft',
  ADD COLUMN IF NOT EXISTS `basePrice` decimal(10,2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `pricePerUnit` decimal(10,4) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `minimumCharge` decimal(10,2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS `sizeTiers` json,
  ADD COLUMN IF NOT EXISTS `storyMultiplier` json,
  ADD COLUMN IF NOT EXISTS `conditionMultiplier` json,
  ADD COLUMN IF NOT EXISTS `addOns` json,
  ADD COLUMN IF NOT EXISTS `iconColor` varchar(32) DEFAULT '#3b82f6';
