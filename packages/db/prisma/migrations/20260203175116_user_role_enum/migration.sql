-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING (
  CASE
    WHEN "role" IS NULL THEN 'USER'
    WHEN lower("role") = 'admin' THEN 'ADMIN'
    WHEN lower("role") = 'user' THEN 'USER'
    ELSE 'USER'
  END
)::"Role";

ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;
