import type { Metadata } from "next";
import { FormularioRecuperacao } from "@/components/conta/FormularioRecuperacao";
import { PainelConta } from "@/components/conta/PainelConta";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Peça um link por e-mail e crie uma senha nova para a sua conta na Origem.",
};

export default function PaginaRecuperarSenha() {
  return (
    <PainelConta
      titulo="Recuperar senha"
      descricao="Diga o e-mail da conta e enviamos um link para você criar uma senha nova."
    >
      <FormularioRecuperacao />
    </PainelConta>
  );
}
