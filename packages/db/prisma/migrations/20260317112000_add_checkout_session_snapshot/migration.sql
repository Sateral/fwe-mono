-- Create immutable checkout session snapshot tables
CREATE TABLE "CheckoutSession" (
  "id" TEXT NOT NULL,
  "clientRequestId" TEXT,
  "cartId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE',
  "status" "OrderIntentStatus" NOT NULL DEFAULT 'CREATED',
  "customerEmail" TEXT NOT NULL,
  "customerName" TEXT,
  "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
  "pickupLocation" TEXT,
  "stripeSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeChargeId" TEXT,
  "stripeBalanceTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckoutSessionItem" (
  "id" TEXT NOT NULL,
  "checkoutSessionId" TEXT NOT NULL,
  "orderIntentId" TEXT NOT NULL,
  "mealId" TEXT NOT NULL,
  "mealName" TEXT NOT NULL,
  "mealSlug" TEXT NOT NULL,
  "mealImageUrl" TEXT,
  "rotationId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "substitutions" JSONB,
  "modifiers" JSONB,
  "proteinBoost" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
  "pickupLocation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutSessionItem_pkey" PRIMARY KEY ("id")
);

-- Remove unsafe uniqueness for shared Stripe identifiers in multi-item checkout
DROP INDEX IF EXISTS "Order_stripeSessionId_key";
DROP INDEX IF EXISTS "Order_stripePaymentIntentId_key";
DROP INDEX IF EXISTS "OrderIntent_stripeSessionId_key";
DROP INDEX IF EXISTS "OrderIntent_stripePaymentIntentId_key";

ALTER TABLE "OrderIntent" DROP COLUMN IF EXISTS "stripeSessionId";
ALTER TABLE "OrderIntent" DROP COLUMN IF EXISTS "stripePaymentIntentId";

CREATE UNIQUE INDEX "CheckoutSession_stripeSessionId_key" ON "CheckoutSession"("stripeSessionId");
CREATE UNIQUE INDEX "CheckoutSession_stripePaymentIntentId_key" ON "CheckoutSession"("stripePaymentIntentId");
CREATE UNIQUE INDEX "CheckoutSession_clientRequestId_key" ON "CheckoutSession"("clientRequestId");
CREATE UNIQUE INDEX "CheckoutSessionItem_orderIntentId_key" ON "CheckoutSessionItem"("orderIntentId");

CREATE INDEX "Order_stripeSessionId_idx" ON "Order"("stripeSessionId");
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");
CREATE INDEX "CheckoutSession_cartId_idx" ON "CheckoutSession"("cartId");
CREATE INDEX "CheckoutSession_userId_idx" ON "CheckoutSession"("userId");
CREATE INDEX "CheckoutSession_status_idx" ON "CheckoutSession"("status");
CREATE INDEX "CheckoutSessionItem_checkoutSessionId_idx" ON "CheckoutSessionItem"("checkoutSessionId");
CREATE INDEX "CheckoutSessionItem_mealId_idx" ON "CheckoutSessionItem"("mealId");
CREATE INDEX "CheckoutSessionItem_rotationId_idx" ON "CheckoutSessionItem"("rotationId");

ALTER TABLE "CheckoutSession"
ADD CONSTRAINT "CheckoutSession_cartId_fkey"
FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutSession"
ADD CONSTRAINT "CheckoutSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutSessionItem"
ADD CONSTRAINT "CheckoutSessionItem_checkoutSessionId_fkey"
FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutSessionItem"
ADD CONSTRAINT "CheckoutSessionItem_orderIntentId_fkey"
FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutSessionItem"
ADD CONSTRAINT "CheckoutSessionItem_mealId_fkey"
FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckoutSessionItem"
ADD CONSTRAINT "CheckoutSessionItem_rotationId_fkey"
FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
