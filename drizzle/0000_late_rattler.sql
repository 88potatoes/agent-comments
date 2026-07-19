CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`file` text NOT NULL,
	`startLine` integer NOT NULL,
	`endLine` integer NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'local' NOT NULL,
	`externalId` integer,
	`author` text,
	`url` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "comments_status_check" CHECK("comments"."status" IN ('active', 'resolved', 'draft'))
);
