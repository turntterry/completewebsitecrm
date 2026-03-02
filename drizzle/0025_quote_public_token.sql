-- Add publicToken to quotes for shareable client-view links
ALTER TABLE `quotes` ADD COLUMN `publicToken` varchar(64);

-- Backfill existing quotes with a unique token derived from id
UPDATE `quotes` SET `publicToken` = CONCAT('qt_', LPAD(id, 8, '0'), '_', SUBSTRING(MD5(RAND()), 1, 16)) WHERE `publicToken` IS NULL;
