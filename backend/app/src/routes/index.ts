import { Application } from "express";
import authRoutes from "./auth.routes";
import produtosRoutes from "./produtos.routes";
import artesaoRoutes from "./artesaos.routes";
import carrinhoRoutes from "./carrinho.routes";
import pedidosRoutes from "./pedidos.routes";
import pagamentosRoutes from "./pagamentos.routes";
import avaliacoesRoutes from "./avaliacoes.routes";
import suporteRoutes from "./suporte.routes";
import painelRoutes from "./painel.routes";
import demoRoutes from "./demo.routes";
import catalogoRoutes from "./catalogo.routes";

export function montarRotas(app: Application): void {
  app.use("/auth", authRoutes);
  app.use("/produtos", produtosRoutes);
  app.use("/artesaos", artesaoRoutes);
  app.use("/carrinho", carrinhoRoutes);
  app.use("/pedidos", pedidosRoutes);
  app.use("/pagamentos", pagamentosRoutes);
  app.use("/avaliacoes", avaliacoesRoutes);
  app.use("/suporte", suporteRoutes);
  app.use("/painel", painelRoutes);
  app.use("/", catalogoRoutes);
  app.use("/demo", demoRoutes);
}
