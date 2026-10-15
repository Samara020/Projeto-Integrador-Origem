// Jest dos Testes Unitários (tests/unit). Ambiente jsdom: os services guardam carrinho,
// pedidos e peças no localStorage. Guia: node_modules/next/dist/docs/01-app/02-guides/testing/jest.md
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  displayName: "unitário",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
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
