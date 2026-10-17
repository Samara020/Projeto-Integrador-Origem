"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useAcoesAdmin, usePerfilAdmin } from "@/hooks/useAdmin";
import { useSessao } from "@/hooks/useSessao";
import { formatarData, iniciais } from "@/lib/formato";
import type { AlteracaoSenha, PerfilAdmin as Perfil, PerfilAdminEdicao } from "@/types";

type ErrosDados = Partial<Record<keyof PerfilAdminEdicao, string>>;
type ErrosSenha = Partial<Record<keyof AlteracaoSenha, string>>;

const CARTAO = "flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card";
const TITULO_CARTAO = "font-titulo text-h3 font-bold text-tinta";
const SENHA_VAZIA: AlteracaoSenha = { senhaAtual: "", novaSenha: "", confirmacao: "" };

// Id do campo de cada chave, para levar o foco ao primeiro erro.
const CAMPO_SENHA: Record<keyof AlteracaoSenha, string> = {
  senhaAtual: "senha-atual",
  novaSenha: "nova-senha",
  confirmacao: "confirmar-senha",
};

function validarDados(dados: PerfilAdminEdicao): ErrosDados {
  return dados.nome.trim() ? {} : { nome: "Informe o nome de quem administra." };
}

// Mesmas mensagens do service. Confirmação vazia também não coincide: o envio vazio mostra as três.
function validarSenha(senha: AlteracaoSenha): ErrosSenha {
  const problemas: ErrosSenha = {};
  if (!senha.senhaAtual) problemas.senhaAtual = "Informe a senha atual.";
  if (senha.novaSenha.length < 8)
    problemas.novaSenha = "A nova senha precisa de pelo menos 8 caracteres.";
  if (!senha.confirmacao || senha.confirmacao !== senha.novaSenha)
    problemas.confirmacao = "As senhas não coincidem.";
  return problemas;
}

function Carregando() {
  return (
    <div className="flex flex-col gap-6" aria-label="Carregando perfil do administrador" aria-busy="true">
      <Esqueleto className="h-10 w-80 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Esqueleto className="h-64" />
        <Esqueleto className="h-96 lg:col-span-2" />
      </div>
    </div>
  );
}

export default function PerfilAdmin() {
  const { dados, carregando, erro, recarregar } = usePerfilAdmin();

  if (carregando) return <Carregando />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-titulo text-h1 font-bold text-tinta">Perfil do administrador</h1>
        <p className="text-corpo text-tinta-2">Seus dados na equipe da Origem e a senha de acesso.</p>
      </header>

      {erro ? (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      ) : dados ? (
        <Cartoes perfil={dados} recarregar={recarregar} />
      ) : null}
    </div>
  );
}

