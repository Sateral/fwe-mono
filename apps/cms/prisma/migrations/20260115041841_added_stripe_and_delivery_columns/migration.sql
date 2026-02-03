/*
  Warnings:

  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeSessionId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mealId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rotationId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('SIGNATURE', 'ROTATING');

-- CreateEnum
CREATE TYPE "RotationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FailedOrderStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED', 'ABANDONED');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_mealId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "mealType" "MealType" NOT NULL DEFAULT 'SIGNATURE';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "mealId" TEXT NOT NULL,
ADD COLUMN     "modifiers" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "proteinBoost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "rotationId" TEXT NOT NULL,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
ADD COLUMN     "substitutions" JSONB,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "deliveryPostal" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_customer_id" TEXT;

-- DropTable
DROP TABLE "OrderItem";

-- CreateTable
CREATE TABLE "WeeklyRotation" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "orderCutoff" TIMESTAMP(3) NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedOrder" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "orderData" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorCode" TEXT,
    "status" "FailedOrderStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "FailedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RotationMeals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RotationMeals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "WeeklyRotation_status_idx" ON "WeeklyRotation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRotation_weekStart_key" ON "WeeklyRotation"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "FailedOrder_stripeSessionId_key" ON "FailedOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "FailedOrder_status_idx" ON "FailedOrder"("status");

-- CreateIndex
CREATE INDEX "FailedOrder_createdAt_idx" ON "FailedOrder"("createdAt");

-- CreateIndex
CREATE INDEX "_RotationMeals_B_index" ON "_RotationMeals"("B");

-- CreateIndex
CREATE INDEX "Meal_isActive_idx" ON "Meal"("isActive");

-- CreateIndex
CREATE INDEX "Meal_isFeatured_idx" ON "Meal"("isFeatured");

-- CreateIndex
CREATE INDEX "Meal_mealType_idx" ON "Meal"("mealType");

-- CreateIndex
CREATE INDEX "Meal_isActive_isFeatured_idx" ON "Meal"("isActive", "isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_rotationId_idx" ON "Order"("rotationId");

-- CreateIndex
CREATE INDEX "Order_mealId_idx" ON "Order"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "user_stripe_customer_id_key" ON "user"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationMeals" ADD CONSTRAINT "_RotationMeals_A_fkey" FOREIGN KEY ("A") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationMeals" ADD CONSTRAINT "_RotationMeals_B_fkey" FOREIGN KEY ("B") REFERENCES "WeeklyRotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
