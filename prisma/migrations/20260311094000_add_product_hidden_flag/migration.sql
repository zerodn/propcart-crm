ALTER TABLE `property_products`
  ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `property_products_workspaceId_isHidden_idx` ON `property_products`(`workspaceId`, `isHidden`);
