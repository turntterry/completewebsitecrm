ALTER TABLE `companies`
  ADD COLUMN `aiReceptionistEnabled` boolean NOT NULL DEFAULT false,
  ADD COLUMN `aiPersonaName` varchar(80),
  ADD COLUMN `aiSystemPrompt` text,
  ADD COLUMN `aiBusinessHours` json,
  ADD COLUMN `aiAfterHoursMessage` text;
