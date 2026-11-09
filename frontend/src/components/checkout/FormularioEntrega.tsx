"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ResumoPedido } from "@/components/carrinho/ResumoPedido";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { formatarMoeda } from "@/lib/formato";
import { ApiError } from "@/lib/http";
import { validarCep, validarNumero, validarRua } from "@/lib/validacao";
import type { EnderecoEntrega, OpcaoEnvio } from "@/types";

type Erros = Partial<Record<keyof EnderecoEntrega, string>>;

function formatarCep(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5
    ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
    : digitos;
}

export function FormularioEntrega({
  subtotal,
  opcaoEnvio,
  aoContinuar,
}: {
  subtotal: number;
  opcaoEnvio: OpcaoEnvio;
  aoContinuar: (endereco: EnderecoEntrega) => Promise<void>;
}) {
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const envioEmCurso = useRef(false);
  const total = subtotal + opcaoEnvio.valor;

  const validarCampo = (campo: keyof EnderecoEntrega, valor: string) => {
    const validadores = {
      cep: validarCep,
      rua: validarRua,
      numero: validarNumero,
    };
    setErros((atuais) => ({
      ...atuais,
      [campo]: validadores[campo](valor),
    }));
  };

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (envioEmCurso.current) return;
    const novos: Erros = {
      cep: validarCep(cep),
      rua: validarRua(rua),
      numero: validarNumero(numero),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    envioEmCurso.current = true;
    setEnviando(true);
    setFalha(null);
    try {
      await aoContinuar({ cep, rua: rua.trim(), numero: numero.trim() });
    } catch (causa) {
      setFalha(
        causa instanceof ApiError
          ? causa.message
          : "Não foi possível criar o pedido. Tente novamente.",
      );
    } finally {
      envioEmCurso.current = false;
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
        aria-labelledby="endereco-entrega-titulo"
        className="flex flex-col gap-5 rounded-raio border border-borda bg-superficie p-5 shadow-card"
      >
        <h2
          id="endereco-entrega-titulo"
          className="font-titulo text-h2 font-bold text-tinta"
        >
          Endereço de entrega
        </h2>

        {falha && <AvisoFormulario mensagem={falha} />}

        <div className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Campo
            id="checkout-cep"
            rotulo="CEP"
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="50000-000"
            value={cep}
            erro={erros.cep}
            onChange={(evento) => setCep(formatarCep(evento.target.value))}
            onBlur={() => validarCampo("cep", cep)}
          />
          <Campo
            id="checkout-numero"
            rotulo="Número"
            name="numero"
            autoComplete="address-line2"
            placeholder="128"
            value={numero}
            erro={erros.numero}
            onChange={(evento) => setNumero(evento.target.value)}
            onBlur={() => validarCampo("numero", numero)}
          />
        </div>

        <Campo
          id="checkout-rua"
          rotulo="Endereço"
          name="rua"
          autoComplete="street-address"
          placeholder="Rua do Sol"
          value={rua}
          erro={erros.rua}
          onChange={(evento) => setRua(evento.target.value)}
          onBlur={() => validarCampo("rua", rua)}
        />

        <div className="flex flex-col gap-3">
          <h3 className="font-titulo text-h3 font-bold text-tinta">
            Opção de envio
          </h3>
          <div className="flex flex-col gap-1 rounded-raio border border-terracota p-4 text-apoio text-tinta sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold">{opcaoEnvio.nome}</span> ·{" "}
              {opcaoEnvio.prazo}
            </p>
            <p className="font-bold tabular-nums">
              {formatarMoeda(opcaoEnvio.valor)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-raio bg-selo/5 p-4 text-apoio text-selo">
          <Leaf className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>Embalagem sustentável, reciclável e sem plástico.</p>
        </div>

        <Link
          href="/carrinho"
          className="self-start text-apoio font-bold text-terracota hover:underline"
        >
          Voltar ao carrinho
        </Link>
      </section>

      <ResumoPedido
        subtotal={subtotal}
        frete={opcaoEnvio.valor}
        total={total}
        acao={
          <Botao type="submit" larguraTotal carregando={enviando}>
            Ir para pagamento
          </Botao>
        }
      />
    </form>
  );
}
