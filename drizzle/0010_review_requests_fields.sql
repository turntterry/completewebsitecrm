ALTER TABLE `review_requests`
  ADD COLUMN `reviewerName` varchar(120),
  ADD COLUMN `rating` int,
  ADD COLUMN `body` text,
  ADD COLUMN `reviewedAt` timestamp;
