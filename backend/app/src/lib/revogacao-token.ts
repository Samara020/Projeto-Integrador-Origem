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
      invalidado_ate BIGINT NOT NULL
    )
  `);
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

export async function invalidarSessoesUsuario(usuarioId: string): Promise<void> {
  await garantirTabelas();
  const agora = Math.floor(Date.now() / 1000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO sessoes_invalidadas_usuario (usuario_id, invalidado_ate)
     VALUES ($1, $2)
     ON CONFLICT (usuario_id) DO UPDATE SET invalidado_ate = EXCLUDED.invalidado_ate`,
    String(usuarioId),
    agora
  );
}

export async function sessaoUsuarioInvalidada(usuarioId: string, emitidoEm?: number): Promise<boolean> {
  await garantirTabelas();
  const registros = await prisma.$queryRawUnsafe<{ invalidado_ate: bigint | number }[]>(
    `SELECT invalidado_ate FROM sessoes_invalidadas_usuario WHERE usuario_id = $1 LIMIT 1`,
    String(usuarioId)
  );
  if (!registros || registros.length === 0) return false;
  const limite = Number(registros[0].invalidado_ate);
  if (emitidoEm === undefined) return true;
  return emitidoEm < limite;
}