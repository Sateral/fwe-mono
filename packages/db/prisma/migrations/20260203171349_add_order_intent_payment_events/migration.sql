-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderIntentStatus" AS ENUM ('CREATED', 'SESSION_CREATED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'cad',
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "orderIntentId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripeBalanceTransactionId" TEXT,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT;

-- DropEnum
DROP TYPE "OrderStatus";

-- CreateTable
CREATE TABLE "OrderIntent" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "substitutions" JSONB,
    "modifiers" JSONB,
    "proteinBoost" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
    "pickupLocation" TEXT,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'CREATED',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "orderIntentId" TEXT,
    "orderId" TEXT,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_clientRequestId_key" ON "OrderIntent"("clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_stripeSessionId_key" ON "OrderIntent"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_stripePaymentIntentId_key" ON "OrderIntent"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "OrderIntent_userId_idx" ON "OrderIntent"("userId");

-- CreateIndex
CREATE INDEX "OrderIntent_status_idx" ON "OrderIntent"("status");

-- CreateIndex
CREATE INDEX "OrderIntent_createdAt_idx" ON "OrderIntent"("createdAt");

-- CreateIndex
CREATE INDEX "OrderIntent_rotationId_idx" ON "OrderIntent"("rotationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_eventType_idx" ON "PaymentEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ModifierGroup_mealId_idx" ON "ModifierGroup"("mealId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_idx" ON "ModifierOption"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderIntentId_key" ON "Order"("orderIntentId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "SubstitutionGroup_mealId_idx" ON "SubstitutionGroup"("mealId");

-- CreateIndex
CREATE INDEX "SubstitutionOption_groupId_idx" ON "SubstitutionOption"("groupId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
