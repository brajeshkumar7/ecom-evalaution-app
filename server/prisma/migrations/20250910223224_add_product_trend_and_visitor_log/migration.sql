-- CreateTable
CREATE TABLE `ProductTrend` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `trendDate` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitorLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `visitDate` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
