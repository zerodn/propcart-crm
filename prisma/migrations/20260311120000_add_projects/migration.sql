-- CreateTable: projects
CREATE TABLE `projects` (
  `id`              VARCHAR(191) NOT NULL,
  `workspaceId`     VARCHAR(191) NOT NULL,
  `name`            VARCHAR(191) NOT NULL,
  `projectType`     VARCHAR(191) NOT NULL,
  `ownerId`         VARCHAR(191) NULL,
  `displayStatus`   VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `saleStatus`      VARCHAR(191) NOT NULL DEFAULT 'COMING_SOON',
  `bannerUrl`       VARCHAR(191) NULL,
  `overviewHtml`    TEXT NULL,
  `address`         VARCHAR(191) NULL,
  `province`        VARCHAR(191) NULL,
  `district`        VARCHAR(191) NULL,
  `zoneImageUrl`    VARCHAR(191) NULL,
  `productImageUrl` VARCHAR(191) NULL,
  `amenityImageUrl` VARCHAR(191) NULL,
  `videoUrl`        VARCHAR(191) NULL,
  `planningStats`   JSON NULL,
  `createdByUserId` VARCHAR(191) NOT NULL,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL,

  INDEX `projects_workspaceId_idx`(`workspaceId`),
  INDEX `projects_workspaceId_displayStatus_idx`(`workspaceId`, `displayStatus`),
  INDEX `projects_workspaceId_saleStatus_idx`(`workspaceId`, `saleStatus`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspaceId_fkey`
  FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_createdByUserId_fkey`
  FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
