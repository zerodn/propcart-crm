-- Add support for multiple project banner images
ALTER TABLE `projects`
ADD COLUMN `bannerUrls` JSON NULL;
