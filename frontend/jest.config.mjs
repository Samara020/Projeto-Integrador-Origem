// Jest dos Testes Unitários (tests/unit). Ambiente jsdom: os services guardam carrinho,
// pedidos e peças no localStorage. Guia: node_modules/next/dist/docs/01-app/02-guides/testing/jest.md
import { existsSync, readFileSync } from "node:fs";
import nextJest from "next/jest.js";

// Cobertura de código: só é medida com --coverage (é assim que o comando central da raiz
// roda, npm run test:unit). O mínimo vem da política da TAS; abaixo dele o Jest falha.
const POLITICA = new URL("../.github/politica-testes.json", import.meta.url);
const minimoDeCobertura = existsSync(POLITICA) ? JSON.parse(readFileSync(POLITICA, "utf8")).coberturaMinimaDeCodigo?.frontend : undefined;

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  displayName: "unitário",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/unit/**/*.test.{ts,tsx}"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  coverageDirectory: "../relatorios/cobertura/frontend",
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  ...(minimoDeCobertura ? { coverageThreshold: { global: minimoDeCobertura } } : {}),
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "../relatorios",
        outputName: "unit-jest.xml",
        suiteNameTemplate: "{filename}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        // Suíte que nem carrega (erro de import) entra como <error>, não some do relatório.
        reportTestSuiteErrors: true,
      },
    ],
  ],
});
