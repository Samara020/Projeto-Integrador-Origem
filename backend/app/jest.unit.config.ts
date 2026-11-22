import type { Config } from "jest";

// Configuração dedicada aos testes unitários puros do backend (sem dependência de PostgreSQL).
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.unit.test.ts", "**/aed-*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 15000,
};

export default config;
