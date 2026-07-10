-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_productId_fkey`;
-- DropForeignKey
ALTER TABLE `StockMovement` DROP FOREIGN KEY `StockMovement_productId_fkey`;
-- DropForeignKey
ALTER TABLE `SupplierPayment` DROP FOREIGN KEY `SupplierPayment_supplierId_fkey`;
-- DropForeignKey
ALTER TABLE `Supply` DROP FOREIGN KEY `Supply_productId_fkey`;
-- DropForeignKey
ALTER TABLE `Supply` DROP FOREIGN KEY `Supply_supplierId_fkey`;
-- DropIndex
DROP INDEX `Sale_productId_fkey` ON `Sale`;
-- DropIndex
DROP INDEX `StockMovement_productId_fkey` ON `StockMovement`;
-- DropIndex
DROP INDEX `SupplierPayment_supplierId_fkey` ON `SupplierPayment`;
-- DropIndex
DROP INDEX `Supply_productId_fkey` ON `Supply`;
-- DropIndex
DROP INDEX `Supply_supplierId_fkey` ON `Supply`;
-- AlterTable
ALTER TABLE `Supply` ADD COLUMN `note` VARCHAR(191) NULL,
    MODIFY `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `remaining` DOUBLE NOT NULL DEFAULT 0;
-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `Supply` ADD CONSTRAINT `Supply_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `Supply` ADD CONSTRAINT `Supply_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `SupplierPayment` ADD CONSTRAINT `SupplierPayment_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;