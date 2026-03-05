ALTER TABLE `users`
  ADD COLUMN `fullName` VARCHAR(120) NULL,
  ADD COLUMN `addressLine` VARCHAR(255) NULL,
  ADD COLUMN `provinceCode` VARCHAR(20) NULL,
  ADD COLUMN `provinceName` VARCHAR(120) NULL,
  ADD COLUMN `districtCode` VARCHAR(20) NULL,
  ADD COLUMN `districtName` VARCHAR(120) NULL,
  ADD COLUMN `wardCode` VARCHAR(20) NULL,
  ADD COLUMN `wardName` VARCHAR(120) NULL,
  ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `emailVerifyToken` VARCHAR(191) NULL,
  ADD COLUMN `emailVerifyExpiresAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `users_emailVerifyToken_key` ON `users`(`emailVerifyToken`);
