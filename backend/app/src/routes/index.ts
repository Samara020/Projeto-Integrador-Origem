import { IRouter, Request, Response } from "express";
import authRoutes from "./auth.routes";
import produtosRoutes, { validacaoAdminRouter } from "./produtos.routes";
import artesaoRoutes, { rotasDiretasArtesao } from "./artesaos.routes";
import carrinhoRoutes from "./carrinho.routes";
import pedidosRoutes, { rotasDiretasPedidos } from "./pedidos.routes";
import pagamentosRoutes from "./pagamentos.routes";
import avaliacoesRoutes from "./avaliacoes.routes";
import suporteRoutes from "./suporte.routes";
import painelRoutes from "./painel.routes";
import demoRoutes from "./demo.routes";
import catalogoRoutes from "./catalogo.routes";
import { autenticar, compradorApenas } from "../middleware/auth";
import { personalizacaoService } from "../services/personalizacao.service";
import prisma from "../lib/prisma";

export function montarRotas(app: IRouter): void {
  app.get("/__test/identity", async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV !== "test") {
      return res.status(404).json({ error: "Not found" });
    }
    try {
      const rows = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
      return res.json({
        environment: "test",
        database: rows[0]?.database ?? null,
        nodeVersion: process.version,
      });
    } catch {
      return res.status(503).json({ error: "Não foi possível confirmar o banco de teste ativo." });
    }
  });

  app.get("/comprador/personalizacoes", autenticar, compradorApenas,
    (req, res, next) => personalizacaoService.minhas(req.usuario!.id).then(p => res.json(p)).catch(next));
  app.use("/auth", authRoutes);
  app.use("/produtos", produtosRoutes);
  app.use("/admin/produtos", validacaoAdminRouter);
  app.use("/artesaos", artesaoRoutes);
  app.use("/artesao", rotasDiretasArtesao);
  app.use("/carrinho", carrinhoRoutes);
  app.use("/pedidos", pedidosRoutes);
  app.use("/pagamentos", pagamentosRoutes);
  app.use("/avaliacoes", avaliacoesRoutes);
  app.use("/suporte", suporteRoutes);
  app.use("/painel", painelRoutes);
  // Caminhos canônicos do contrato (ex.: /artesao/painel/metricas, /admin/painel/metricas).
  // O mount em /painel acima é mantido por compatibilidade.
  app.use("/", painelRoutes);
  app.use("/", rotasDiretasPedidos);
  app.use("/", catalogoRoutes);
  app.use("/demo", demoRoutes);
}
