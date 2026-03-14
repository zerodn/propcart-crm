-- AlterTable: Change note column from VARCHAR(191) to LONGTEXT in property_products
ALTER TABLE `property_products` MODIFY COLUMN `note` LONGTEXT NULL;
