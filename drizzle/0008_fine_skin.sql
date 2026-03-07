ALTER TABLE `companies` ADD `aiAutoReplyEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quotes` ADD `publicToken` varchar(64);--> statement-breakpoint
ALTER TABLE `photoTagAssignments` ADD CONSTRAINT `photo_tag_unique` UNIQUE(`attachmentId`,`tagId`);