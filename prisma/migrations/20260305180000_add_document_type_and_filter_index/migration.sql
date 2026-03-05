ALTER TABLE `user_documents`
  ADD COLUMN `documentType` ENUM('CCCD', 'HDLD', 'CHUNG_CHI', 'OTHER') NOT NULL DEFAULT 'OTHER';

CREATE INDEX `user_documents_userId_documentType_idx` ON `user_documents`(`userId`, `documentType`);
