import { createHash } from "crypto";
import prisma from "./prisma";

let tabelasInicializadas = false;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function garantirTabelas(): Promise<void> {
  if (tabelasInicializadas) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tokens_revogados (
      token_hash VARCHAR(64) PRIMARY KEY,
      expira_em BIGINT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS sessoes_invalidadas_usuario (
      usuario_id VARCHAR(64) PRIMARY KEY,
      invalidado_ate BIGINT NOT NULL,
      versao_sessao INTEGER NOT NULL DEFAULT 1
    )
  `);
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE sessoes_invalidadas_usuario
      ADD COLUMN IF NOT EXISTS versao_sessao INTEGER NOT NULL DEFAULT 1
    `);
  } catch {}
  tabelasInicializadas = true;
}

export async function revogarToken(token: string, expiraEmSegundos?: number): Promise<void> {
  await garantirTabelas();
  const agora = Math.floor(Date.now() / 1000);
  const exp = expiraEmSegundos ?? agora + 7 * 24 * 60 * 60;
  if (exp <= agora) return;

  const hash = hashToken(token);
  await prisma.$executeRawUnsafe(
    `DELETE FROM tokens_revogados WHERE expira_em <= $1`,
    agora
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO tokens_revogados (token_hash, expira_em)
     VALUES ($1, $2)
     ON CONFLICT (token_hash) DO UPDATE SET expira_em = EXCLUDED.expira_em`,
    hash,
    exp
  );
}

export async function tokenFoiRevogado(token: string): Promise<boolean> {
  await garantirTabelas();
  const agora = Math.floor(Date.now() / 1000);
  const hash = hashToken(token);

  const registros = await prisma.$queryRawUnsafe<{ expira_em: bigint | number }[]>(
    `SELECT expira_em FROM tokens_revogados WHERE token_hash = $1 LIMIT 1`,
    hash
  );

  if (!registros || registros.length === 0) return false;
  const exp = Number(registros[0].expira_em);
  if (exp <= agora) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM tokens_revogados WHERE token_hash = $1`,
      hash
    );
    return false;
  }
  return true;
}

export async function obterVersaoSessaoUsuario(usuarioId: string): Promise<number> {
  await garantirTabelas();
  const registros = await prisma.$queryRawUnsafe<{ versao_sessao?: number | bigint }[]>(
    `SELECT versao_sessao FROM sessoes_invalidadas_usuario WHERE usuario_id = $1 LIMIT 1`,
    String(usuarioId)
  );
  if (!registros || registros.length === 0) return 1;
  return Number(registros[0].versao_sessao) || 1;
}

export async function invalidarSessoesUsuario(usuarioId: string): Promise<void> {
  await garantirTabelas();
  const agora = Math.floor(Date.now() / 1000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO sessoes_invalidadas_usuario (usuario_id, invalidado_ate, versao_sessao)
     VALUES ($1, $2, 2)
     ON CONFLICT (usuario_id) DO UPDATE SET
       invalidado_ate = EXCLUDED.invalidado_ate,
       versao_sessao = COALESCE(sessoes_invalidadas_usuario.versao_sessao, 1) + 1`,
    String(usuarioId),
    agora
  );
}

export async function sessaoUsuarioInvalidada(
  usuarioId: string,
  emitidoEm?: number,
  sv?: number
): Promise<boolean> {
  await garantirTabelas();
  const registros = await prisma.$queryRawUnsafe<{ invalidado_ate: bigint | number; versao_sessao?: number | bigint }[]>(
    `SELECT invalidado_ate, versao_sessao FROM sessoes_invalidadas_usuario WHERE usuario_id = $1 LIMIT 1`,
    String(usuarioId)
  );
  if (!registros || registros.length === 0) return false;
  const limite = Number(registros[0].invalidado_ate);
  const versaoAtual = Number(registros[0].versao_sessao) || 1;

  // 1. Tokens com claim de versão monotônica (sv):
  // Exige correspondência estrita (sv === versaoAtual).
  // Rejeita sv anterior (sv < versaoAtual) ou sv divergente/forjado (sv > versaoAtual).
  if (typeof sv === "number") {
    return sv !== versaoAtual;
  }

  // 2. Política para tokens legados sem sv:
  // O limite é em segundos. Depois de qualquer bump de versão, um token emitido
  // exatamente no segundo da invalidação não pode ser tratado como novo.
  if (emitidoEm === undefined) return true;
  if (emitidoEm < limite) return true;
  return emitidoEm === limite && versaoAtual > 1;
}


export async function consumirTokenUsoUnico(token: string, expiraEmSegundos?: number): Promise<boolean> {
  await garantirTabelas();
  const agora = Math.floor(Date.now() / 1000);
  const exp = expiraEmSegundos ?? agora + 15 * 60;
  if (exp <= agora) return false;

  const hash = hashToken(token);
  await prisma.$executeRawUnsafe(
    "DELETE FROM tokens_revogados WHERE expira_em <= $1",
    agora
  );
  const inseridos = await prisma.$queryRawUnsafe<{ token_hash: string }[]>(
    "INSERT INTO tokens_revogados (token_hash, expira_em) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING RETURNING token_hash",
    hash,
    exp
  );
  return Array.isArray(inseridos) && inseridos.length > 0;
}
