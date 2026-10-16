"use client";

import { Palette, ShieldCheck, ShoppingBag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Selecao } from "@/components/ui/Selecao";
import { toaster } from "@/components/ui/toaster";
import { useRegioes, useTecnicas } from "@/hooks/useCatalogo";
import { useSessao } from "@/hooks/useSessao";
import { destinoAposEntrar, voltaDaUrl } from "@/lib/destino";
import { ApiError } from "@/lib/http";
import {
  validarEmail,
  validarNome,
  validarSenhaNova,
} from "@/lib/validacao";
import type { Papel } from "@/types";

// Administrador só se cadastra com o código de convite que a equipe entrega.
const PERFIS: {
  papel: Papel;
  nome: string;
  descricao: string;
  Icone: LucideIcon;
}[] = [
  {
    papel: "COMPRADOR",
    nome: "Comprador",
    descricao: "Quero comprar direto de quem faz.",
    Icone: ShoppingBag,
  },
  {
    papel: "ARTESAO",
    nome: "Artesão",
    descricao: "Quero vender minhas peças.",
    Icone: Palette,
  },
  {
    papel: "ADMINISTRADOR",
    nome: "Administrador",
    descricao: "Vou cuidar da plataforma.",
    Icone: ShieldCheck,
  },
];

type Erros = {
  nome?: string;
  email?: string;
  senha?: string;
  tecnica?: string;
  regiao?: string;
  convite?: string;
  termos?: string;
};

function validarConvite(valor: string): string | undefined {
  if (!valor.trim()) return "Digite o código de convite.";
}

export function FormularioCadastro() {
  const router = useRouter();
  const { cadastrar } = useSessao();
  const tecnicas = useTecnicas();
  const regioes = useRegioes();

  const [papel, setPapel] = useState<Papel>("COMPRADOR");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tecnica, setTecnica] = useState("");
  const [regiao, setRegiao] = useState("");
  const [convite, setConvite] = useState("");
  const [termos, setTermos] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const artesao = papel === "ARTESAO";
  const administrador = papel === "ADMINISTRADOR";
  const listasFalharam = artesao && (tecnicas.erro || regioes.erro);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos: Erros = {
      nome: validarNome(nome),
      email: validarEmail(email),
      senha: validarSenhaNova(senha),
      tecnica: artesao && !tecnica ? "Escolha sua técnica principal." : undefined,
      regiao: artesao && !regiao ? "Escolha a região onde você produz." : undefined,
      convite: administrador ? validarConvite(convite) : undefined,
      termos: termos ? undefined : "Aceite os termos para criar a conta.",
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    setEnviando(true);
    setFalha(null);
    try {
      await cadastrar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        papel,
        ...(artesao ? { tecnica, regiao } : {}),
        ...(administrador ? { codigoConvite: convite.trim() } : {}),
      });
      toaster.create({
        type: "success",
        title: "Conta criada",
        description: administrador
          ? "Seu acesso ao painel administrativo está liberado."
          : "Você já está dentro. Boas descobertas.",
      });
      router.push(destinoAposEntrar(papel, voltaDaUrl()));
    } catch (causa) {
      setFalha(
        causa instanceof ApiError
          ? causa.message
          : "Não foi possível criar a conta. Tente de novo.",
      );
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-2">
      {falha && <AvisoFormulario mensagem={falha} />}

      <fieldset className="mb-4 flex flex-col gap-2">
        <legend className="mb-2 text-apoio font-bold text-tinta">
          Como você quer usar a Origem?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERFIS.map(({ Icone, ...perfil }) => (
            <label
              key={perfil.papel}
              className={`flex cursor-pointer flex-col gap-1 rounded-raio border px-4 py-3 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-terracota ${
                perfil.papel === "ADMINISTRADOR" ? "sm:col-span-2" : ""
              } ${
                papel === perfil.papel
                  ? "border-terracota bg-terracota/5"
                  : "border-borda hover:border-borda-forte"
              }`}
            >
              <input
                type="radio"
                name="papel"
                value={perfil.papel}
                checked={papel === perfil.papel}
                onChange={() => setPapel(perfil.papel)}
                className="sr-only"
              />
              <span className="inline-flex items-center gap-2 text-apoio font-bold text-tinta">
                <Icone
                  className={`size-4 shrink-0 ${
                    papel === perfil.papel ? "text-terracota" : "text-tinta-3"
                  }`}
                  aria-hidden="true"
                />
                {perfil.nome}
              </span>
              <span className="text-legenda text-tinta-3">
                {perfil.descricao}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        id="cadastro-nome"
        rotulo="Nome completo"
        autoComplete="name"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => setErros((a) => ({ ...a, nome: validarNome(nome) }))}
        erro={erros.nome}
      />
      <Campo
        id="cadastro-email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        placeholder="voce@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setErros((a) => ({ ...a, email: validarEmail(email) }))}
        erro={erros.email}
      />
      <Campo
        id="cadastro-senha"
        rotulo="Senha"
        type="password"
        autoComplete="new-password"
        dica="Pelo menos 8 caracteres."
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        onBlur={() =>
          setErros((a) => ({ ...a, senha: validarSenhaNova(senha) }))
        }
        erro={erros.senha}
      />

      {artesao && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao
            id="cadastro-tecnica"
            rotulo="Técnica artesanal"
            vazio={tecnicas.carregando ? "Carregando" : "Escolha"}
            opcoes={tecnicas.dados ?? []}
            disabled={!tecnicas.dados}
            value={tecnica}
            onChange={(e) => setTecnica(e.target.value)}
            erro={erros.tecnica}
          />
          <Selecao
            id="cadastro-regiao"
            rotulo="Região"
            vazio={regioes.carregando ? "Carregando" : "Escolha"}
            opcoes={regioes.dados ?? []}
            disabled={!regioes.dados}
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            erro={erros.regiao}
          />
        </div>
      )}

      {administrador && (
        <Campo
          id="cadastro-convite"
          rotulo="Código de convite"
          autoComplete="off"
          spellCheck={false}
          dica="A equipe da Origem envia esse código a quem vai administrar a plataforma."
          value={convite}
          onChange={(e) => setConvite(e.target.value)}
          onBlur={() =>
            setErros((a) => ({ ...a, convite: validarConvite(convite) }))
          }
          erro={erros.convite}
        />
      )}

      {listasFalharam && (
        <div className="flex flex-wrap items-center gap-3 text-apoio text-erro">
          Não deu para carregar técnicas e regiões.
          <Botao
            variante="fantasma"
            className="h-auto"
            onClick={() => {
              tecnicas.recarregar();
              regioes.recarregar();
            }}
          >
            Tentar de novo
          </Botao>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-start gap-3 text-apoio text-tinta-2">
          <input
            type="checkbox"
            checked={termos}
            onChange={(e) => setTermos(e.target.checked)}
            aria-invalid={erros.termos ? true : undefined}
            aria-describedby={erros.termos ? "cadastro-termos-erro" : undefined}
            className="mt-0.5 size-5 shrink-0 accent-terracota"
          />
          Li e aceito os Termos de Uso e a Política de Privacidade.
        </label>
        <p id="cadastro-termos-erro" className="min-h-5 text-apoio text-erro">
          {erros.termos}
        </p>
      </div>

      <Botao type="submit" larguraTotal carregando={enviando}>
        {enviando ? "Criando conta" : "Criar minha conta"}
      </Botao>

      <p className="flex flex-wrap justify-between gap-2 text-apoio text-tinta-3">
        Já tem conta?
        <Link href="/entrar" className="font-bold text-terracota hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
