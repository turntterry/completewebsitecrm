ALTER TABLE quote_tool_settings
  ADD COLUMN availabilityStartHour INT NOT NULL DEFAULT 9,
  ADD COLUMN availabilityEndHour INT NOT NULL DEFAULT 17,
  ADD COLUMN availabilityDaysAhead INT NOT NULL DEFAULT 9;
