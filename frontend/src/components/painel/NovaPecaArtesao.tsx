"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Foto } from "@/components/ui/Foto";
import { Selecao } from "@/components/ui/Selecao";
import { toaster } from "@/components/ui/toaster";
import { useCategorias, useTecnicas } from "@/hooks/useCatalogo";
import { useAcoesArtesao, useRascunhoPeca } from "@/hooks/usePainelArtesao";
import { useSessao } from "@/hooks/useSessao";
import { formatarMoeda } from "@/lib/formato";
import type { NovoProduto } from "@/types";

const MAXIMO_FOTOS = 5;
const LIMITE_BYTES = 400 * 1024;

type Erros = Partial<Record<keyof NovoProduto | "fotos", string>>;

const FORMULARIO_VAZIO: NovoProduto = {
  nome: "",
  descricao: "",
  categoria: "",
  tecnica: "",
  material: "",
  dimensoes: "",
  peso: 0,
  origem: "",
  preco: 0,
  modalidadeProducao: "PRONTA_ENTREGA",
  estoque: 1,
  informacoesOrigem: "",
  certificado: "",
  imagens: [],
};

function numero(texto: string) {
  const limpo = texto.replace(/\./g, "").replace(",", ".").trim();
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : 0;
}

export default function NovaPecaArtesao() {
  const { dados: rascunho } = useRascunhoPeca();
  const { dados: categorias } = useCategorias();
  const { dados: tecnicas } = useTecnicas();

  return (
    <FormularioNovaPeca
      key={rascunho ? "rascunho" : "novo"}
      inicial={rascunho ?? FORMULARIO_VAZIO}
      categorias={(categorias ?? []).map((categoria) => categoria.nome)}
      tecnicas={(tecnicas ?? []).map((tecnica) => tecnica.nome)}
    />
  );
}

