import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, adminApenas, compradorApenas } from "../middleware/auth";
import { validarCorpo } from "../middleware/validacao";
import { personalizacaoService } from "../services/personalizacao.service";
import { ProdutosController } from "../controllers/produtos.controller";
import { validarImagens } from "../lib/imagens";
import { ErroApp } from "../middleware/error";

const router = Router();
const controller = new ProdutosController();

const schemaProduto = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  categoria: z.string().min(1),
  tecnica: z.string().min(1),
  origem: z.string().min(1),
  preco: z.number().positive(),
  modalidadeProducao: z.enum(["PECA_UNICA", "PRONTA_ENTREGA", "SOB_ENCOMENDA"]),
  estoque: z.number().int().nonnegative(),
  prazoProducaoDias: z.number().int().nonnegative().nullable().optional(),
  capacidadeProducao: z.number().int().nonnegative().nullable().optional(),
  imagens: z
    .array(z.string())
    .default([])
    .superRefine((imagens, ctx) => {
      const erro = validarImagens(imagens);
      if (erro) ctx.addIssue({ code: "custom", message: erro });
    }),
  sku: z.string().optional(),
  material: z.string().optional(),
  dimensoes: z.string().optional(),
  peso: z.number().positive().optional(),
  informacoesOrigem: z.string().optional(),
  certificado: z.string().optional(),
});

router.get("/", (req, res, next) => controller.listar(req, res).catch(next));
router.get("/comparar", (req, res, next) => controller.comparar(req, res).catch(next));
router.get("/recomendacoes", (req, res, next) => controller.recomendados(req, res).catch(next));
router.get("/:id", (req, res, next) => controller.buscarPorId(req, res).catch(next));

router.post("/", autenticar, artesaoApenas, validarCorpo(schemaProduto), (req, res, next) => {
  return controller.criar(req, res).catch(next);
});

router.put(
  "/:id",
  autenticar,
  artesaoApenas,
  validarCorpo(schemaProduto.partial()),
  (req, res, next) => {
    // Additional imagem validation if present
    if (req.body?.imagens !== undefined) {
      const erro = validarImagens(req.body.imagens);
      if (erro) throw new ErroApp(400, erro);
    }
    return controller.atualizar(req, res).catch(next);
  })
router.delete("/:id", autenticar, artesaoApenas, (req, res, next) =>
  controller.inativar(req, res).catch(next)
);

router.get("/artesao/pecas", autenticar, artesaoApenas, (req, res, next) =>
  controller.listarPeloArtesao(req, res).catch(next)
);

router.put(
  "/artesao/pecas/:id/estoque",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.atualizarEstoque(req, res).catch(next)
);

router.get(
  "/admin/produtos/pendentes",
  autenticar,
  adminApenas,
  (req, res, next) => controller.listarPendentes(req, res).catch(next)
);

router.put(
  "/admin/produtos/:id/validacao",
  autenticar,
  adminApenas,
  (req, res, next) => controller.validar(req, res).catch(next)
);

router.post("/:id/personalizacoes", autenticar, compradorApenas,
  validarCorpo(z.object({ cor: z.string().max(100).optional(), tamanho: z.string().max(100).optional(), inscricao: z.string().max(200).optional(), detalhes: z.string().max(5000).optional(), mensagem: z.string().max(5000) })),
  (req, res, next) => personalizacaoService.criar(req.usuario!.id, req.params.id, req.body).then(p => res.status(201).json(p)).catch(next));

export const rotasDiretasProdutos = Router();

rotasDiretasProdutos.get("/artesao/pecas", autenticar, artesaoApenas, (req, res, next) =>
  controller.listarPeloArtesao(req, res).catch(next)
);
rotasDiretasProdutos.put("/artesao/pecas/:id/estoque", autenticar, artesaoApenas, (req, res, next) =>
  controller.atualizarEstoque(req, res).catch(next)
);
rotasDiretasProdutos.get("/admin/produtos/pendentes", autenticar, adminApenas, (req, res, next) =>
  controller.listarPendentes(req, res).catch(next)
);
rotasDiretasProdutos.put("/admin/produtos/:id/validacao", autenticar, adminApenas, (req, res, next) =>
  controller.validar(req, res).catch(next)
);

export default router;
