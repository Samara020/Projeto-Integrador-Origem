"use client";

import { Barcode, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { ResumoPedido } from "@/components/carrinho/ResumoPedido";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { ApiError } from "@/lib/http";
import {
  validarCvv,
  validarNome,
  validarNumeroCartao,
  validarValidadeCartao,
} from "@/lib/validacao";
import type { MetodoPagamento } from "@/types";

const METODOS: {
  id: MetodoPagamento;
  nome: string;
  Icone: typeof CreditCard;
}[] = [
  { id: "CARTAO_CREDITO", nome: "Cartão de crédito", Icone: CreditCard },
  { id: "PIX", nome: "Pix", Icone: QrCode },
  { id: "BOLETO", nome: "Boleto", Icone: Barcode },
];

type ErrosCartao = {
  numero?: string;
  nome?: string;
  validade?: string;
  cvv?: string;
};

function formatarNumeroCartao(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatarValidade(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);
  return digitos.length > 2
    ? `${digitos.slice(0, 2)} / ${digitos.slice(2)}`
    : digitos;
}

export function FormularioPagamento({
  subtotal,
  frete,
  total,
  aoPagar,
}: {
  subtotal: number;
  frete: number;
  total: number;
  aoPagar: (
    metodoPagamento: MetodoPagamento,
    tokenCartao: string | null,
  ) => Promise<void>;
}) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("CARTAO_CREDITO");
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [erros, setErros] = useState<ErrosCartao>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validarCampo(campo: keyof ErrosCartao, valor: string) {
    const validadores = {
      numero: validarNumeroCartao,
      nome: validarNome,
      validade: validarValidadeCartao,
      cvv: validarCvv,
    };
    setErros((atuais) => ({
      ...atuais,
      [campo]: validadores[campo](valor),
    }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    let novos: ErrosCartao = {};
    if (metodo === "CARTAO_CREDITO") {
      novos = {
        numero: validarNumeroCartao(numero),
        nome: validarNome(nome),
        validade: validarValidadeCartao(validade),
        cvv: validarCvv(cvv),
      };
    }
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    setEnviando(true);
    setFalha(null);
    try {
      const tokenCartao =
        metodo === "CARTAO_CREDITO"
          ? `tok_${numero.replace(/\D/g, "").slice(-4)}_${Date.now()}`
          : null;
      await aoPagar(metodo, tokenCartao);
    } catch (causa) {
      setFalha(
        causa instanceof ApiError
          ? causa.message
          : "Não foi possível concluir o pagamento. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <section
        aria-labelledby="metodo-pagamento-titulo"
        className="flex flex-col gap-5 rounded-raio border border-borda bg-superficie p-5 shadow-card"
      >
        <h2
          id="metodo-pagamento-titulo"
          className="font-titulo text-h2 font-bold text-tinta"
        >
          Como você prefere pagar?
        </h2>

        {falha && <AvisoFormulario mensagem={falha} />}

        <div
          role="group"
          aria-label="Método de pagamento"
          className="grid gap-3 sm:grid-cols-3"
        >
          {METODOS.map(({ id, nome: rotulo, Icone }) => {
            const ativo = metodo === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={ativo}
                onClick={() => {
                  setMetodo(id);
                  setFalha(null);
                }}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-raio border px-4 text-apoio font-bold transition-colors duration-150 ${
                  ativo
                    ? "border-terracota bg-terracota text-white"
                    : "border-terracota bg-superficie text-terracota hover:bg-superficie-2"
                }`}
              >
                <Icone className="size-4" aria-hidden="true" />
                {rotulo}
              </button>
            );
          })}
        </div>

        {metodo === "CARTAO_CREDITO" && (
          <div className="flex flex-col gap-1">
            <Campo
              id="pagamento-numero"
              rotulo="Número do cartão"
              name="numeroCartao"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={numero}
              erro={erros.numero}
              onChange={(evento) =>
                setNumero(formatarNumeroCartao(evento.target.value))
              }
              onBlur={() => validarCampo("numero", numero)}
            />
            <Campo
              id="pagamento-nome"
              rotulo="Nome impresso no cartão"
              name="nomeCartao"
              autoComplete="cc-name"
              placeholder="Como aparece no cartão"
              value={nome}
              erro={erros.nome}
              onChange={(evento) => setNome(evento.target.value)}
              onBlur={() => validarCampo("nome", nome)}
            />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Campo
                id="pagamento-validade"
                rotulo="Validade"
                name="validade"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM / AA"
                value={validade}
                erro={erros.validade}
                onChange={(evento) =>
                  setValidade(formatarValidade(evento.target.value))
                }
                onBlur={() => validarCampo("validade", validade)}
              />
              <Campo
                id="pagamento-cvv"
                rotulo="CVV"
                name="cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                placeholder="•••"
                value={cvv}
                erro={erros.cvv}
                onChange={(evento) =>
                  setCvv(evento.target.value.replace(/\D/g, ""))
                }
                onBlur={() => validarCampo("cvv", cvv)}
              />
            </div>
          </div>
        )}

        {metodo === "PIX" && (
          <div className="flex flex-col items-start gap-4 rounded-raio border border-borda p-4 sm:flex-row sm:items-center">
            <Image
              src="/pagamento/qr-code-pix.png"
              alt="QR Code para pagamento via Pix"
              width={88}
              height={88}
              unoptimized
              className="size-22 shrink-0"
            />
            <p className="max-w-md text-apoio text-tinta-2">
              Escaneie o QR Code no aplicativo do seu banco. A confirmação
              acontece em poucos segundos.
            </p>
          </div>
        )}

        {metodo === "BOLETO" && (
          <div className="flex items-start gap-3 rounded-raio border border-borda bg-fundo p-4 text-apoio text-tinta-2">
            <Barcode className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
            <p>
              O boleto será gerado após a confirmação e poderá levar até dois
              dias úteis para compensar.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <ResumoPedido
          subtotal={subtotal}
          frete={frete}
          total={total}
          acao={
            <Botao type="submit" larguraTotal carregando={enviando}>
              Pagar agora
            </Botao>
          }
        />
        <p className="flex items-center justify-center gap-2 text-legenda text-selo">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Pagamento criptografado e seguro
        </p>
      </div>
    </form>
  );
}
