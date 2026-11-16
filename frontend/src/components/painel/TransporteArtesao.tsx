"use client";

import { TituloSecao } from "@/components/painel/CartaoPainel";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { Esqueleto } from "@/components/ui/Esqueleto";
import ConfiguracoesEnvio from "@/components/painel/ConfiguracoesEnvio";
import RastreioEtiqueta from "@/components/painel/RastreioEtiqueta";
import { useConfiguracoesEnvio } from "@/hooks/usePainelArtesao";

export default function TransporteArtesao() {
  const { dados, carregando, erro, recarregar } = useConfiguracoesEnvio();

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

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Cuidado em cada trajeto"
        titulo="Transporte e embalagem"
        descricao="A peça chega inteira ou não chegou. Calcule o frete, escolha como enviar e embale com cuidado."
      />

      <ConfiguracoesEnvio dados={dados} recarregar={recarregar} />
      <RastreioEtiqueta />
    </div>
  );
}
