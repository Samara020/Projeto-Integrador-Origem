import prisma from "../src/lib/prisma";
import { limparBanco } from "./helpers";

afterAll(async () => {
  try {
    await limparBanco();
  } finally {
    await prisma.$disconnect();
  }
});
