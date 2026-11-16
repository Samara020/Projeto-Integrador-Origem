-- AlterTable
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "pausado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "excluido" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_produto_visibilidade" ON "produto"("fk_loja_id_loja", "excluido", "pausado");
