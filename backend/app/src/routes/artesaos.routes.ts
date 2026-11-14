import { Request, Response, NextFunction, Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas } from "../middleware/auth";
import prisma from "../lib/prisma";
import { toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";

const router = Router();
export const rotasDiretasArtesao = Router();

const handlerGetMeuPerfil = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: toId(req.usuario!.id) },
      include: { loja: { orderBy: { id: "asc" }, take: 1 } },
    });
    if (!usuario) throw new ErroApp(404, "Usuario nao encontrado.");

    return res.json({
      nomeArtistico: usuario.loja[0]?.nome ?? usuario.nome,
      regiao: "Pernambuco",
      biografia: usuario.loja[0]?.descricao ?? "",
      tecnicas: [],
      foto: null,
      fotoCapa: null,
      contato: { telefone: usuario.telefone ?? "", redesSociais: "" },
      certificacoes: [],
      dadosBancarios: "",
    });
  } catch (err) {
    next(err);
  }
};

const handlerPutMeuPerfil = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = z
      .object({
        nomeArtistico: z.string(),
        regiao: z.string(),
        biografia: z.string(),
        tecnicas: z.array(z.string()).optional(),
        contato: z.object({ telefone: z.string(), redesSociais: z.string() }).optional(),
        certificacoes: z.array(z.string()).optional(),
        dadosBancarios: z.string().optional(),
      })
      .parse(req.body);

    let loja = await prisma.loja.findFirst({ where: { usuarioId: toId(req.usuario!.id) }, orderBy: { id: "asc" } });
    if (!loja) {
      loja = await prisma.loja.create({
        data: { nome: dados.nomeArtistico, usuarioId: toId(req.usuario!.id) },
      });
    } else {
      await prisma.loja.update({
        where: { id: loja.id },
        data: { nome: dados.nomeArtistico, descricao: dados.biografia },
      });
    }

    if (dados.contato) {
      await prisma.usuario.update({
        where: { id: toId(req.usuario!.id) },
        data: { telefone: dados.contato.telefone },
      });
    }

    return res.json({
      nomeArtistico: dados.nomeArtistico,
      atualizadoEm: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

const handlerGetPerfilPublico = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: toId(req.params.id) },
      include: { loja: { orderBy: { id: "asc" }, take: 1, include: { produtos: { include: { imagens: { take: 1 } } } } } },
    });
    const loja = usuario?.loja[0];
    if (!usuario || !loja) throw new ErroApp(404, "Artesao nao encontrado.");

    return res.json({
      id: usuario.id,
      nome: usuario.nome,
      nomeLoja: loja.nome,
      biografia: loja.descricao ?? "",
      regiao: "Pernambuco",
      produtos: loja.produtos.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        imagemPrincipal: p.imagens[0]?.url ?? "",
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Rotas sob /artesaos (ex: /artesaos/artesao/perfil)
router.get("/artesao/perfil", autenticar, artesaoApenas, handlerGetMeuPerfil);
router.put("/artesao/perfil", autenticar, artesaoApenas, handlerPutMeuPerfil);
router.get("/:id/perfil", handlerGetPerfilPublico);

// Rotas sob /artesao (ex: /artesao/perfil, como no ContratoDeAPI)
rotasDiretasArtesao.get("/perfil", autenticar, artesaoApenas, handlerGetMeuPerfil);
rotasDiretasArtesao.put("/perfil", autenticar, artesaoApenas, handlerPutMeuPerfil);
rotasDiretasArtesao.get("/:id/perfil", handlerGetPerfilPublico);

export default router;
