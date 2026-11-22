import { sign, verify, type JwtPayload } from "jsonwebtoken";
import { ErroApp } from "../middleware/error";

const SEGREDO = process.env.JWT_SECRET;
if (!SEGREDO) {
  throw new Error("JWT_SECRET nao definido no .env");
}

const PAPEIS_VALIDOS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];

export const gerarToken = (payload: { id: string; email?: string; papel: string; sv?: number }): string =>
  sign(
    payload,
    Buffer.from(SEGREDO),
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" } as Parameters<typeof sign>[2]
  );

export const verificarToken = (token: string) => {
  const decodido = verify(token, Buffer.from(SEGREDO));
  if (
    !decodido ||
    typeof decodido !== "object" ||
    typeof (decodido as JwtPayload).id !== "string" ||
    !(decodido as JwtPayload).id.trim() ||
    typeof (decodido as JwtPayload).papel !== "string" ||
    !PAPEIS_VALIDOS.includes((decodido as JwtPayload).papel)
  ) {
    throw new ErroApp(401, "Token de autenticação inválido.");
  }

  const payload = decodido as JwtPayload & {
    id: string;
    email?: string;
    papel: string;
    sv?: number;
  };

  return {
    ...payload,
    iat: typeof payload.iat === "number" ? payload.iat : undefined,
    sv: typeof payload.sv === "number" ? payload.sv : undefined,
  };
};