-- CreateTable
CREATE TABLE `system_logs` (
    `id` VARCHAR(191) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `event` VARCHAR(50) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `requestId` VARCHAR(36) NULL,
    `userId` VARCHAR(36) NULL,
    `ip` VARCHAR(45) NULL,
    `method` VARCHAR(10) NULL,
    `path` VARCHAR(255) NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_logs_createdAt_idx`(`createdAt`),
    INDEX `system_logs_event_createdAt_idx`(`event`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

