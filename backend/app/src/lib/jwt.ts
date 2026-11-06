import { sign, verify, type JwtPayload } from "jsonwebtoken";

const SEGREDO = process.env.JWT_SECRET;
if (!SEGREDO) {
  throw new Error("JWT_SECRET nao definido no .env");
}

export const gerarToken = (payload: { id: string; email: string; papel: string }): string =>
  sign(
    payload,
    Buffer.from(SEGREDO),
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" } as Parameters<typeof sign>[2]
  );

export const verificarToken = (token: string) => {
  return verify(token, Buffer.from(SEGREDO)) as JwtPayload & {
    id: string;
    email: string;
    papel: string;
  };
};
