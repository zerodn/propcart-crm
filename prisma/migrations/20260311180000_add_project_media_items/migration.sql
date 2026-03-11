-- Add MediaItem JSON columns for zone, product, amenity images
ALTER TABLE `projects` ADD COLUMN `zoneImages` JSON NULL;
ALTER TABLE `projects` ADD COLUMN `productImages` JSON NULL;
ALTER TABLE `projects` ADD COLUMN `amenityImages` JSON NULL;
