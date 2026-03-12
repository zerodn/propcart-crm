-- Add subdivisions JSON field for project subdivision tab
ALTER TABLE `projects`
  ADD COLUMN `subdivisions` JSON NULL;