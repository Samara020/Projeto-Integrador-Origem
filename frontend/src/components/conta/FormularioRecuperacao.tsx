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
import { validarEmail, validarSenhaNova } from "@/lib/validacao";
import { authService } from "@/services/auth";

const ETAPAS = ["Pedir link", "Conferir e-mail", "Nova senha"];

function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof ApiError ? causa.message : padrao;
}

export function FormularioRecuperacao() {
  const router = useRouter();
  const parametros = useSearchParams();
  const tokenInicial = parametros.get("token") ?? "";
  const [etapa, setEtapa] = useState<1 | 2 | 3>(() => (tokenInicial ? 3 : 1));
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenInicial);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<{
    email?: string;
    token?: string;
    senha?: string;
    confirmacao?: string;
  }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [avisoEnvio, setAvisoEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedirLink(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const erroEmail = validarEmail(email);
    setErros({ email: erroEmail });
    if (erroEmail) return;

    setEnviando(true);
    setFalha(null);
    setAvisoEnvio(null);
    try {
      const resposta = await authService.recuperarSenha({
        email: email.trim().toLowerCase(),
      });
      setToken(resposta.token ?? "");
      setAvisoEnvio(resposta.mensagem);
      setEtapa(2);
    } catch (causa) {
      setFalha(mensagemDe(causa, "Não foi possível enviar o link. Tente de novo."));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const tokenLimpo = token.trim();
    const novos = {
      token: tokenLimpo ? undefined : "Informe o código de recuperação recebido por e-mail.",
      senha: validarSenhaNova(senha),
      confirmacao: senha !== confirmacao ? "As duas senhas precisam ser iguais." : undefined,
    };
    setErros(novos);
    if (novos.token || novos.senha || novos.confirmacao) return;

    setEnviando(true);
    setFalha(null);
    try {
      const resposta = await authService.redefinirSenha({ token: tokenLimpo, senha });
      toaster.create({ type: "success", title: "Senha alterada", description: resposta.mensagem });
      router.push("/entrar");
    } catch (causa) {
      setFalha(mensagemDe(causa, "Não foi possível salvar a senha. Tente de novo."));
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
              {avisoEnvio ??
                `Se ${email} tiver conta na Origem, as instruções para criar uma senha nova foram enviadas.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Botao onClick={() => setEtapa(3)}>Já tenho o código</Botao>
            <Botao variante="secundario" onClick={() => setEtapa(1)}>
              Usar outro e-mail
            </Botao>
          </div>
        </div>
      )}

      {etapa === 3 && (
        <form onSubmit={salvarSenha} noValidate className="flex flex-col gap-2">
          <Campo
            id="recuperar-token"
            rotulo="Código de recuperação"
            placeholder="Cole o código recebido"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setErros((a) => ({ ...a, token: undefined }));
            }}
            erro={erros.token}
          />
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
        </form>
      )}
    </div>
  );
}
