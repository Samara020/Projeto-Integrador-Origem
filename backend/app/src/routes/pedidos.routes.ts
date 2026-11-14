import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, compradorApenas } from "../middleware/auth";
import { validarCorpo } from "../middleware/validacao";
import { PedidosController } from "../controllers/pedidos.controller";

const router = Router();
export const rotasDiretasPedidos = Router();
const controller = new PedidosController();

const schemaCheckout = z.object({
  enderecoEntrega: z.object(
    {
      cep: z
        .string({ required_error: "Informe o CEP." })
        .trim()
        .min(1, "Informe o CEP.")
        .regex(/^(\d{5}-?\d{3}|\d{8})$/, "CEP invalido."),
      rua: z
        .string({ required_error: "Informe a rua de entrega." })
        .trim()
        .min(1, "Informe a rua de entrega.")
        .max(150, "A rua deve ter no maximo 150 caracteres."),
      numero: z
        .string({ required_error: "Informe o numero do endereco." })
        .trim()
        .min(1, "Informe o numero do endereco.")
        .max(20, "O numero deve ter no maximo 20 caracteres."),
      bairro: z.string().trim().max(100).optional(),
      cidade: z.string().trim().max(100).optional(),
      cpf: z
        .string()
        .trim()
        .regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, "CPF invalido.")
        .optional(),
    },
    { required_error: "Preencha o endereco de entrega." }
  ),
});

const STATUS_PRODUCAO = [
  "NOVO",
  "EM_PRODUCAO",
  "PRONTO",
  "ENVIADO",
  "ENTREGUE",
  "CANCELADO",
] as const;

/** Aceita o campo do contrato (`statusProducao`, `codigoRastreioCorreios`) e os apelidos alternativos. */
const schemaStatus = z
  .object({
    statusProducao: z
      .enum(STATUS_PRODUCAO, {
        errorMap: () => ({ message: "Status de producao invalido." }),
      })
      .optional(),
    status: z
      .enum(STATUS_PRODUCAO, {
        errorMap: () => ({ message: "Status de producao invalido." }),
      })
      .optional(),
    codigoRastreioCorreios: z.string().trim().min(1).max(50).nullish(),
    codigoRastreio: z.string().trim().min(1).max(50).nullish(),
  })
  .superRefine((d, ctx) => {
    if (!d.statusProducao && !d.status) {
      ctx.addIssue({
        code: "custom",
        path: ["statusProducao"],
        message: "Informe o status de producao.",
      });
    }
  })
  .transform((d) => ({
    statusProducao: (d.statusProducao ?? d.status)!,
    codigoRastreio: d.codigoRastreioCorreios ?? d.codigoRastreio ?? null,
  }))
  .refine((d) => d.statusProducao !== "ENVIADO" || !!d.codigoRastreio, {
    path: ["codigoRastreioCorreios"],
    message: "Informe o codigo de rastreio para marcar como enviado.",
  });

// POST /pedidos/checkout
router.post(
  "/checkout",
  autenticar,
  compradorApenas,
  validarCorpo(schemaCheckout),
  (req, res, next) => controller.checkout(req, res).catch(next)
);

// GET /pedidos/comprador/pedidos
router.get(
  "/comprador/pedidos",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.listar(req, res).catch(next)
);

// GET /pedidos/artesao/pedidos
router.get(
  "/artesao/pedidos",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.listarRecebidos(req, res).catch(next)
);

// PUT /pedidos/artesao/pedidos/:id/status
router.put(
  "/artesao/pedidos/:id/status",
  autenticar,
  artesaoApenas,
  validarCorpo(schemaStatus),
  (req, res, next) => controller.atualizarStatus(req, res).catch(next)
);

// GET /pedidos/:id (consulta detalhada do comprador)
router.get(
  "/:id",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.buscar(req, res).catch(next)
);

// Rotas diretas do Contrato de API (sem o prefixo /pedidos)
rotasDiretasPedidos.get(
  "/comprador/pedidos",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.listar(req, res).catch(next)
);

rotasDiretasPedidos.get(
  "/artesao/pedidos",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.listarRecebidos(req, res).catch(next)
);

rotasDiretasPedidos.put(
  "/artesao/pedidos/:id/status",
  autenticar,
  artesaoApenas,
  validarCorpo(schemaStatus),
  (req, res, next) => controller.atualizarStatus(req, res).catch(next)
);

export default router;