function Cartoes({ perfil, recarregar }: { perfil: Perfil; recarregar: () => void }) {
  const router = useRouter();
  const { sair } = useSessao();
  const { salvarPerfil, alterarSenha, salvando, erro: erroDeAcao } = useAcoesAdmin();

  const [dados, setDados] = useState<PerfilAdminEdicao>({
    nome: perfil.nome,
    funcao: perfil.funcao,
    telefone: perfil.telefone,
  });
  const [errosDados, setErrosDados] = useState<ErrosDados>({});
  const [senha, setSenha] = useState<AlteracaoSenha>(SENHA_VAZIA);
  const [errosSenha, setErrosSenha] = useState<ErrosSenha>({});
  // O hook guarda um erro só: mostramos no formulário que fez o último envio.
  const [ultimoEnvio, setUltimoEnvio] = useState<"perfil" | "senha" | null>(null);
  const [saindo, setSaindo] = useState(false);

  function mudarDados(campo: keyof PerfilAdminEdicao, valor: string) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErrosDados((atual) => ({ ...atual, [campo]: undefined }));
  }

  function mudarSenha(campo: keyof AlteracaoSenha, valor: string) {
    setSenha((atual) => ({ ...atual, [campo]: valor }));
    setErrosSenha((atual) => ({ ...atual, [campo]: undefined }));
  }

  function enviarDados(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problemas = validarDados(dados);
    setErrosDados(problemas);
    if (problemas.nome) {
      document.getElementById("nome")?.focus();
      return;
    }

    setUltimoEnvio("perfil");
    void salvarPerfil(dados, () => {
      toaster.create({
        type: "success",
        title: "Perfil atualizado",
        description: "O nome novo já aparece no cabeçalho.",
      });
      recarregar();
    }).catch(() => {});
  }

  function enviarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problemas = validarSenha(senha);
    setErrosSenha(problemas);
    const primeiro = (Object.keys(CAMPO_SENHA) as (keyof AlteracaoSenha)[]).find(
      (campo) => problemas[campo],
    );
    if (primeiro) {
      document.getElementById(CAMPO_SENHA[primeiro])?.focus();
      return;
    }

    setUltimoEnvio("senha");
    void alterarSenha(senha, () => setSenha(SENHA_VAZIA))
      .then((resposta) => toaster.create({ type: "success", title: resposta.mensagem }))
      .catch(() => {});
  }

  async function sairDaConta() {
    setSaindo(true);
    await sair();
    router.replace("/entrar");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section aria-labelledby="cartao-conta" className={CARTAO}>
        <h2 id="cartao-conta" className={TITULO_CARTAO}>
          Conta
        </h2>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-terracota font-titulo text-h2 font-bold text-white"
          >
            {iniciais(perfil.nome)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-corpo font-bold text-tinta">{perfil.nome}</p>
            <p className="text-apoio text-tinta-2 wrap-anywhere">{perfil.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Selo variante="neutro">Administrador</Selo>
          <p className="text-apoio text-tinta-2">Na equipe desde {formatarData(perfil.criadoEm)}</p>
        </div>
        <Botao
          variante="secundario"
          larguraTotal
          className="sm:w-auto sm:self-start"
          carregando={saindo}
          onClick={() => void sairDaConta()}
        >
          Sair da conta
        </Botao>
      </section>

      <section aria-labelledby="cartao-dados" className={`${CARTAO} lg:col-span-2`}>
        <h2 id="cartao-dados" className={TITULO_CARTAO}>
          Dados
        </h2>
        <form noValidate onSubmit={enviarDados} aria-labelledby="cartao-dados" className="flex flex-col gap-2">
          <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
            <Campo
              id="nome"
              rotulo="Nome"
              autoComplete="name"
              value={dados.nome}
              onChange={(evento) => mudarDados("nome", evento.target.value)}
              erro={errosDados.nome}
            />
            <Campo
              id="email"
              rotulo="E-mail"
              type="email"
              readOnly
              value={perfil.email}
              dica="O e-mail de acesso é definido pela equipe."
            />
            <Campo
              id="funcao"
              rotulo="Função na equipe"
              value={dados.funcao}
              onChange={(evento) => mudarDados("funcao", evento.target.value)}
            />
            <Campo
              id="telefone"
              rotulo="Telefone"
              type="tel"
              autoComplete="tel"
              value={dados.telefone}
              onChange={(evento) => mudarDados("telefone", evento.target.value)}
              dica="Opcional. Só a equipe vê."
            />
          </div>
          {ultimoEnvio === "perfil" && erroDeAcao ? (
            <p role="alert" className="text-apoio text-erro">
              {erroDeAcao.message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Botao type="submit" larguraTotal className="sm:w-auto" carregando={salvando === "perfil"}>
              Salvar alterações
            </Botao>
          </div>
        </form>
      </section>

      <section aria-labelledby="cartao-senha" className={`${CARTAO} lg:col-span-3`}>
        <h2 id="cartao-senha" className={TITULO_CARTAO}>
          Senha
        </h2>
        <form noValidate onSubmit={enviarSenha} aria-labelledby="cartao-senha" className="flex flex-col gap-2">
          <div className="grid gap-x-4 gap-y-2 md:grid-cols-3">
            <Campo
              id="senha-atual"
              type="password"
              rotulo="Senha atual"
              autoComplete="current-password"
              value={senha.senhaAtual}
              onChange={(evento) => mudarSenha("senhaAtual", evento.target.value)}
              erro={errosSenha.senhaAtual}
            />
            <Campo
              id="nova-senha"
              type="password"
              rotulo="Nova senha"
              autoComplete="new-password"
              value={senha.novaSenha}
              onChange={(evento) => mudarSenha("novaSenha", evento.target.value)}
              erro={errosSenha.novaSenha}
              dica="Pelo menos 8 caracteres."
            />
            <Campo
              id="confirmar-senha"
              type="password"
              rotulo="Confirmar nova senha"
              autoComplete="new-password"
              value={senha.confirmacao}
              onChange={(evento) => mudarSenha("confirmacao", evento.target.value)}
              erro={errosSenha.confirmacao}
            />
          </div>
          {ultimoEnvio === "senha" && erroDeAcao ? (
            <p role="alert" className="text-apoio text-erro">
              {erroDeAcao.message}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Botao
              type="submit"
              variante="contorno"
              larguraTotal
              className="sm:w-auto"
              carregando={salvando === "senha"}
            >
              Alterar senha
            </Botao>
          </div>
        </form>
      </section>
    </div>
  );
}
