-- Add project progress updates JSON field
ALTER TABLE `projects`
  ADD COLUMN `progressUpdates` JSON NULL;
