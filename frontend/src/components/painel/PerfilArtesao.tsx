"use client";

import { useState, type FormEvent } from "react";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { Foto } from "@/components/ui/Foto";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useAcoesArtesao, usePerfilArtesao } from "@/hooks/usePainelArtesao";
import { useTecnicas } from "@/hooks/useCatalogo";
import type { PerfilArtesaoEdicao } from "@/types";

type Erros = Partial<Record<keyof PerfilArtesaoEdicao, string>>;

function validar(perfil: PerfilArtesaoEdicao): Erros {
  const problemas: Erros = {};
  if (!perfil.nomeArtistico.trim()) problemas.nomeArtistico = "Informe seu nome artístico.";
  if (!perfil.regiao.trim()) problemas.regiao = "Informe onde você produz.";
  if (perfil.biografia.trim().length < 30)
    problemas.biografia = "Conte a sua história em pelo menos 30 caracteres.";
  if (perfil.tecnicas.length === 0)
    problemas.tecnicas = "Escolha ao menos uma técnica que você trabalha.";
  return problemas;
}

export default function PerfilArtesao() {
  const { dados, carregando, erro, recarregar } = usePerfilArtesao();
  const { dados: tecnicas } = useTecnicas();

  if (carregando) {
    return (
      <div className="flex flex-col gap-8">
        <Esqueleto className="h-12 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Esqueleto className="h-96" />
          <Esqueleto className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <EstadoErro
        mensagem={erro?.message ?? "Perfil não encontrado."}
        aoTentarDeNovo={recarregar}
      />
    );
  }

  return (
    <FormularioPerfil inicial={dados} tecnicas={(tecnicas ?? []).map((tecnica) => tecnica.nome)} />
  );
}

