"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string; confirmacao?: string }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedirLink(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const erroEmail = validarEmail(email);
    setErros({ email: erroEmail });
    if (erroEmail) return;

    setEnviando(true);
    setFalha(null);
    try {
      await authService.recuperarSenha({ email: email.trim().toLowerCase() });
      // Fake API: o token viria no link do e-mail. Aqui ele nasce junto com o pedido.
      setToken(`fake.${Date.now()}`);
      setEtapa(2);
    } catch (causa) {
      setFalha(mensagemDe(causa, "Não foi possível enviar o link. Tente de novo."));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarSenha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = {
      senha: validarSenhaNova(senha),
      confirmacao: senha !== confirmacao ? "As duas senhas precisam ser iguais." : undefined,
    };
    setErros(novos);
    if (novos.senha || novos.confirmacao) return;

    setEnviando(true);
    setFalha(null);
    try {
      const resposta = await authService.redefinirSenha({ token, senha });
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
              Se <strong className="text-tinta">{email}</strong> tiver conta na Origem, o link
              para criar uma senha nova chega em instantes. Ele vale por 1 hora.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Botao onClick={() => setEtapa(3)}>Já abri o link</Botao>
            <Botao variante="secundario" onClick={() => setEtapa(1)}>
              Usar outro e-mail
            </Botao>
          </div>
          {!process.env.NEXT_PUBLIC_API_URL && (
            <p className="rounded-raio bg-superficie-2 px-3 py-2 text-legenda text-tinta-2">
              Nesta versão nenhum e-mail é enviado. O botão acima faz o papel do link.
            </p>
          )}
        </div>
      )}

      {etapa === 3 && (
        <form onSubmit={salvarSenha} noValidate className="flex flex-col gap-2">
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
