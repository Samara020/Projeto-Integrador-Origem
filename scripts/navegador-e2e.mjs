// Navegador dos Testes End-to-End. A esteira usa o Chrome, e só nele o resultado vale como
// prova (docs/tas.md). Fora dele já houve reprovação que não era defeito do sistema: no
// Electron sem tela os avisos flutuantes não são desenhados, e no Firefox a guarda de rede
// do E2E não recebe o tipo do recurso e bloqueia tudo. Histórico na issue #30.
export const NAVEGADOR_DA_ESTEIRA = "chrome";

export function navegadorDoE2E(ambiente = process.env) {
  return ambiente.E2E_BROWSER || NAVEGADOR_DA_ESTEIRA;
}

// E2E_BROWSER aceita o nome do navegador ou o caminho do binário; vale o nome do arquivo.
export function ehChrome(navegador) {
  const nome = String(navegador).split(/[\\/]/).pop().toLowerCase();
  return /^(google-)?chrome(-stable)?(\.exe)?$/.test(nome);
}

// Devolve o aviso a mostrar, ou null quando o navegador é o da esteira.
export function avisoDeNavegador(navegador) {
  if (ehChrome(navegador)) return null;
  return [
    `Aviso: o navegador do E2E é "${navegador}", e a esteira usa o Chrome.`,
    "Reprovação fora do Chrome não é prova de defeito: confirme na esteira antes de abrir demanda.",
    "No Electron sem tela, os casos que conferem aviso flutuante reprovam; no Firefox, a guarda de rede bloqueia todos.",
  ].join("\n");
}
