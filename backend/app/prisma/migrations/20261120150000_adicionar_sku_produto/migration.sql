-- Add SKU column to produto table
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "sku" TEXT;