function FormularioPerfil({
  inicial,
  tecnicas,
}: {
  inicial: PerfilArtesaoEdicao;
  tecnicas: string[];
}) {
  const { salvarPerfil, salvando, erro: erroDeAcao } = useAcoesArtesao();
  const { recarregar } = usePerfilArtesao();

  const [form, setForm] = useState<PerfilArtesaoEdicao>(inicial);
  const [erros, setErros] = useState<Erros>({});

  function mudar(
    campo: keyof PerfilArtesaoEdicao,
    valor: PerfilArtesaoEdicao[keyof PerfilArtesaoEdicao],
  ) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problemas = validar(form);
    setErros(problemas);
    if (Object.values(problemas).some(Boolean)) {
      toaster.create({
        type: "error",
        title: "Faltam campos para salvar",
        description: "Olhe as mensagens em vermelho abaixo dos campos.",
      });
      return;
    }

    void salvarPerfil(form, () => {
      toaster.create({
        type: "success",
        title: "Perfil atualizado",
        description: "Suas mudanças já aparecem na prévia ao lado.",
      });
      recarregar();
    }).catch(() => {});
  }

  function alternarTecnica(nome: string) {
    const ativas = form.tecnicas.includes(nome);
    mudar(
      "tecnicas",
      ativas ? form.tecnicas.filter((item) => item !== nome) : [...form.tecnicas, nome],
    );
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Área do artesão"
        titulo="Seu perfil, sua história"
        descricao="Atualize como sua arte aparece para quem compra na Origem."
        acoes={
          <Botao type="submit" carregando={salvando === "perfil"}>
            Salvar alterações
          </Botao>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Cartao titulo="Fotos">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {form.foto ? (
                  <Foto
                    src={form.foto}
                    alt="Foto do perfil"
                    width={72}
                    height={72}
                    className="size-18 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="inline-flex size-18 items-center justify-center rounded-full bg-superficie-2 text-tinta-3"
                    aria-hidden="true"
                  >
                    Sem foto
                  </span>
                )}
                <label className="cursor-pointer">
                  <span className="text-apoio font-bold text-terracota hover:underline">
                    Alterar foto de perfil
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={() =>
                      toaster.create({
                        type: "info",
                        title: "Foto atualizada",
                        description: "A imagem entra no perfil quando o upload existir.",
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex aspect-[21/9] items-center justify-center overflow-hidden rounded-raio bg-superficie-2">
                  {form.fotoCapa ? (
                    <Foto
                      src={form.fotoCapa}
                      alt="Foto de capa"
                      width={420}
                      height={180}
                      className="size-full object-cover"
                    />
                  ) : (
                    <p className="px-4 text-center text-apoio text-tinta-3">Sem foto de capa</p>
                  )}
                </div>
                <label className="cursor-pointer text-apoio font-bold text-terracota hover:underline">
                  Adicionar foto de capa
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={() =>
                      toaster.create({
                        type: "info",
                        title: "Capa atualizada",
                        description: "A imagem entra no perfil quando o upload existir.",
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </Cartao>

          <Cartao titulo="Contato">
            <div className="flex flex-col gap-4">
              <Campo
                id="telefone"
                rotulo="Telefone"
                type="tel"
                value={form.contato.telefone}
                onChange={(evento) =>
                  setForm((atual) => ({
                    ...atual,
                    contato: {
                      ...atual.contato,
                      telefone: evento.target.value,
                    },
                  }))
                }
                placeholder="(81) 99999-2210"
              />
              <Campo
                id="redes"
                rotulo="Redes sociais"
                value={form.contato.redesSociais}
                onChange={(evento) =>
                  setForm((atual) => ({
                    ...atual,
                    contato: {
                      ...atual.contato,
                      redesSociais: evento.target.value,
                    },
                  }))
                }
                placeholder="@seuateliê"
              />
            </div>
          </Cartao>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Cartao titulo="Sua história">
            <div className="flex flex-col gap-4">
              <Campo
                id="nome-artistico"
                rotulo="Nome artístico"
                value={form.nomeArtistico}
                onChange={(evento) => mudar("nomeArtistico", evento.target.value)}
                erro={erros.nomeArtistico}
              />
              <Campo
                id="regiao"
                rotulo="Região"
                value={form.regiao}
                onChange={(evento) => mudar("regiao", evento.target.value)}
                erro={erros.regiao}
                placeholder="Caruaru · Pernambuco"
              />
              <AreaTexto
                id="biografia"
                rotulo="Bio / história"
                value={form.biografia}
                onChange={(evento) => mudar("biografia", evento.target.value)}
                erro={erros.biografia}
                dica="As pessoas compram de quem conhecem o trabalho."
              />
            </div>
          </Cartao>

          <Cartao
            titulo="Técnicas artesanais"
            descricao="Marque as técnicas que você trabalha de verdade."
          >
            <ul className="flex flex-wrap gap-2">
              {tecnicas.map((nome) => {
                const ativa = form.tecnicas.includes(nome);
                return (
                  <li key={nome}>
                    <button
                      type="button"
                      onClick={() => alternarTecnica(nome)}
                      aria-pressed={ativa}
                      className={`inline-flex h-9 items-center rounded-full px-3 text-apoio font-bold transition-colors duration-150 ${
                        ativa
                          ? "bg-terracota text-white"
                          : "border border-borda bg-superficie text-tinta-2 hover:border-borda-forte hover:text-tinta"
                      }`}
                    >
                      {nome}
                    </button>
                  </li>
                );
              })}
            </ul>
            {erros.tecnicas ? (
              <p role="alert" className="mt-2 text-apoio text-erro">
                {erros.tecnicas}
              </p>
            ) : null}
          </Cartao>

          <Cartao
            titulo="Certificações e dados de recebimento"
            descricao="Os dados bancários ficam só com a equipe da Origem."
          >
            <ul className="mb-4 flex flex-wrap gap-2">
              {form.certificacoes.length === 0 ? (
                <li className="text-apoio text-tinta-3">Nenhuma certificação cadastrada.</li>
              ) : (
                form.certificacoes.map((certificacao) => (
                  <li key={certificacao}>
                    <Selo variante="autentico">{certificacao}</Selo>
                  </li>
                ))
              )}
            </ul>
            <Campo
              id="bancarios"
              rotulo="Dados bancários para recebimento"
              value={form.dadosBancarios}
              onChange={(evento) => mudar("dadosBancarios", evento.target.value)}
              dica="Visível só para a equipe que fecha o repasse."
            />
          </Cartao>

          {erroDeAcao ? (
            <p role="alert" className="text-apoio text-erro">
              {erroDeAcao.message}
            </p>
          ) : null}
        </div>
      </div>

      <Cartao
        titulo="Prévia do perfil público"
        descricao="É assim que você aparece para quem não conhece o ateliê."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {form.foto ? (
              <Foto
                src={form.foto}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-full object-cover"
              />
            ) : null}
            <div>
              <p className="font-lora text-lg text-tinta">{form.nomeArtistico}</p>
              <p className="text-apoio text-tinta-2">{form.regiao}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {form.tecnicas.slice(0, 2).map((tecnica) => (
                <Selo key={tecnica} variante="destaque">
                  {tecnica}
                </Selo>
              ))}
              {form.certificacoes.length > 0 ? (
                <Selo variante="autentico">Artesã certificada</Selo>
              ) : null}
            </div>
          </div>
          <p className="max-w-2xl text-corpo text-tinta-2">{form.biografia}</p>
        </div>
      </Cartao>
    </form>
  );
}
