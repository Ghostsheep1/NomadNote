/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Stub out ESM-only packages for tests
    "^nanoid$": "<rootDir>/__mocks__/nanoid.js",
    "^nanoid/(.*)$": "<rootDir>/__mocks__/nanoid.js",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/out", "<rootDir>/node_modules"],
  watchPathIgnorePatterns: ["<rootDir>/.next", "<rootDir>/out", "<rootDir>/node_modules"],
};
