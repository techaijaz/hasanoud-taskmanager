-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(72) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phoneIsoCode` VARCHAR(191) NOT NULL,
    `phoneCountryCode` VARCHAR(191) NOT NULL,
    `phoneInternationalNumber` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `theme` ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('user', 'manager', 'admin') NOT NULL DEFAULT 'user',
    `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    `permissionOverrides` JSON NULL,
    `reportsToId` VARCHAR(191) NULL,
    `consent` BOOLEAN NOT NULL DEFAULT false,
    `accountConfirmationStatus` BOOLEAN NOT NULL DEFAULT false,
    `accountConfirmationToken` VARCHAR(191) NOT NULL,
    `accountConfirmationCode` VARCHAR(191) NOT NULL,
    `accountConfirmationTimestamp` DATETIME(3) NULL,
    `passwordResetToken` VARCHAR(191) NULL,
    `passwordResetExpiry` BIGINT NULL,
    `passwordResetLastResetAt` DATETIME(3) NULL,
    `refreshToken` TEXT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_reportsToId_idx`(`reportsToId`),
    UNIQUE INDEX `users_phoneCountryCode_phoneInternationalNumber_key`(`phoneCountryCode`, `phoneInternationalNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `address` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_locations` (
    `userId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`userId`, `locationId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NULL,
    `date` CHAR(10) NOT NULL,
    `description` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `holidays_date_idx`(`date`),
    UNIQUE INDEX `holidays_locationId_date_key`(`locationId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('user', 'manager', 'admin') NOT NULL,
    `module` VARCHAR(40) NOT NULL,
    `canView` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_permissions_role_module_key`(`role`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_templates` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `priority` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    `kind` ENUM('one_time', 'recurring') NOT NULL,
    `recurrence` ENUM('daily', 'weekly', 'custom') NULL,
    `weekdays` JSON NULL,
    `scheduledDate` CHAR(10) NULL,
    `skipOnHoliday` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deactivatedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `task_templates_locationId_idx`(`locationId`),
    INDEX `task_templates_createdById_idx`(`createdById`),
    INDEX `task_templates_kind_idx`(`kind`),
    INDEX `task_templates_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_template_items` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `dueTime` VARCHAR(5) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `task_template_items_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_template_assignees` (
    `templateId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `task_template_assignees_userId_idx`(`userId`),
    PRIMARY KEY (`templateId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_instances` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `locationId` VARCHAR(191) NOT NULL,
    `scheduledDate` CHAR(10) NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `overdueAt` DATETIME(3) NOT NULL,
    `status` ENUM('pending', 'done_on_time', 'done_late', 'overdue', 'skipped_holiday') NOT NULL DEFAULT 'pending',
    `skipOnHoliday` BOOLEAN NOT NULL DEFAULT true,
    `boardX` DOUBLE NOT NULL DEFAULT 4,
    `boardY` DOUBLE NOT NULL DEFAULT 4,
    `boardZ` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `late` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `task_instances_scheduledDate_idx`(`scheduledDate`),
    INDEX `task_instances_status_idx`(`status`),
    INDEX `task_instances_overdueAt_idx`(`overdueAt`),
    UNIQUE INDEX `task_instances_templateId_scheduledDate_key`(`templateId`, `scheduledDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_instance_items` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `dueTime` VARCHAR(5) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `dueAt` DATETIME(3) NOT NULL,
    `overdueAt` DATETIME(3) NOT NULL,
    `status` ENUM('pending', 'done_on_time', 'done_late', 'overdue', 'skipped_holiday') NOT NULL DEFAULT 'pending',
    `completedAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `late` BOOLEAN NOT NULL DEFAULT false,
    `completedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `task_instance_items_instanceId_idx`(`instanceId`),
    INDEX `task_instance_items_completedById_idx`(`completedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_instance_photos` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `instanceItemId` VARCHAR(191) NULL,
    `url` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_instance_photos_instanceId_idx`(`instanceId`),
    INDEX `task_instance_photos_instanceItemId_idx`(`instanceItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `instanceItemId` VARCHAR(191) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_notifications_recipientId_resolved_idx`(`recipientId`, `resolved`),
    INDEX `task_notifications_instanceId_idx`(`instanceId`),
    INDEX `task_notifications_instanceItemId_idx`(`instanceItemId`),
    UNIQUE INDEX `task_notifications_recipientId_instanceItemId_key`(`recipientId`, `instanceItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_reportsToId_fkey` FOREIGN KEY (`reportsToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_locations` ADD CONSTRAINT `user_locations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_locations` ADD CONSTRAINT `user_locations_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_templates` ADD CONSTRAINT `task_templates_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_templates` ADD CONSTRAINT `task_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_template_items` ADD CONSTRAINT `task_template_items_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `task_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_template_assignees` ADD CONSTRAINT `task_template_assignees_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `task_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_template_assignees` ADD CONSTRAINT `task_template_assignees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instances` ADD CONSTRAINT `task_instances_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `task_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instances` ADD CONSTRAINT `task_instances_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instance_items` ADD CONSTRAINT `task_instance_items_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `task_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instance_items` ADD CONSTRAINT `task_instance_items_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instance_photos` ADD CONSTRAINT `task_instance_photos_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `task_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_instance_photos` ADD CONSTRAINT `task_instance_photos_instanceItemId_fkey` FOREIGN KEY (`instanceItemId`) REFERENCES `task_instance_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_notifications` ADD CONSTRAINT `task_notifications_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_notifications` ADD CONSTRAINT `task_notifications_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `task_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_notifications` ADD CONSTRAINT `task_notifications_instanceItemId_fkey` FOREIGN KEY (`instanceItemId`) REFERENCES `task_instance_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
