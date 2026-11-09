import type { Config } from "jest";

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
  reporters: ["default", ["jest-junit", {
    outputDirectory: "../../relatorios",
    outputName: "api-backend.xml",
    reportTestSuiteErrors: true,
  }]],
};

export default config;
