-- ============================================================
-- PropCart CRM Database Initialization
-- MariaDB 11.0
-- ============================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS propcart_crm 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE propcart_crm;

-- ============================================================
-- Enable Full-text Search Engine
-- ============================================================
-- Full-text search configuration is built-in to MariaDB

-- ============================================================
-- Sample User for Initial Setup
-- ============================================================
-- Insert a test user for development
INSERT IGNORE INTO users (id, phone, email, status, createdAt, updatedAt) 
VALUES ('user-initial-dev', '+84901234567', 'admin@propcart.local', 1, NOW(), NOW());

-- ============================================================
-- Permissions for Future Use
-- ============================================================
-- This file serves as initialization template
-- Detailed migrations are handled by Prisma

