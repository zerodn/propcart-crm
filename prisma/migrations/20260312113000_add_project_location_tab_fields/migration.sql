-- Add fields for project location tab
ALTER TABLE `projects`
  ADD COLUMN `ward` VARCHAR(191) NULL,
  ADD COLUMN `googleMapUrl` TEXT NULL,
  ADD COLUMN `locationDescriptionHtml` TEXT NULL;