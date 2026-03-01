-- Safety net for quote tool schema when 0013 fails on certain MySQL builds.
-- Each column is added in its own ALTER so duplicate-column errors are isolated.

ALTER TABLE `quote_tool_settings` ADD COLUMN `isActive` boolean DEFAULT false;
ALTER TABLE `quote_tool_settings` ADD COLUMN `headerTitle` varchar(300) DEFAULT 'Get Your Instant Quote';
ALTER TABLE `quote_tool_settings` ADD COLUMN `headerSubtitle` text;
ALTER TABLE `quote_tool_settings` ADD COLUMN `primaryColor` varchar(20) DEFAULT '#2563eb';
ALTER TABLE `quote_tool_settings` ADD COLUMN `logoUrl` text;
ALTER TABLE `quote_tool_settings` ADD COLUMN `buttonText` varchar(100) DEFAULT 'Get My Quote';
ALTER TABLE `quote_tool_settings` ADD COLUMN `showPropertySqft` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `showStories` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `showCondition` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `showPropertyType` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `requireEmail` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `requirePhone` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `bundleDiscountEnabled` boolean DEFAULT true;
ALTER TABLE `quote_tool_settings` ADD COLUMN `bundleDiscountTiers` json;

ALTER TABLE `quote_tool_services` ADD COLUMN `serviceKey` varchar(100);
ALTER TABLE `quote_tool_services` ADD COLUMN `description` text;
ALTER TABLE `quote_tool_services` ADD COLUMN `color` varchar(100);
ALTER TABLE `quote_tool_services` ADD COLUMN `isActive` boolean DEFAULT true;
ALTER TABLE `quote_tool_services` ADD COLUMN `pricingType` enum('fixed','per_sqft','per_linear_ft','per_unit','tiered') DEFAULT 'per_sqft';
ALTER TABLE `quote_tool_services` ADD COLUMN `basePrice` decimal(10,2) DEFAULT '0';
ALTER TABLE `quote_tool_services` ADD COLUMN `pricePerUnit` decimal(10,4) DEFAULT '0';
ALTER TABLE `quote_tool_services` ADD COLUMN `minimumCharge` decimal(10,2) DEFAULT '0';
ALTER TABLE `quote_tool_services` ADD COLUMN `sizeTiers` json;
ALTER TABLE `quote_tool_services` ADD COLUMN `storyMultiplier` json;
ALTER TABLE `quote_tool_services` ADD COLUMN `conditionMultiplier` json;
ALTER TABLE `quote_tool_services` ADD COLUMN `addOns` json;
