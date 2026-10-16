"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { useSessao } from "@/hooks/useSessao";
import { ROTA_PAINEL_ADMIN, destinoAposEntrar, voltaDaUrl } from "@/lib/destino";
import { ApiError } from "@/lib/http";
import { validarEmail, validarSenhaLogin } from "@/lib/validacao";

type Erros = { email?: string; senha?: string };

export function FormularioLogin() {
  const router = useRouter();
  const { usuario, entrar, sair } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos: Erros = {
      email: validarEmail(email),
      senha: validarSenhaLogin(senha),
    };
    setErros(novos);
    if (novos.email || novos.senha) return;

    setEnviando(true);
    setFalha(null);
    try {
      const sessao = await entrar({ email: email.trim().toLowerCase(), senha });
      router.push(destinoAposEntrar(sessao.usuario.papel, voltaDaUrl()));
    } catch (causa) {
      setFalha(
        causa instanceof ApiError
          ? causa.message
          : "Não foi possível entrar. Tente de novo.",
      );
      setEnviando(false);
    }
  }

  if (usuario && !enviando) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-corpo text-tinta-2">
          Você entrou como <strong className="text-tinta">{usuario.nome}</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          {usuario.papel === "ADMINISTRADOR" ? (
            <BotaoLink href={ROTA_PAINEL_ADMIN}>Ir para o painel</BotaoLink>
          ) : (
            <BotaoLink href="/catalogo">Ir para o catálogo</BotaoLink>
          )}
          <Botao variante="secundario" onClick={() => void sair()}>
            Sair da conta
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-2">
      {falha && <AvisoFormulario mensagem={falha} />}

      <Campo
        id="login-email"
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
        id="login-senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Sua senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        onBlur={() =>
          setErros((a) => ({ ...a, senha: validarSenhaLogin(senha) }))
        }
        erro={erros.senha}
      />

      <Link
        href="/recuperar-senha"
        className="inline-flex min-h-10 items-center self-end text-apoio text-terracota hover:underline"
      >
        Esqueci minha senha
      </Link>

      <Botao type="submit" larguraTotal carregando={enviando}>
        {enviando ? "Entrando" : "Entrar"}
      </Botao>

      <p className="flex flex-wrap justify-between gap-2 text-apoio text-tinta-3">
        Ainda não tem conta?
        <Link
          href="/cadastro"
          className="font-bold text-terracota hover:underline"
        >
          Criar cadastro
        </Link>
      </p>

      {/* Só enquanto a Fake API estiver ligada. Sai na Avaliação 2. */}
      {!process.env.NEXT_PUBLIC_API_URL && (
        <p className="rounded-raio bg-superficie-2 px-3 py-2 text-legenda text-tinta-2">
          Contas de demonstração (senha origem123): comprador@origem.dev ou
          admin@origem.dev.
        </p>
      )}
    </form>
  );
}
