-- CreateEnum
CREATE TYPE "SettlementMethod" AS ENUM ('STRIPE', 'MEAL_PLAN_CREDITS');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED', 'MERGED');

-- CreateEnum
CREATE TYPE "GuestSource" AS ENUM ('CHECKOUT', 'MANUAL', 'IMPORT', 'OTHER');

-- CreateTable
CREATE TABLE "RotationPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE',
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "rotationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "substitutions" JSONB,
    "modifiers" JSONB,
    "proteinBoost" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RotationPeriodMeals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RotationPeriodMeals_AB_pkey" PRIMARY KEY ("A","B")
);

-- AlterTable
ALTER TABLE "WeeklyRotation"
ADD COLUMN     "rotationPeriodId" TEXT;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "customerDeliveryAddress" TEXT,
ADD COLUMN     "customerDeliveryCity" TEXT,
ADD COLUMN     "customerDeliveryPostal" TEXT,
ADD COLUMN     "customerDeliveryNotes" TEXT,
ADD COLUMN     "customerIsGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderIntent"
ADD COLUMN     "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "user"
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestSource" "GuestSource",
ADD COLUMN     "guestSourceId" TEXT,
ADD COLUMN     "guestMetadata" JSONB,
ADD COLUMN     "mergedIntoUserId" TEXT,
ADD COLUMN     "mergedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WeeklyRotation_rotationPeriodId_idx" ON "WeeklyRotation"("rotationPeriodId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_status_idx" ON "Cart"("status");

-- CreateIndex
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_mealId_idx" ON "CartItem"("mealId");

-- CreateIndex
CREATE INDEX "CartItem_rotationId_idx" ON "CartItem"("rotationId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "user_isGuest_idx" ON "user"("isGuest");

-- CreateIndex
CREATE INDEX "user_mergedIntoUserId_idx" ON "user"("mergedIntoUserId");

-- CreateIndex
CREATE INDEX "_RotationPeriodMeals_B_index" ON "_RotationPeriodMeals"("B");

-- AddForeignKey
ALTER TABLE "WeeklyRotation" ADD CONSTRAINT "WeeklyRotation_rotationPeriodId_fkey" FOREIGN KEY ("rotationPeriodId") REFERENCES "RotationPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_mergedIntoUserId_fkey" FOREIGN KEY ("mergedIntoUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationPeriodMeals" ADD CONSTRAINT "_RotationPeriodMeals_A_fkey" FOREIGN KEY ("A") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationPeriodMeals" ADD CONSTRAINT "_RotationPeriodMeals_B_fkey" FOREIGN KEY ("B") REFERENCES "RotationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
