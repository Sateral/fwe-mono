-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "fiber" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubstitutionOption" ADD COLUMN     "fiberAdjust" INTEGER NOT NULL DEFAULT 0;
