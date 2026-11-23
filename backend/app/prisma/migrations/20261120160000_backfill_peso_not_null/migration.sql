-- Backfill peso column: set NULL to 0, then make NOT NULL with default 0
UPDATE "produto" SET "peso" = 0 WHERE "peso" IS NULL;

-- After backfill, alter column to NOT NULL with default 0
ALTER TABLE "produto" ALTER COLUMN "peso" SET NOT NULL;
ALTER TABLE "produto" ALTER COLUMN "peso" SET DEFAULT 0;