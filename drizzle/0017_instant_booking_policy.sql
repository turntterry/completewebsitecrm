ALTER TABLE quote_tool_settings
  ADD COLUMN maxServicesForInstantBooking INT NOT NULL DEFAULT 2;

ALTER TABLE quote_tool_settings
  ADD COLUMN instantBookingBlockedServices JSON NOT NULL DEFAULT (json_array());
