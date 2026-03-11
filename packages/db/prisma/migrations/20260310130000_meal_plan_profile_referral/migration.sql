-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MealPlanLedgerEvent" AS ENUM (
    'PLAN_STARTED',
    'PLAN_RENEWED',
    'ORDER_REDEEMED',
    'ORDER_REVERSED',
    'MANUAL_ADJUSTMENT',
    'REFERRAL_BONUS',
    'EXPIRATION'
);

-- CreateEnum
CREATE TYPE "FlavorProfileInvolvement" AS ENUM ('HANDS_ON', 'HANDS_OFF');

-- CreateEnum
CREATE TYPE "ReferralCodeStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "Meal"
ALTER COLUMN "price" TYPE DECIMAL(10, 2) USING "price"::DECIMAL(10, 2),
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "SubstitutionOption"
ALTER COLUMN "priceAdjustment" TYPE DECIMAL(10, 2) USING "priceAdjustment"::DECIMAL(10, 2),
ALTER COLUMN "priceAdjustment" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ModifierOption"
ALTER COLUMN "extraPrice" TYPE DECIMAL(10, 2) USING "extraPrice"::DECIMAL(10, 2),
ALTER COLUMN "extraPrice" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Order"
ALTER COLUMN "unitPrice" TYPE DECIMAL(10, 2) USING "unitPrice"::DECIMAL(10, 2),
ALTER COLUMN "totalAmount" TYPE DECIMAL(10, 2) USING "totalAmount"::DECIMAL(10, 2),
ALTER COLUMN "refundAmount" TYPE DECIMAL(10, 2) USING "refundAmount"::DECIMAL(10, 2),
ALTER COLUMN "refundAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "CartItem"
ALTER COLUMN "unitPrice" TYPE DECIMAL(10, 2) USING "unitPrice"::DECIMAL(10, 2);

-- AlterTable
ALTER TABLE "OrderIntent"
ALTER COLUMN "unitPrice" TYPE DECIMAL(10, 2) USING "unitPrice"::DECIMAL(10, 2),
ALTER COLUMN "totalAmount" TYPE DECIMAL(10, 2) USING "totalAmount"::DECIMAL(10, 2);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MealPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "weeklyCreditCap" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_key" ON "MealPlan"("userId");

-- CreateIndex
CREATE INDEX "MealPlan_status_idx" ON "MealPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanWindowUsage_mealPlanId_windowStart_key" ON "MealPlanWindowUsage"("mealPlanId", "windowStart");

-- CreateIndex
CREATE INDEX "MealPlanWindowUsage_windowStart_idx" ON "MealPlanWindowUsage"("windowStart");

-- CreateIndex
CREATE INDEX "MealPlanWindowUsage_windowEnd_idx" ON "MealPlanWindowUsage"("windowEnd");

-- CreateIndex
CREATE INDEX "MealPlanCreditLedger_mealPlanId_createdAt_idx" ON "MealPlanCreditLedger"("mealPlanId", "createdAt");

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
