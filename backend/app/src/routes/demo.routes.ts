import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { ErroApp } from "../middleware/error";

const router = Router();

let estoqueDemo = 1;
const tentativas = new Map<string, { usuario: string; produtoId: string; quantidade: number; pedidoId: string }>();
const mensagens = new Map<string, string>();

router.get("/saude", (_req, res) => {
  res.json({ mensagem: "API funcionando" });
});

router.get("/estoque", (_req, res) => {
  res.json({ estoque: estoqueDemo });
});

router.post("/compras", async (req, res, next) => {
  const { tentativaId, usuario, produtoId, quantidade } = z
    .object({
      tentativaId: z.string(),
      usuario: z.string(),
      produtoId: z.string(),
      quantidade: z.number().int().positive(),
    })
    .parse(req.body);

  if (produtoId !== "prd_201") {
    throw new ErroApp(400, "Produto invalido para demonstracao.");
  }

  const existente = tentativas.get(tentativaId);
  if (existente) {
    if (
      existente.usuario === usuario &&
      existente.produtoId === produtoId &&
      existente.quantidade === quantidade
    ) {
      return res.json({
        mensagem: "Compra aprovada e notificacao enfileirada.",
        pedidoId: existente.pedidoId,
        usuario: existente.usuario,
        estoque: estoqueDemo,
      });
    }
    throw new ErroApp(409, "ID de tentativa reutilizado com dados diferentes.");
  }

  if (estoqueDemo <= 0) {
    throw new ErroApp(409, "Estoque insuficiente.");
  }

  const pedidoId = `ped_demo_${tentativaId}`;
  tentativas.set(tentativaId, { usuario, produtoId, quantidade, pedidoId });
  estoqueDemo = 0;
  mensagens.set(pedidoId, "ENFILEIRADA");

  setTimeout(() => {
    mensagens.set(pedidoId, "PROCESSADA");
  }, 500);

  return res.json({
    mensagem: "Compra aprovada e notificacao enfileirada.",
    pedidoId,
    usuario,
    estoque: estoqueDemo,
  });
});

router.get("/mensagens/:pedidoId", (req, res, next) => {
  const estado = mensagens.get(req.params.pedidoId);
  if (!estado) throw new ErroApp(404, "Mensagem nao encontrada.");
  res.json({ pedidoId: req.params.pedidoId, estado });
});

export default router;
