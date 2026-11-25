import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "jest";

// Cobertura de código: só é medida com --coverage (é assim que o comando central da raiz
// roda, npm run test:backend). O mínimo vem da política da TAS; abaixo dele o Jest falha.
// O Jest roda de backend/app (scripts do package.json); a política fica na raiz do repositório.
const POLITICA = join(process.cwd(), "..", "..", ".github", "politica-testes.json");
const minimoDeCobertura = existsSync(POLITICA) ? JSON.parse(readFileSync(POLITICA, "utf8")).coberturaMinimaDeCodigo?.backend : undefined;

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 30000,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "../../relatorios/cobertura/backend",
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  ...(minimoDeCobertura ? { coverageThreshold: { global: minimoDeCobertura } } : {}),
  // Mesmo formato do frontend: o resumo de scripts/testes.mjs lê relatorios/backend-jest.xml.
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "../../relatorios",
        outputName: "backend-jest.xml",
        suiteNameTemplate: "{filename}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        // Suíte que nem carrega (erro de import) entra como <error>, não some do relatório.
        reportTestSuiteErrors: true,
      },
    ],
  ],
};

export default config;
