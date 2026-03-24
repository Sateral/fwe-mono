-- ALTER TYPE ADD VALUE is non-transactional; IF NOT EXISTS handles reruns.
ALTER TYPE "MealPlanLedgerEvent" ADD VALUE IF NOT EXISTS 'PURCHASE';
ALTER TYPE "MealPlanLedgerEvent" ADD VALUE IF NOT EXISTS 'REDEMPTION';

CREATE INDEX IF NOT EXISTS "MealPlanCreditLedger_mealPlanId_referenceType_referenceId_idx"
ON "MealPlanCreditLedger"("mealPlanId", "referenceType", "referenceId");

CREATE UNIQUE INDEX IF NOT EXISTS "MealPlanCreditLedger_redemption_reference_key"
ON "MealPlanCreditLedger"("mealPlanId", "eventType", "referenceType", "referenceId")
WHERE "eventType" = 'REDEMPTION'
  AND "referenceType" IS NOT NULL
  AND "referenceId" IS NOT NULL;
