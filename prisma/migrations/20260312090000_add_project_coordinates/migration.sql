-- Add latitude and longitude columns to projects
ALTER TABLE `projects` ADD COLUMN `latitude` VARCHAR(191) NULL;
ALTER TABLE `projects` ADD COLUMN `longitude` VARCHAR(191) NULL;
