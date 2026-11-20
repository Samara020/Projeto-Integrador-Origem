-- Add new columns to produto table for product details
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "material" TEXT;
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "dimensoes" TEXT;
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "peso" DECIMAL(10,2);
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "certificado" TEXT;
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "informacoes_origem" TEXT;
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "prazo_producao_dias" INTEGER;
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "capacidade_producao" INTEGER;