// Apoio dos testes unitários dos services que simulam rede com setTimeout.

// Avança o relógio falso até a promessa terminar. O resultado é capturado antes de
// avançar, para uma rejeição nunca ficar sem tratamento.
export async function concluir<T>(promessa: Promise<T>): Promise<T> {
  const resultado = promessa.then(
    (valor) => ({ ok: true as const, valor }),
    (erro: unknown) => ({ ok: false as const, erro }),
  );
  await jest.advanceTimersByTimeAsync(1000);
  const fim = await resultado;
  if (!fim.ok) throw fim.erro;
  return fim.valor;
}

// Mesmo prefixo de lib/armazenamento.ts.
export function lerGravado<T>(chave: string): T | null {
  const bruto = window.localStorage.getItem(`origem:${chave}`);
  return bruto ? (JSON.parse(bruto) as T) : null;
}

export function gravar(chave: string, valor: unknown): void {
  window.localStorage.setItem(`origem:${chave}`, JSON.stringify(valor));
}
