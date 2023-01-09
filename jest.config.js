/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended/all"],
  modulePathIgnorePatterns: [".vscode-test", "dist", "test/ui"],
  moduleNameMapper: {
    // Help Jest resolve Sysl's subpath package exports.
    "@anz-bank/sysl/(.*)": "<rootDir>/node_modules/@anz-bank/sysl/dist/$1",
  },
};
