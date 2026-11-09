// Usado tanto pelo Jest quanto pelo preparo do banco; não registra credenciais.
export function urlBancoTeste(): string {
  const valor = process.env.DATABASE_URL_TEST;
  if (!valor) throw new Error("Defina DATABASE_URL_TEST para um banco exclusivo com sufixo _teste ou _test.");
  const teste = new URL(valor);
  const nome = decodeURIComponent(teste.pathname.slice(1));
  if (!/^postgres(ql)?:$/.test(teste.protocol) || !/_test(e)?$/.test(nome)) {
    throw new Error("DATABASE_URL_TEST deve apontar para PostgreSQL com nome terminado em _teste ou _test.");
  }
  if (process.env.DATABASE_URL) {
    const principal = new URL(process.env.DATABASE_URL);
    const mesmoBanco = principal.hostname === teste.hostname &&
      (principal.port || "5432") === (teste.port || "5432") && principal.pathname === teste.pathname;
    if (mesmoBanco) throw new Error("Banco de testes não pode ser o banco de desenvolvimento, mesmo com parâmetros ou usuários diferentes.");
  }
  return valor;
}
