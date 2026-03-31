-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ModifierType" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderIntentStatus" AS ENUM ('CREATED', 'SESSION_CREATED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RotationStatus" AS ENUM ('DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "SettlementMethod" AS ENUM ('STRIPE', 'MEAL_PLAN_CREDITS');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED', 'MERGED');

-- CreateEnum
CREATE TYPE "GuestSource" AS ENUM ('CHECKOUT', 'MANUAL', 'IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MealPlanLedgerEvent" AS ENUM ('PURCHASE', 'REDEMPTION', 'PLAN_STARTED', 'PLAN_RENEWED', 'ORDER_REDEEMED', 'ORDER_REVERSED', 'MANUAL_ADJUSTMENT', 'REFERRAL_BONUS', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "FlavorProfileInvolvement" AS ENUM ('HANDS_ON', 'HANDS_OFF');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'SKIPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReferralCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('STANDARD', 'MEAL_PLAN', 'DISCOUNT', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "FailedOrderStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT,
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "calories" INTEGER NOT NULL DEFAULT 0,
    "protein" INTEGER NOT NULL DEFAULT 0,
    "carbs" INTEGER NOT NULL DEFAULT 0,
    "fat" INTEGER NOT NULL DEFAULT 0,
    "fiber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstitutionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,

    CONSTRAINT "SubstitutionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstitutionOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priceAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "calorieAdjust" INTEGER NOT NULL DEFAULT 0,
    "proteinAdjust" INTEGER NOT NULL DEFAULT 0,
    "carbsAdjust" INTEGER NOT NULL DEFAULT 0,
    "fatAdjust" INTEGER NOT NULL DEFAULT 0,
    "fiberAdjust" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "SubstitutionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ModifierType" NOT NULL,
    "minSelection" INTEGER NOT NULL DEFAULT 0,
    "maxSelection" INTEGER,
    "mealId" TEXT NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "modifierGroupId" TEXT NOT NULL,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietaryTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "icon" TEXT NOT NULL DEFAULT 'circle',

    CONSTRAINT "DietaryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE',
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerDeliveryAddress" TEXT,
    "customerDeliveryCity" TEXT,
    "customerDeliveryPostal" TEXT,
    "customerDeliveryNotes" TEXT,
    "customerIsGuest" BOOLEAN NOT NULL DEFAULT false,
    "mealId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
    "pickupLocation" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NEW',
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeRefundId" TEXT,
    "stripeBalanceTransactionId" TEXT,
    "orderIntentId" TEXT,
    "checkoutSessionId" TEXT,
    "orderGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rotationId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSubstitution" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "OrderSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderModifier" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "OrderModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItemSubstitution" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "CartItemSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItemModifier" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "CartItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentSubstitution" (
    "id" TEXT NOT NULL,
    "orderIntentId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "IntentSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentModifier" (
    "id" TEXT NOT NULL,
    "orderIntentId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "IntentModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutItemSubstitution" (
    "id" TEXT NOT NULL,
    "checkoutSessionItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "CheckoutItemSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutItemModifier" (
    "id" TEXT NOT NULL,
    "checkoutSessionItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "groupId" TEXT,
    "optionId" TEXT,

    CONSTRAINT "CheckoutItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderGroup" (
    "id" TEXT NOT NULL,
    "checkoutSessionId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentStatusChange" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "FulfillmentStatus" NOT NULL,
    "toStatus" "FulfillmentStatus" NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationPeriod" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRotation" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "orderCutoff" TIMESTAMP(3) NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'DRAFT',
    "rotationPeriodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT,
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
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "priceSource" "PriceSource" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
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
    "adminNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "FailedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIntent" (
    "id" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "settlementMethod" "SettlementMethod" NOT NULL DEFAULT 'STRIPE',
    "notes" TEXT,
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
    "pickupLocation" TEXT,
    "status" "OrderIntentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "notes" TEXT,
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'DELIVERY',
    "pickupLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSessionItem_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "stripe_customer_id" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestSource" "GuestSource",
    "guestSourceId" TEXT,
    "guestMetadata" JSONB,
    "mergedIntoUserId" TEXT,
    "mergedAt" TIMESTAMP(3),
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT,
    "deliveryAddress" TEXT,
    "deliveryCity" TEXT,
    "deliveryPostal" TEXT,
    "deliveryNotes" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MealPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "weeklyCreditCap" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "priceAtPurchase" DECIMAL(10,2),
    "billingInterval" TEXT,
    "billingCurrency" TEXT NOT NULL DEFAULT 'cad',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanWindowUsage" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlanWindowUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanCreditLedger" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "eventType" "MealPlanLedgerEvent" NOT NULL,
    "creditDelta" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlanCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlavorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goals" TEXT[],
    "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "involvement" "FlavorProfileInvolvement" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlavorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxUses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralUse" (
    "id" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RotationMeals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RotationMeals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RotationPeriodMeals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RotationPeriodMeals_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DietaryTagToMeal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DietaryTagToMeal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meal_slug_key" ON "Meal"("slug");

-- CreateIndex
CREATE INDEX "Meal_isFeatured_idx" ON "Meal"("isFeatured");

-- CreateIndex
CREATE INDEX "SubstitutionGroup_mealId_idx" ON "SubstitutionGroup"("mealId");

-- CreateIndex
CREATE INDEX "SubstitutionOption_groupId_idx" ON "SubstitutionOption"("groupId");

-- CreateIndex
CREATE INDEX "ModifierGroup_mealId_idx" ON "ModifierGroup"("mealId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_idx" ON "ModifierOption"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "DietaryTag_name_key" ON "DietaryTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderIntentId_key" ON "Order"("orderIntentId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_rotationId_idx" ON "Order"("rotationId");

-- CreateIndex
CREATE INDEX "Order_mealId_idx" ON "Order"("mealId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_stripeSessionId_idx" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_checkoutSessionId_idx" ON "Order"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "Order_orderGroupId_idx" ON "Order"("orderGroupId");

-- CreateIndex
CREATE INDEX "OrderSubstitution_orderId_idx" ON "OrderSubstitution"("orderId");

-- CreateIndex
CREATE INDEX "OrderSubstitution_groupId_idx" ON "OrderSubstitution"("groupId");

-- CreateIndex
CREATE INDEX "OrderSubstitution_optionId_idx" ON "OrderSubstitution"("optionId");

-- CreateIndex
CREATE INDEX "OrderModifier_orderId_idx" ON "OrderModifier"("orderId");

-- CreateIndex
CREATE INDEX "OrderModifier_groupId_idx" ON "OrderModifier"("groupId");

-- CreateIndex
CREATE INDEX "OrderModifier_optionId_idx" ON "OrderModifier"("optionId");

-- CreateIndex
CREATE INDEX "CartItemSubstitution_cartItemId_idx" ON "CartItemSubstitution"("cartItemId");

-- CreateIndex
CREATE INDEX "CartItemModifier_cartItemId_idx" ON "CartItemModifier"("cartItemId");

-- CreateIndex
CREATE INDEX "IntentSubstitution_orderIntentId_idx" ON "IntentSubstitution"("orderIntentId");

-- CreateIndex
CREATE INDEX "IntentModifier_orderIntentId_idx" ON "IntentModifier"("orderIntentId");

-- CreateIndex
CREATE INDEX "CheckoutItemSubstitution_checkoutSessionItemId_idx" ON "CheckoutItemSubstitution"("checkoutSessionItemId");

-- CreateIndex
CREATE INDEX "CheckoutItemModifier_checkoutSessionItemId_idx" ON "CheckoutItemModifier"("checkoutSessionItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderGroup_checkoutSessionId_key" ON "OrderGroup"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderGroup_stripeSessionId_key" ON "OrderGroup"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderGroup_stripePaymentIntentId_key" ON "OrderGroup"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "FulfillmentStatusChange_orderId_idx" ON "FulfillmentStatusChange"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentStatusChange_createdAt_idx" ON "FulfillmentStatusChange"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RotationPeriod_key_key" ON "RotationPeriod"("key");

-- CreateIndex
CREATE INDEX "WeeklyRotation_status_idx" ON "WeeklyRotation"("status");

-- CreateIndex
CREATE INDEX "WeeklyRotation_rotationPeriodId_idx" ON "WeeklyRotation"("rotationPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRotation_weekStart_key" ON "WeeklyRotation"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_clientRequestId_key" ON "Cart"("clientRequestId");

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
CREATE UNIQUE INDEX "FailedOrder_stripeSessionId_key" ON "FailedOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "FailedOrder_status_idx" ON "FailedOrder"("status");

-- CreateIndex
CREATE INDEX "FailedOrder_createdAt_idx" ON "FailedOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIntent_clientRequestId_key" ON "OrderIntent"("clientRequestId");

-- CreateIndex
CREATE INDEX "OrderIntent_userId_idx" ON "OrderIntent"("userId");

-- CreateIndex
CREATE INDEX "OrderIntent_status_idx" ON "OrderIntent"("status");

-- CreateIndex
CREATE INDEX "OrderIntent_createdAt_idx" ON "OrderIntent"("createdAt");

-- CreateIndex
CREATE INDEX "OrderIntent_rotationId_idx" ON "OrderIntent"("rotationId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_clientRequestId_key" ON "CheckoutSession"("clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_stripeSessionId_key" ON "CheckoutSession"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_stripePaymentIntentId_key" ON "CheckoutSession"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "CheckoutSession_cartId_idx" ON "CheckoutSession"("cartId");

-- CreateIndex
CREATE INDEX "CheckoutSession_userId_idx" ON "CheckoutSession"("userId");

-- CreateIndex
CREATE INDEX "CheckoutSession_status_idx" ON "CheckoutSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSessionItem_orderIntentId_key" ON "CheckoutSessionItem"("orderIntentId");

-- CreateIndex
CREATE INDEX "CheckoutSessionItem_checkoutSessionId_idx" ON "CheckoutSessionItem"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "CheckoutSessionItem_mealId_idx" ON "CheckoutSessionItem"("mealId");

-- CreateIndex
CREATE INDEX "CheckoutSessionItem_rotationId_idx" ON "CheckoutSessionItem"("rotationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentEvent_eventType_idx" ON "PaymentEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_stripe_customer_id_key" ON "user"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_guestSourceId_key" ON "user"("guestSourceId");

-- CreateIndex
CREATE INDEX "user_isGuest_idx" ON "user"("isGuest");

-- CreateIndex
CREATE INDEX "user_mergedIntoUserId_idx" ON "user"("mergedIntoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_key" ON "MealPlan"("userId");

-- CreateIndex
CREATE INDEX "MealPlan_status_idx" ON "MealPlan"("status");

-- CreateIndex
CREATE INDEX "MealPlanWindowUsage_windowStart_idx" ON "MealPlanWindowUsage"("windowStart");

-- CreateIndex
CREATE INDEX "MealPlanWindowUsage_windowEnd_idx" ON "MealPlanWindowUsage"("windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanWindowUsage_mealPlanId_windowStart_key" ON "MealPlanWindowUsage"("mealPlanId", "windowStart");

-- CreateIndex
CREATE INDEX "MealPlanCreditLedger_mealPlanId_createdAt_idx" ON "MealPlanCreditLedger"("mealPlanId", "createdAt");

-- CreateIndex
CREATE INDEX "MealPlanCreditLedger_mealPlanId_referenceType_referenceId_idx" ON "MealPlanCreditLedger"("mealPlanId", "referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "MealPlanCreditLedger_eventType_idx" ON "MealPlanCreditLedger"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "FlavorProfile_userId_key" ON "FlavorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_ownerUserId_key" ON "ReferralCode"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_status_idx" ON "ReferralCode"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_referredUserId_key" ON "ReferralUse"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_orderId_key" ON "ReferralUse"("orderId");

-- CreateIndex
CREATE INDEX "ReferralUse_referralCodeId_idx" ON "ReferralUse"("referralCodeId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "_RotationMeals_B_index" ON "_RotationMeals"("B");

-- CreateIndex
CREATE INDEX "_RotationPeriodMeals_B_index" ON "_RotationPeriodMeals"("B");

-- CreateIndex
CREATE INDEX "_DietaryTagToMeal_B_index" ON "_DietaryTagToMeal"("B");

-- AddForeignKey
ALTER TABLE "SubstitutionGroup" ADD CONSTRAINT "SubstitutionGroup_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstitutionOption" ADD CONSTRAINT "SubstitutionOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SubstitutionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSubstitution" ADD CONSTRAINT "OrderSubstitution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSubstitution" ADD CONSTRAINT "OrderSubstitution_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SubstitutionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSubstitution" ADD CONSTRAINT "OrderSubstitution_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SubstitutionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderModifier" ADD CONSTRAINT "OrderModifier_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderModifier" ADD CONSTRAINT "OrderModifier_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderModifier" ADD CONSTRAINT "OrderModifier_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ModifierOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemSubstitution" ADD CONSTRAINT "CartItemSubstitution_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemModifier" ADD CONSTRAINT "CartItemModifier_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentSubstitution" ADD CONSTRAINT "IntentSubstitution_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentModifier" ADD CONSTRAINT "IntentModifier_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItemSubstitution" ADD CONSTRAINT "CheckoutItemSubstitution_checkoutSessionItemId_fkey" FOREIGN KEY ("checkoutSessionItemId") REFERENCES "CheckoutSessionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutItemModifier" ADD CONSTRAINT "CheckoutItemModifier_checkoutSessionItemId_fkey" FOREIGN KEY ("checkoutSessionItemId") REFERENCES "CheckoutSessionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentStatusChange" ADD CONSTRAINT "FulfillmentStatusChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentStatusChange" ADD CONSTRAINT "FulfillmentStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "WeeklyRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderIntentId_fkey" FOREIGN KEY ("orderIntentId") REFERENCES "OrderIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_mergedIntoUserId_fkey" FOREIGN KEY ("mergedIntoUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanWindowUsage" ADD CONSTRAINT "MealPlanWindowUsage_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanCreditLedger" ADD CONSTRAINT "MealPlanCreditLedger_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlavorProfile" ADD CONSTRAINT "FlavorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationMeals" ADD CONSTRAINT "_RotationMeals_A_fkey" FOREIGN KEY ("A") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationMeals" ADD CONSTRAINT "_RotationMeals_B_fkey" FOREIGN KEY ("B") REFERENCES "WeeklyRotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationPeriodMeals" ADD CONSTRAINT "_RotationPeriodMeals_A_fkey" FOREIGN KEY ("A") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RotationPeriodMeals" ADD CONSTRAINT "_RotationPeriodMeals_B_fkey" FOREIGN KEY ("B") REFERENCES "RotationPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToMeal" ADD CONSTRAINT "_DietaryTagToMeal_A_fkey" FOREIGN KEY ("A") REFERENCES "DietaryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DietaryTagToMeal" ADD CONSTRAINT "_DietaryTagToMeal_B_fkey" FOREIGN KEY ("B") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
