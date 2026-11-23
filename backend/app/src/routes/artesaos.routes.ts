import { Request, Response, NextFunction, Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas } from "../middleware/auth";
import { artesaoService } from "../services/artesao.service";
import { ProdutosController } from "../controllers/produtos.controller";

const router = Router();
export const rotasDiretasArtesao = Router();
const produtosController = new ProdutosController();

const schemaPerfil = z.object({
  nomeArtistico: z.string().trim().min(1, "Informe o nome artístico.").max(150),
  regiao: z.string().trim().max(150).default(""),
  biografia: z.string().max(5000).default(""),
  tecnicas: z.array(z.string().trim().max(100)).max(20).default([]),
  foto: z.string().max(2_000_000).nullable().optional(),
  fotoCapa: z.string().max(2_000_000).nullable().optional(),
  contato: z
    .object({
      telefone: z.string().trim().max(20).default(""),
      redesSociais: z.string().trim().max(200).default(""),
    })
    .default({ telefone: "", redesSociais: "" }),
  certificacoes: z.array(z.string().trim().max(150)).max(20).default([]),
  dadosBancarios: z.string().trim().max(300).default(""),
});

const getMeuPerfil = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json(await artesaoService.buscarMeuPerfil(req.usuario!.id));
  } catch (err) {
    next(err);
  }
};

const putMeuPerfil = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = schemaPerfil.parse(req.body);
    return res.json(await artesaoService.salvarMeuPerfil(req.usuario!.id, dados));
  } catch (err) {
    next(err);
  }
};

const getPerfilPublico = async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.json(await artesaoService.perfilPublico(req.params.id));
  } catch (err) {
    next(err);
  }
};

// Rotas sob /artesaos (ex: /artesaos/artesao/perfil)
router.get("/artesao/perfil", autenticar, artesaoApenas, getMeuPerfil);
router.put("/artesao/perfil", autenticar, artesaoApenas, putMeuPerfil);
router.get("/:id/perfil", getPerfilPublico);

// Rotas sob /artesao (ex: /artesao/perfil, como no ContratoDeAPI)
rotasDiretasArtesao.get("/perfil", autenticar, artesaoApenas, getMeuPerfil);
rotasDiretasArtesao.put("/perfil", autenticar, artesaoApenas, putMeuPerfil);
rotasDiretasArtesao.get("/:id/perfil", getPerfilPublico);
rotasDiretasArtesao.get("/pecas", autenticar, artesaoApenas, (req, res, next) =>
  produtosController.listarPeloArtesao(req, res).catch(next)
);
rotasDiretasArtesao.put("/pecas/:id/estoque", autenticar, artesaoApenas, (req, res, next) =>
  produtosController.atualizarEstoque(req, res).catch(next)
);

export default router;
