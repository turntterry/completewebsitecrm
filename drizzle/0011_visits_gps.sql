ALTER TABLE `visits`
  ADD COLUMN `checkInLat` decimal(10,7),
  ADD COLUMN `checkInLng` decimal(10,7),
  ADD COLUMN `checkOutLat` decimal(10,7),
  ADD COLUMN `checkOutLng` decimal(10,7),
  ADD COLUMN `checkInAddress` varchar(255),
  ADD COLUMN `checkOutAddress` varchar(255),
  ADD COLUMN `durationMinutes` int;
