// Acesso seguro ao localStorage: janela privada e SSR não podem quebrar a tela.
const PREFIXO = "origem:";

export function lerLocal<T>(chave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

export function gravarLocal(chave: string, valor: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Sem espaço ou bloqueado: o estado segue só em memória.
  }
}

// Igual a gravarLocal, mas diz se gravou: decisão do admin não pode "dar certo" sem persistir.
export function gravarLocalVerificado(chave: string, valor: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    const json = JSON.stringify(valor);
    window.localStorage.setItem(PREFIXO + chave, json);
    return window.localStorage.getItem(PREFIXO + chave) === json;
  } catch {
    return false;
  }
}

export function apagarLocal(chave: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIXO + chave);
  } catch {
    // Nada a fazer.
  }
}
