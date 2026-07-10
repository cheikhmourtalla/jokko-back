-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "primaryShopId" INTEGER;

-- CreateTable
CREATE TABLE "shop_owners" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_owners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_owners_userId_shopId_key" ON "shop_owners"("userId", "shopId");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_primaryShopId_fkey" FOREIGN KEY ("primaryShopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_owners" ADD CONSTRAINT "shop_owners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_owners" ADD CONSTRAINT "shop_owners_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
