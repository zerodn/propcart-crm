-- AddColumn: videoDescription, contacts to project
ALTER TABLE `projects` 
ADD COLUMN `videoDescription` TEXT NULL AFTER `videoUrl`,
ADD COLUMN `contacts` JSON NULL AFTER `videoDescription`;
