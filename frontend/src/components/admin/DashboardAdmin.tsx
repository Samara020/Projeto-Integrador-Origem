"use client";

import { Bell, CheckCircle2, CircleAlert, LayoutDashboard, LogOut, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useMetricasAdmin } from "@/hooks/useMetricasAdmin";
import { useSessao } from "@/hooks/useSessao";
import { formatarInteiro, formatarMoeda, iniciais } from "@/lib/formato";

const atalhos = [
  { nome: "Visão geral", href: "#visao-geral" },
  { nome: "Moderação", href: "#moderacao" },
  { nome: "Validações", href: "#validacoes" },
  { nome: "Usuários", href: "#usuarios" },
  { nome: "Relatórios", href: "#relatorios" },
];

const cartoes = [
  { titulo: "Total de vendas", valor: "vendas" },
  { titulo: "Artesãos ativos", valor: "artesaos" },
  { titulo: "Produtos cadastrados", valor: "produtos" },
  { titulo: "Tickets de suporte", valor: "tickets" },
  { titulo: "Validações pendentes", valor: "validacoes" },
] as const;

function CabecalhoAdmin() {
  const router = useRouter();
  const { usuario, sair } = useSessao();
  const nome = usuario?.nome ?? "";

  async function sairDoPainel() {
    await sair();
    router.replace("/entrar");
  }

  return (
    <header className="border-b border-borda bg-superficie">
      <div className="mx-auto flex min-h-19 w-full max-w-pagina flex-wrap items-center justify-between gap-3 px-margem py-3 lg:flex-nowrap">
        <Link href="/" aria-label="Origem, página inicial" className="shrink-0">
          <Image src="/marca/logo-origem.webp" alt="Origem" width={150} height={56} priority className="h-14 w-auto" />
        </Link>
        <nav aria-label="Navegação administrativa" className="order-3 w-full overflow-x-auto lg:order-none lg:w-auto">
          <ul className="flex min-w-max items-center gap-5 lg:gap-7">
            {atalhos.map((atalho, indice) => (
              <li key={atalho.href}>
                <Link href={atalho.href} aria-current={indice === 0 ? "page" : undefined} className={`inline-flex min-h-10 items-center text-apoio hover:text-terracota ${indice === 0 ? "font-semibold text-terracota" : "text-tinta"}`}>
                  {atalho.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="#moderacao" className="inline-flex size-10 items-center justify-center rounded-raio text-tinta hover:bg-superficie-2" aria-label="Ver alertas de moderação">
            <Bell className="size-5" aria-hidden="true" />
          </Link>
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-terracota text-apoio font-bold text-white" aria-hidden="true">{iniciais(nome)}</span>
          <span className="hidden text-apoio font-semibold text-tinta sm:inline">{nome}</span>
          <button type="button" onClick={() => void sairDoPainel()} className="inline-flex min-h-10 items-center gap-2 rounded-raio px-3 text-apoio font-medium text-tinta transition-colors duration-150 hover:bg-superficie-2">
            <LogOut className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
            <span className="sr-only sm:hidden">Sair da conta de {nome}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Carregando() {
  return (
    <div className="flex flex-col gap-5" aria-label="Carregando painel administrativo" aria-busy="true">
      <Esqueleto className="h-8 w-80 max-w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cartoes.map((cartao) => <Esqueleto key={cartao.valor} className="h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2"><Esqueleto className="h-60" /><Esqueleto className="h-60" /></div>
    </div>
  );
}

export default function DashboardAdmin() {
  const consulta = useMetricasAdmin();
  const dados = consulta.dados;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-fundo">
      <CabecalhoAdmin />
      <div id="conteudo-admin" className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-4 px-margem py-6">
        {consulta.carregando && <Carregando />}
        {consulta.erro && <EstadoErro mensagem={consulta.erro.message} aoTentarDeNovo={consulta.recarregar} />}
        {dados && dados.atividadesRecentes.length === 0 && dados.vendasPorRegiao.length === 0 && (
          <EstadoVazio titulo="Ainda não há dados para exibir" descricao="Os indicadores aparecerão aqui quando houver atividade no marketplace." />
        )}
        {dados && (dados.atividadesRecentes.length > 0 || dados.vendasPorRegiao.length > 0) && (
          <>
            <section id="visao-geral" aria-labelledby="admin-titulo" className="flex flex-col gap-4">
              <h1 id="admin-titulo" className="font-titulo text-h1 font-bold text-tinta">O pulso do marketplace, em um só lugar.</h1>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {cartoes.map((cartao) => {
                  const valor = cartao.valor === "vendas" ? formatarMoeda(dados.totalVendas) : cartao.valor === "artesaos" ? formatarInteiro(dados.totalArtesaosAtivos) : cartao.valor === "produtos" ? formatarInteiro(dados.totalProdutos) : cartao.valor === "tickets" ? formatarInteiro(dados.ticketsSuporte) : formatarInteiro(dados.validacoesPendentes);
                  const detalhe = cartao.valor === "vendas" ? `+${dados.variacaoVendas}% no período` : cartao.valor === "artesaos" ? `+${formatarInteiro(dados.novosArtesaosNoMes)} este mês` : cartao.valor === "produtos" ? `${formatarInteiro(dados.novosProdutos)} novos` : cartao.valor === "tickets" ? `${formatarInteiro(dados.ticketsUrgentes)} urgentes` : "Revisar hoje";
                  return (
                    <article key={cartao.valor} className="flex min-h-28 flex-col gap-2 rounded-raio border border-borda bg-superficie p-4 shadow-card">
                      <h2 className="text-legenda font-semibold uppercase tracking-wide text-tinta-3">{cartao.titulo}</h2>
                      <p className="font-titulo text-h2 font-bold tabular-nums text-tinta">{valor}</p>
                      <p className={`text-apoio ${cartao.valor === "tickets" || cartao.valor === "validacoes" ? "text-terracota" : "text-selo"}`}>{detalhe}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="relatorios" aria-label="Relatórios do marketplace" className="grid gap-4 xl:grid-cols-12">
              <article className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card xl:col-span-5">
                <h2 className="font-titulo text-h3 font-bold">Vendas por região</h2>
                <div className="flex h-40 items-end gap-3 border-b border-borda px-1 sm:gap-5" role="img" aria-label={`Vendas por região: ${dados.vendasPorRegiao.map((r) => `${r.sigla} ${r.percentual}%`).join(", ")}`}>
                  {dados.vendasPorRegiao.map((regiao, indice) => (
                    <div key={regiao.sigla} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div className={`w-full max-w-20 rounded-t-raio ${indice === 3 ? "bg-terracota" : "bg-aviso"}`} style={{ height: `${regiao.percentual * 0.86}%` }} />
                      <span className="text-legenda text-tinta-3">{regiao.sigla}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card xl:col-span-3">
                <h2 className="font-titulo text-h3 font-bold">Categorias mais vendidas</h2>
                <ul className="flex flex-col gap-3">
                  {dados.categoriasMaisVendidas.map((categoria) => (
                    <li key={categoria.nome} className="flex items-center justify-between gap-3 text-apoio">
                      <span>{categoria.nome}</span><span className="font-bold text-terracota">{categoria.percentual}%</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article id="moderacao" className="flex flex-col gap-3 rounded-raio border border-borda bg-superficie p-4 shadow-card xl:col-span-4">
                <h2 className="font-titulo text-h3 font-bold">Alertas de moderação</h2>
                <div className="flex items-center gap-2 rounded-raio bg-superficie-2 p-3 text-apoio text-tinta-2">
                  <CircleAlert className="size-4 shrink-0 text-aviso" aria-hidden="true" />
                  {formatarInteiro(dados.denunciasPendentes)} denúncias exigem prioridade
                </div>
                <p id="validacoes" className="text-apoio text-tinta-2">{formatarInteiro(dados.validacoesPendentes)} validações pendentes</p>
                <Link href="/painel/admin#moderacao" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-raio bg-terracota px-4 text-apoio font-bold text-white hover:bg-terracota-escura">
                  Revisar agora <CheckCircle2 className="size-4" aria-hidden="true" />
                </Link>
                <h3 id="usuarios" className="mt-1 inline-flex items-center gap-2 font-titulo text-apoio font-bold"><Users className="size-4" aria-hidden="true" /> Usuários recentes</h3>
                <p className="text-apoio text-tinta-3">{dados.usuariosRecentes.map((usuario) => `${usuario.nome} · ${usuario.papel}`).join(" • ")}</p>
              </article>
            </section>

            <section aria-labelledby="atividades-titulo" className="rounded-raio border border-borda bg-superficie p-4 shadow-card">
              <h2 id="atividades-titulo" className="mb-2 font-titulo text-h3 font-bold">Atividades recentes</h2>
              <ul className="flex flex-col gap-2 text-apoio text-tinta-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {dados.atividadesRecentes.map((atividade) => <li key={atividade} className="inline-flex items-center gap-2"><LayoutDashboard className="size-4 text-tinta-3" aria-hidden="true" />{atividade}</li>)}
              </ul>
            </section>
          </>
        )}
      </div>
      <footer className="h-16 shrink-0 bg-tinta" aria-label="Rodapé administrativo" />
    </div>
  );
}
