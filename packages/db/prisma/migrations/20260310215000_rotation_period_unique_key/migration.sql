-- AlterTable
ALTER TABLE "RotationPeriod"
ADD COLUMN "key" TEXT;

-- Backfill existing records from the current logical key source
UPDATE "RotationPeriod"
SET "key" = "name"
WHERE "key" IS NULL;

-- Guard against duplicate logical keys before enforcing uniqueness
DO $$
DECLARE
  duplicate_key TEXT;
BEGIN
  SELECT "key"
  INTO duplicate_key
  FROM "RotationPeriod"
  GROUP BY "key"
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate_key IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate RotationPeriod key detected: %', duplicate_key;
  END IF;
END $$;

-- Finalize the additive unique key
ALTER TABLE "RotationPeriod"
ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX "RotationPeriod_key_key" ON "RotationPeriod"("key");
