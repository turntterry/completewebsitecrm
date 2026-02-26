ALTER TABLE quote_tool_settings
  ADD COLUMN availabilityPreferExternal BOOLEAN DEFAULT TRUE,
  ADD COLUMN slotPaddingMinutes INT NOT NULL DEFAULT 0;
