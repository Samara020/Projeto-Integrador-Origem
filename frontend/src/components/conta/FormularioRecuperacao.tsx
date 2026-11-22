"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Etapas } from "@/components/ui/Etapas";
import { toaster } from "@/components/ui/toaster";
import { ApiError } from "@/lib/http";
import { authService } from "@/services/auth";
import { validarEmail, validarSenhaNova } from "@/lib/validacao";

const ETAPAS = ["Pedir link", "Conferir e-mail", "Nova senha"];

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof ApiError ? causa.message : padrao;
}

export function FormularioRecuperacao() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenDaUrl = searchParams.get("token") ?? "";

  const [etapa, setEtapa] = useState<1 | 2 | 3>(() => (tokenDaUrl ? 3 : 1));
  const [email, setEmail] = useState("");
  const [tokenManual, setTokenManual] = useState("");
  const [tokenEmMemoria, setTokenEmMemoria] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<{
    email?: string;
    token?: string;
    senha?: string;
    confirmacao?: string;
  }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tokenEfetivo = (tokenDaUrl || tokenEmMemoria || tokenManual).trim();
  const tokenIdentificado = Boolean(tokenDaUrl || tokenEmMemoria);

  async function pedirLink(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const erroEmail = validarEmail(email);
    setErros({ email: erroEmail });
    if (erroEmail) return;

    setEnviando(true);
    setFalha(null);
    try {
      const resposta = await authService.recuperarSenha({ email: email.trim().toLowerCase() });
      setMensagemSucesso(
        resposta.mensagem ||
          "Se o e-mail estiver cadastrado, enviamos as instruções para redefinição de senha.",
      );
      const tokenBackend = (resposta.token || resposta.tokenRecuperacao || "").trim();
      if (tokenBackend) {
        setTokenEmMemoria(tokenBackend);
        setEtapa(3);
      } else {
        setEtapa(2);
      }
    } catch (causa) {
      setFalha(mensagemDe(causa, "Não foi possível enviar o link. Tente de novo."));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = {
      token: !tokenEfetivo ? "Informe o código ou token de recuperação recebido." : undefined,
      senha: validarSenhaNova(senha),
      confirmacao: senha !== confirmacao ? "As duas senhas precisam ser iguais." : undefined,
    };
    setErros(novos);
    if (novos.token || novos.senha || novos.confirmacao) return;

    setEnviando(true);
    setFalha(null);
    try {
      const resposta = await authService.redefinirSenha({
        token: tokenEfetivo,
        novaSenha: senha,
      });
      toaster.create({
        type: "success",
        title: "Senha alterada",
        description: resposta.mensagem || "Sua senha foi redefinida com sucesso.",
      });
      router.push("/entrar");
    } catch (causa) {
      setFalha(
        mensagemDe(
          causa,
          "Não foi possível salvar a senha. Verifique se o código/link é válido ou expirou e tente de novo.",
        ),
      );
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Etapas rotulo="Etapas da recuperação" etapas={ETAPAS} atual={etapa} />

      {falha && <AvisoFormulario mensagem={falha} />}

      {etapa === 1 && (
        <form onSubmit={pedirLink} noValidate className="flex flex-col gap-2">
          <Campo
            id="recuperar-email"
            rotulo="E-mail da conta"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setErros({ email: validarEmail(email) })}
            erro={erros.email}
          />
          <Botao type="submit" larguraTotal carregando={enviando}>
            {enviando ? "Enviando" : "Enviar link de recuperação"}
          </Botao>
          <p className="flex flex-wrap justify-between gap-2 text-apoio text-tinta-3">
            Lembrou a senha?
            <Link href="/entrar" className="font-bold text-terracota hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      )}

      {etapa === 2 && (
        <div role="status" className="flex flex-col items-start gap-4">
          <MailCheck className="size-8 text-selo" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-titulo text-h3 font-bold text-tinta">Confira seu e-mail</p>
            <p className="text-corpo text-tinta-2">
              {mensagemSucesso || (
                <>
                  Se <strong className="text-tinta">{email}</strong> tiver conta na Origem, as
                  instruções para criar uma senha nova chegam em instantes.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Botao onClick={() => { setEtapa(3); setFalha(null); }}>
              Já tenho o código ou link
            </Botao>
            <Botao
              variante="secundario"
              onClick={() => {
                setEtapa(1);
                setFalha(null);
                setMensagemSucesso(null);
              }}
            >
              Usar outro e-mail
            </Botao>
          </div>
        </div>
      )}

      {etapa === 3 && (
        <form onSubmit={salvarSenha} noValidate className="flex flex-col gap-2">
          {!tokenIdentificado && (
            <Campo
              id="recuperar-token"
              rotulo="Código de recuperação"
              type="text"
              autoComplete="off"
              placeholder="Cole o código recebido no e-mail"
              value={tokenManual}
              onChange={(e) => setTokenManual(e.target.value)}
              erro={erros.token}
            />
          )}

          {tokenIdentificado && (
            <p className="rounded-raio bg-superficie-2 px-3 py-2 text-legenda text-tinta-2">
              Código de recuperação identificado a partir do link.
            </p>
          )}

          <Campo
            id="recuperar-senha"
            rotulo="Senha nova"
            type="password"
            autoComplete="new-password"
            dica="Pelo menos 8 caracteres."
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onBlur={() => setErros((a) => ({ ...a, senha: validarSenhaNova(senha) }))}
            erro={erros.senha}
          />
          <Campo
            id="recuperar-confirmacao"
            rotulo="Repita a senha nova"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            erro={erros.confirmacao}
          />
          <Botao type="submit" larguraTotal carregando={enviando}>
            {enviando ? "Salvando" : "Salvar senha nova"}
          </Botao>
          <div className="flex flex-wrap justify-between gap-2 pt-2 text-apoio text-tinta-3">
            <button
              type="button"
              onClick={() => {
                setEtapa(1);
                setFalha(null);
                setTokenManual("");
                setTokenEmMemoria("");
              }}
              className="text-terracota hover:underline"
            >
              Solicitar novo link
            </button>
            <Link href="/entrar" className="font-bold text-terracota hover:underline">
              Voltar para o login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
