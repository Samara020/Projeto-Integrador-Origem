import bcrypt from "bcryptjs";

const CUSTO = 10;

/** Hash bcrypt reconhecível; contas antigas podem ter senha em texto puro. */
export const ehSenhaProtegida = (valor: string): boolean =>
  /^\$2[aby]\$\d{2}\$/.test(valor);

export function protegerSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO);
}

export function conferirSenha(senha: string, armazenada: string): Promise<boolean> {
  if (!ehSenhaProtegida(armazenada)) {
    return Promise.resolve(senha === armazenada);
  }
  return bcrypt.compare(senha, armazenada);
}