function FormularioNovaPeca({
  inicial,
  categorias,
  tecnicas,
}: {
  inicial: NovoProduto;
  categorias: string[];
  tecnicas: string[];
}) {
  const router = useRouter();
  const { usuario } = useSessao();
  const { criarPeca, salvarRascunho, salvando, erro: erroDeAcao } = useAcoesArtesao();

  const [form, setForm] = useState<NovoProduto>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [avisoFotos, setAvisoFotos] = useState<string | null>(null);
  const arquivoFotos = useRef<HTMLInputElement>(null);

  function mudar(campo: keyof NovoProduto, valor: NovoProduto[keyof NovoProduto]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function validar(peca: NovoProduto): Erros {
    const problemas: Erros = {};
    if (!peca.nome.trim()) problemas.nome = "Dê um nome à peça.";
    if (!peca.categoria) problemas.categoria = "Escolha a categoria.";
    if (peca.descricao.trim().length < 20)
      problemas.descricao = "Conte a história da peça em pelo menos 20 caracteres.";
    if (!peca.tecnica) problemas.tecnica = "Escolha a técnica.";
    if (!peca.material.trim()) problemas.material = "Informe o material.";
    if (!peca.dimensoes.trim()) problemas.dimensoes = "Informe as dimensões.";
    if (peca.peso <= 0) problemas.peso = "Informe o peso em kg.";
    if (peca.preco <= 0) problemas.preco = "Informe o preço.";
    if (peca.modalidadeProducao !== "PECA_UNICA" && peca.estoque < 1)
      problemas.estoque = "Tenha pelo menos uma peça pronta.";
    if (!peca.informacoesOrigem.trim()) problemas.informacoesOrigem = "Conte de onde vem a peça.";
    if (peca.imagens.length === 0) problemas.fotos = "Adicione ao menos uma foto.";
    return problemas;
  }

  function montar(): NovoProduto {
    return {
      ...form,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      material: form.material.trim(),
      dimensoes: form.dimensoes.trim(),
      origem: form.origem.trim() || form.informacoesOrigem.trim(),
      informacoesOrigem: form.informacoesOrigem.trim(),
      estoque: form.modalidadeProducao === "PECA_UNICA" ? 1 : form.estoque,
    };
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const peca = montar();
    const problemas = validar(peca);
    setErros(problemas);
    if (Object.values(problemas).some(Boolean)) {
      setAvisoFotos(null);
      toaster.create({
        type: "error",
        title: "Faltam campos para publicar",
        description: "Olhe as mensagens em vermelho abaixo dos campos.",
      });
      return;
    }

    void criarPeca(peca, () => {
      toaster.create({
        type: "success",
        title: "Peça enviada para validação",
        description: "Ela aparece no seu estoque assim que for aprovada.",
      });
      router.push("/painel/artesao/estoque");
    }).catch(() => {});
  }

  function guardarRascunho() {
    void salvarRascunho(montar(), () => {
      toaster.create({
        type: "success",
        title: "Rascunho salvo",
        description: "Você pode voltar para terminar depois.",
      });
    }).catch(() => {});
  }

  async function escolherFotos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? []);
    setAvisoFotos(null);
    if (arquivos.length === 0) return;

    const pesadas = arquivos.filter((arquivo) => arquivo.size > LIMITE_BYTES);
    if (pesadas.length > 0) {
      setErros((atual) => ({
        ...atual,
        fotos: "Foto acima de 400 KB não entra. Envie uma versão menor.",
      }));
      setAvisoFotos(pesadas.map((arquivo) => arquivo.name).join(", "));
      evento.target.value = "";
      return;
    }

    const lidas = await Promise.all(arquivos.map((arquivo) => lerComoDataUrl(arquivo)));
    const restantes = MAXIMO_FOTOS - form.imagens.length;
    if (lidas.length > restantes) {
      setErros((atual) => ({
        ...atual,
        fotos: `Você pode ter ${MAXIMO_FOTOS} fotos por peça.`,
      }));
    }

    setForm((atual) => ({
      ...atual,
      imagens: [...atual.imagens, ...lidas.slice(0, Math.max(restantes, 0))],
    }));
    evento.target.value = "";
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Catálogo do ateliê"
        titulo="Cadastrar nova peça"
        descricao="Conte a peça com detalhe: quem compra precisa sentir o barro, a mão e a história por trás dela."
      />

      <form noValidate onSubmit={enviar} className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Cartao titulo="Fotos da peça" descricao="A primeira foto é a capa na vitrine.">
            {form.imagens.length > 0 ? (
              <ul className="mb-4 flex flex-wrap gap-3">
                {form.imagens.map((imagem, indice) => (
                  <li key={imagem.slice(-24) + indice} className="relative">
                    <Foto
                      src={imagem}
                      alt={`Foto ${indice + 1} da peça`}
                      width={96}
                      height={96}
                      className="size-24 rounded-raio object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        mudar(
                          "imagens",
                          form.imagens.filter((_, posicao) => posicao !== indice),
                        )
                      }
                      className="absolute -right-2 -top-2 inline-flex size-7 items-center justify-center rounded-full border border-borda bg-superficie text-tinta-2 hover:border-borda-forte hover:text-tinta"
                      aria-label={`Remover foto ${indice + 1}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <input
              ref={arquivoFotos}
              id="fotos-peca"
              type="file"
              accept="image/*"
              multiple
              onChange={escolherFotos}
              className="sr-only"
            />
            <Botao
              variante="secundario"
              onClick={() => arquivoFotos.current?.click()}
              disabled={form.imagens.length >= MAXIMO_FOTOS}
            >
              Adicionar fotos
            </Botao>
            {erros.fotos ? (
              <p role="alert" className="mt-2 text-apoio text-erro">
                {erros.fotos}
                {avisoFotos ? ` (${avisoFotos})` : ""}
              </p>
            ) : (
              <p className="mt-2 text-apoio text-tinta-3">
                JPG ou PNG de até 400 KB, até {MAXIMO_FOTOS} fotos.
              </p>
            )}
          </Cartao>

          <Cartao titulo="A peça">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="nome"
                rotulo="Nome da peça"
                value={form.nome}
                onChange={(evento) => mudar("nome", evento.target.value)}
                erro={erros.nome}
                placeholder="Luminária Mandacaru"
              />
              <Selecao
                id="categoria"
                rotulo="Categoria"
                value={form.categoria}
                opcoes={categorias.map((nome) => ({ id: nome, nome }))}
                onChange={(evento) => mudar("categoria", evento.target.value)}
                erro={erros.categoria}
              />
              <div className="sm:col-span-2">
                <AreaTexto
                  id="descricao"
                  rotulo="Descrição"
                  value={form.descricao}
                  onChange={(evento) => mudar("descricao", evento.target.value)}
                  erro={erros.descricao}
                  dica="O que a pessoa leva para casa e por que vale o preço."
                />
              </div>
              <Selecao
                id="tecnica"
                rotulo="Técnica artesanal"
                value={form.tecnica}
                opcoes={tecnicas.map((nome) => ({ id: nome, nome }))}
                onChange={(evento) => mudar("tecnica", evento.target.value)}
                erro={erros.tecnica}
              />
              <Campo
                id="material"
                rotulo="Materiais"
                value={form.material}
                onChange={(evento) => mudar("material", evento.target.value)}
                erro={erros.material}
                placeholder="Barro vermelho, pigmento natural"
              />
              <Campo
                id="dimensoes"
                rotulo="Dimensões"
                value={form.dimensoes}
                onChange={(evento) => mudar("dimensoes", evento.target.value)}
                erro={erros.dimensoes}
                placeholder="28 × 18 × 18 cm"
              />
              <Campo
                id="peso"
                rotulo="Peso (kg)"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={form.peso || ""}
                onChange={(evento) => mudar("peso", numero(evento.target.value))}
                erro={erros.peso}
                placeholder="1,2"
              />
            </div>
          </Cartao>

          <Cartao titulo="Preço e disponibilidade">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id="preco"
                rotulo="Preço (R$)"
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={form.preco || ""}
                onChange={(evento) => mudar("preco", numero(evento.target.value))}
                erro={erros.preco}
                dica={form.preco > 0 ? `Aparece como ${formatarMoeda(form.preco)}.` : undefined}
              />
              <Campo
                id="estoque"
                rotulo="Quantidade em estoque"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.modalidadeProducao === "PECA_UNICA" ? 1 : form.estoque || ""}
                disabled={form.modalidadeProducao === "PECA_UNICA"}
                onChange={(evento) => mudar("estoque", Number(evento.target.value))}
                erro={erros.estoque}
              />
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-apoio text-tinta">
              <input
                id="peca-unica"
                type="checkbox"
                checked={form.modalidadeProducao === "PECA_UNICA"}
                onChange={(evento) =>
                  mudar(
                    "modalidadeProducao",
                    evento.target.checked ? "PECA_UNICA" : "PRONTA_ENTREGA",
                  )
                }
                className="mt-1 size-4 accent-terracota"
              />
              <span>
                Esta é uma peça única
                <span className="block text-tinta-3">
                  Uma só peça, feita sob encomenda. O estoque vai a 1 automaticamente.
                </span>
              </span>
            </label>
          </Cartao>

          <Cartao
            titulo="Origem e certificação"
            descricao="É o que separa uma peça da Origem de qualquer peça na internet."
          >
            <AreaTexto
              id="informacoes-origem"
              rotulo="Informações de origem"
              value={form.informacoesOrigem}
              onChange={(evento) => mudar("informacoesOrigem", evento.target.value)}
              erro={erros.informacoesOrigem}
              placeholder="Caruaru, Pernambuco · tradição familiar desde 1987"
            />
            <label className="mt-2 flex flex-col gap-2">
              <span className="text-apoio font-bold text-tinta">Certificado de autenticidade</span>
              <input
                id="certificado"
                type="file"
                accept="application/pdf,image/*"
                onChange={(evento) => mudar("certificado", evento.target.files?.[0]?.name ?? "")}
                className="text-apoio text-tinta-2 file:mr-3 file:rounded-raio file:border-0 file:bg-superficie-2 file:px-3 file:py-2 file:text-apoio file:font-bold file:text-tinta"
              />
              <span className="min-h-5 text-apoio text-tinta-3">
                {form.certificado
                  ? `Arquivo: ${form.certificado}`
                  : "PDF do selo ou registro de origem."}
              </span>
            </label>
          </Cartao>
        </div>

        <div className="flex flex-col gap-6">
          <Cartao titulo="Prévia do anúncio">
            <div className="overflow-hidden rounded-raio border border-borda">
              <div className="flex aspect-[4/3] items-center justify-center bg-superficie-2">
                {form.imagens[0] ? (
                  <Foto
                    src={form.imagens[0]}
                    alt=""
                    width={320}
                    height={240}
                    className="size-full object-cover"
                  />
                ) : (
                  <p className="px-4 text-center text-apoio text-tinta-3">
                    A primeira foto vira a capa.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <p className="font-lora text-tinta">{form.nome || "Nome da peça"}</p>
                <p className="text-apoio text-tinta-2">
                  {usuario?.nome ?? "Seu nome"} · {form.origem || "Pernambuco"}
                </p>
                <p className="font-lora text-lg text-terracota">
                  {form.preco > 0 ? formatarMoeda(form.preco) : "R$ 0,00"}
                </p>
              </div>
            </div>
          </Cartao>

          {erroDeAcao ? (
            <p role="alert" className="text-apoio text-erro">
              {erroDeAcao.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <Botao
              type="submit"
              larguraTotal
              carregando={salvando === "criar-peca"}
              disabled={salvando === "rascunho"}
            >
              Publicar peça
            </Botao>
            <Botao
              variante="secundario"
              larguraTotal
              onClick={guardarRascunho}
              carregando={salvando === "rascunho"}
              disabled={salvando === "criar-peca"}
            >
              Salvar rascunho
            </Botao>
            <p className="text-apoio text-tinta-3">
              A peça entra em validação e só aparece na vitrine depois de aprovada.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function lerComoDataUrl(arquivo: File) {
  return new Promise<string>((resolver) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  });
}
