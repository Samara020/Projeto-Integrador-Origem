// Jest dos Testes de API (tests/api). Ambiente node: os testes fazem fetch de verdade
// contra o backend real + Postgres (porta 4000 ou API_BASE_URL / BACKEND_URL).
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  displayName: "api",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/api/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/tests/api/setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  maxWorkers: 1,
  testTimeout: 15000,
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "../relatorios",
        outputName: "api-jest.xml",
        suiteNameTemplate: "{filename}",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        // Suíte que nem carrega (erro de import) entra como <error>, não some do relatório.
        reportTestSuiteErrors: true,
      },
    ],
  ],
});
