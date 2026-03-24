CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'SKIPPED', 'COMPLETED');

ALTER TABLE "user"
ADD COLUMN "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING';
