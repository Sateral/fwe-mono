-- Allow meal deletion by:
-- 1. Adding mealName snapshot to Order (for archive purposes)
-- 2. Making mealId nullable on Order, OrderIntent, CheckoutSessionItem with SetNull
-- 3. Adding Cascade delete on CartItem (carts are temporary)

-- First, add mealName column as nullable to populate it
ALTER TABLE "Order" ADD COLUMN "mealName" TEXT;

-- Populate mealName from the related Meal for existing orders
UPDATE "Order" o SET "mealName" = m."name" FROM "Meal" m WHERE o."mealId" = m."id";

-- Set a fallback for any orders without a meal (shouldn't happen, but safety first)
UPDATE "Order" SET "mealName" = 'Unknown Meal' WHERE "mealName" IS NULL;

-- Now make mealName NOT NULL
ALTER TABLE "Order" ALTER COLUMN "mealName" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_mealId_fkey";
ALTER TABLE "CheckoutSessionItem" DROP CONSTRAINT "CheckoutSessionItem_mealId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT "Order_mealId_fkey";
ALTER TABLE "OrderIntent" DROP CONSTRAINT "OrderIntent_mealId_fkey";

-- AlterTable - make mealId nullable
ALTER TABLE "CheckoutSessionItem" ALTER COLUMN "mealId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "mealId" DROP NOT NULL;
ALTER TABLE "OrderIntent" ALTER COLUMN "mealId" DROP NOT NULL;

-- AddForeignKey with proper onDelete behavior
ALTER TABLE "Order" ADD CONSTRAINT "Order_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
