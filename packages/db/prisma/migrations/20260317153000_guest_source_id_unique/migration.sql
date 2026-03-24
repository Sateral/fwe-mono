WITH duplicate_checkout_guests AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "guestSourceId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_number
  FROM "user"
  WHERE
    "isGuest" = TRUE
    AND "guestSource" = 'CHECKOUT'
    AND "mergedIntoUserId" IS NULL
    AND "guestSourceId" IS NOT NULL
)
UPDATE "user"
SET "guestSourceId" = NULL
WHERE id IN (
  SELECT id
  FROM duplicate_checkout_guests
  WHERE row_number > 1
);

CREATE UNIQUE INDEX "user_guestSourceId_key" ON "user"("guestSourceId");
