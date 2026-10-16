const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const nota = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const inteiro = new Intl.NumberFormat("pt-BR");

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

export function formatarNota(valor: number): string {
  return nota.format(valor);
}

export function formatarInteiro(valor: number): string {
  return inteiro.format(valor);
}

export function formatarData(iso: string): string {
  return dataCurta.format(new Date(iso));
}

export function plural(quantidade: number, um: string, varios: string): string {
  return `${formatarInteiro(quantidade)} ${quantidade === 1 ? um : varios}`;
}

// "há 5 min", "há 2 h", "ontem", "há 3 dias"
export function tempoRelativo(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

// "Maria Clara Souza" vira "MS". Usado no avatar do perfil.
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
