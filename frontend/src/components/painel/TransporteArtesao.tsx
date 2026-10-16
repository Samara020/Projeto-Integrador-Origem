"use client";

import { useState, type FormEvent } from "react";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useAcoesArtesao, useConfiguracoesEnvio, useCotacaoFrete } from "@/hooks/usePainelArtesao";
import { usePedidosArtesao } from "@/hooks/usePainelArtesao";
import { formatarMoeda } from "@/lib/formato";

function dimensoes(texto: string) {
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

export default function TransporteArtesao() {
  const { dados, carregando, erro, recarregar } = useConfiguracoesEnvio();
  const { dados: pedidos } = usePedidosArtesao();
  const { alternarOpcaoEnvio, salvando, erro: erroDeAcao } = useAcoesArtesao();
  const { cotacao, calculando, erro: erroCotacao, calcular, limpar } = useCotacaoFrete();

  const [cep, setCep] = useState("");
  const [peso, setPeso] = useState("1,2");
  const [medidas, setMedidas] = useState("30 × 22 × 22");
  const [erros, setErros] = useState<{
    cep?: string;
    peso?: string;
    medidas?: string;
  }>({});

  // Pedido com rastreio salvo é o que ainda precisa de etiqueta.
  const paraSair = (pedidos?.pedidosRecebidos ?? []).find(
    (pedido) => pedido.codigoRastreio && pedido.statusProducao === "ENVIADO",
  );
  const [rastreio, setRastreio] = useState("");

  if (carregando) {
    return (
      <div className="flex flex-col gap-8">
        <Esqueleto className="h-12 w-96" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Esqueleto className="h-80" />
          <Esqueleto className="h-80" />
        </div>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <EstadoErro
        mensagem={erro?.message ?? "Configuração não encontrada."}
        aoTentarDeNovo={recarregar}
      />
    );
  }

  function calcularFrete(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problemas: typeof erros = {};
    if (cep.replace(/\D/g, "").length !== 8) problemas.cep = "O CEP tem 8 dígitos.";
    if (Number(peso.replace(",", ".")) <= 0) problemas.peso = "Informe o peso em kg.";
    const medida = dimensoes(medidas);
    if (!medida.altura || !medida.largura || !medida.profundidade)
      problemas.medidas = "Use três números: 30 × 22 × 22.";
    setErros(problemas);
    if (Object.values(problemas).some(Boolean)) return;

    void calcular({
      cep: cep.replace(/\D/g, ""),
      pesoKg: Number(peso.replace(",", ".")),
      dimensoes: medida,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Cuidado em cada trajeto"
        titulo="Transporte e embalagem"
        descricao="A peça chega inteira ou não chegou. Calcule o frete, escolha como enviar e embale com cuidado."
      />

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao
          titulo="Código de rastreio e etiqueta"
          descricao="Informe o código e imprima a etiqueta para colar na embalagem."
        >
          {paraSair ? (
            <div className="flex flex-col gap-4">
              <p className="text-apoio text-tinta-2">
                Pedido <span className="font-bold text-terracota">#{paraSair.id}</span> ·{" "}
                {paraSair.comprador.nome}
              </p>
              <Campo
                id="codigo-rastreio"
                rotulo="Código de rastreio"
                value={rastreio}
                onChange={(evento) => setRastreio(evento.target.value)}
                placeholder={paraSair.codigoRastreio ?? "BR458012973RG"}
                dica="Preenchido com o código que você já informou na tela de pedidos."
              />
              <div className="flex flex-wrap gap-2">
                <Botao
                  onClick={() => {
                    if (!rastreio.trim()) {
                      toaster.create({
                        type: "error",
                        title: "Falta o código",
                        description: "Informe o código antes de imprimir a etiqueta.",
                      });
                      return;
                    }
                    window.print();
                  }}
                >
                  Imprimir etiqueta
                </Botao>
                <Botao
                  variante="secundario"
                  onClick={() => {
                    setRastreio(paraSair.codigoRastreio ?? "");
                    toaster.create({
                      type: "success",
                      title: "Código preenchido",
                    });
                  }}
                >
                  Usar código do pedido
                </Botao>
              </div>
            </div>
          ) : (
            <p className="text-apoio text-tinta-2">
              Nenhum pedido com rastreio enviado. Assim que você marcar um pedido como enviado, a
              etiqueta aparece aqui.
            </p>
          )}
        </Cartao>

        <Cartao titulo="Como embalar" descricao="Emballe com cuidado. Deixe menos marcas no mundo.">
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
    </div>
  );
}
