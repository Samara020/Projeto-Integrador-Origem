import { execSync } from "child_process";
import prisma from "../src/lib/prisma";

beforeAll(async () => {
  // Garante que o schema esteja aplicado no banco de teste
  try {
    execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL },
    });
  } catch {
    // Se já estiver aplicado, ignora
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
