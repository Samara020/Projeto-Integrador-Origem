"use client";

import { useState, type FormEvent } from "react";
import { Cartao } from "@/components/painel/CartaoPainel";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { useAcoesArtesao, useCotacaoFrete } from "@/hooks/usePainelArtesao";
import { formatarMoeda } from "@/lib/formato";
import type { ConfiguracoesEnvio as ConfiguracoesEnvioDados } from "@/types";

type Props = {
  dados: ConfiguracoesEnvioDados;
  recarregar: () => void;
};

function lerDimensoes(texto: string) {
  const partes = texto
    .split(/[x×\s,]+/i)
    .map((parte) => Number(parte.replace(",", ".").trim()))
    .filter((valor) => Number.isFinite(valor) && valor > 0);

  return {
    altura: partes[0] ?? 0,
    largura: partes[1] ?? 0,
    profundidade: partes[2] ?? 0,
  };
}

export default function ConfiguracoesEnvio({ dados, recarregar }: Props) {
  const { alternarOpcaoEnvio, salvando, erro: erroDeAcao } = useAcoesArtesao();
  const { cotacao, calculando, erro: erroCotacao, calcular, limpar } = useCotacaoFrete();
  const [cep, setCep] = useState("");
  const [peso, setPeso] = useState("1,2");
  const [medidas, setMedidas] = useState("30 × 22 × 22");
  const [erros, setErros] = useState<{ cep?: string; peso?: string; medidas?: string }>({});

  function calcularFrete(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const problemas: typeof erros = {};
    const cepNumerico = cep.replace(/\D/g, "");
    const pesoNumerico = Number(peso.replace(",", "."));
    const dimensoes = lerDimensoes(medidas);

    if (cepNumerico.length !== 8) problemas.cep = "O CEP tem 8 dígitos.";
    if (!Number.isFinite(pesoNumerico) || pesoNumerico <= 0)
      problemas.peso = "Informe o peso em kg.";
    if (!dimensoes.altura || !dimensoes.largura || !dimensoes.profundidade)
      problemas.medidas = "Use três números: 30 × 22 × 22.";

    setErros(problemas);
    if (Object.keys(problemas).length > 0) return;

    void calcular({ cep: cepNumerico, pesoKg: pesoNumerico, dimensoes });
  }

  return (
    <div className="flex flex-col gap-6">
      {erroDeAcao ? (
        <p role="alert" className="text-apoio text-erro">
          {erroDeAcao.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Calculadora de frete">
          <form noValidate onSubmit={calcularFrete} className="flex flex-col gap-4">
            <Campo
              id="cep"
              rotulo="CEP de destino"
              inputMode="numeric"
              value={cep}
              onChange={(evento) => setCep(evento.target.value)}
              erro={erros.cep}
              placeholder="01310-100"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="peso"
                rotulo="Peso (kg)"
                inputMode="decimal"
                value={peso}
                onChange={(evento) => setPeso(evento.target.value)}
                erro={erros.peso}
                placeholder="1,2"
              />
              <Campo
                id="medidas"
                rotulo="Dimensões"
                value={medidas}
                onChange={(evento) => setMedidas(evento.target.value)}
                erro={erros.medidas}
                dica="Altura × largura × profundidade."
              />
            </div>
            <Botao type="submit" carregando={calculando} larguraTotal>
              Calcular frete
            </Botao>
          </form>

          {erroCotacao ? (
            <p role="alert" className="mt-4 text-apoio text-erro">
              {erroCotacao.message}
            </p>
          ) : null}

          {cotacao ? (
            <div className="mt-4 rounded-raio border border-borda bg-superficie-2 p-4">
              <p className="text-apoio text-tinta-2">{cotacao.servico}</p>
              <p className="mt-1 font-lora text-2xl text-tinta">{formatarMoeda(cotacao.valor)}</p>
              <p className="mt-1 text-apoio text-tinta-2">Entrega em {cotacao.prazo}</p>
              <Botao variante="fantasma" onClick={limpar} className="mt-2">
                Limpar cotação
              </Botao>
            </div>
          ) : null}
        </Cartao>

        <Cartao
          titulo="Opções de envio"
          descricao="Mantenha pelo menos uma ativa para o cálculo de frete funcionar."
        >
          <ul className="flex flex-col gap-3">
            {dados.opcoes.map((opcao) => (
              <li
                key={opcao.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-raio border border-borda px-4 py-3"
              >
                <div>
                  <p className="text-corpo font-bold text-tinta">{opcao.nome}</p>
                  <p className="text-apoio text-tinta-2">{opcao.prazo}</p>
                </div>
                <div className="flex items-center gap-3">
                  {opcao.ativa ? <Selo variante="sucesso">Ativa</Selo> : null}
                  <Botao
                    variante="secundario"
                    onClick={() => void alternarOpcaoEnvio(opcao.id, recarregar).catch(() => {})}
                    carregando={salvando === `envio:${opcao.id}`}
                  >
                    {opcao.ativa ? "Desativar" : "Ativar"}
                  </Botao>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-borda pt-4">
            <h3 className="text-apoio font-bold text-tinta">Prazos por região</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {dados.prazosPorRegiao.map((prazo) => (
                <li key={prazo.regiao} className="flex justify-between text-apoio text-tinta-2">
                  <span>{prazo.regiao}</span>
                  <span>{prazo.prazo}</span>
                </li>
              ))}
            </ul>
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Como embalar" descricao="Embale com cuidado. Deixe menos marcas no mundo.">
        <ul className="flex flex-col gap-2 text-corpo text-tinta-2">
          <li>Use papel reciclado, proteção reaproveitável e evite plástico.</li>
          <li>Inclua a história da peça e o certificado de origem.</li>
        </ul>
        <h3 className="mt-5 text-apoio font-bold text-tinta">Tipos disponíveis</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {dados.tiposEmbalagem.map((tipo) => (
            <li key={tipo.id}>
              <Selo variante="neutro">{tipo.nome}</Selo>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
