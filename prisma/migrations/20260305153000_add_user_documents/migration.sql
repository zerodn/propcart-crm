CREATE TABLE `user_documents` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `workspaceId` VARCHAR(191) NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `fileType` VARCHAR(100) NOT NULL,
  `fileSize` INTEGER NOT NULL,
  `objectKey` VARCHAR(512) NOT NULL,
  `fileUrl` VARCHAR(1024) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `user_documents_objectKey_key`(`objectKey`),
  INDEX `user_documents_userId_idx`(`userId`),
  INDEX `user_documents_workspaceId_idx`(`workspaceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_documents`
  ADD CONSTRAINT `user_documents_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
