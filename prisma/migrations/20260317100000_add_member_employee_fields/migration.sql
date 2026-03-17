-- Migration: add_member_employee_fields
-- Adds employeeCode, addressLine, contractType to workspace_members

ALTER TABLE `workspace_members`
  ADD COLUMN `employeeCode` VARCHAR(191) NULL AFTER `status`,
  ADD COLUMN `addressLine` VARCHAR(191) NULL AFTER `workspaceAddress`,
  ADD COLUMN `contractType` VARCHAR(191) NULL AFTER `addressLine`;
