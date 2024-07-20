export default {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['!test/*', '!**/dist/**/*', '!test/**/*'],
  coverageReporters: ['json-summary', 'text']
}
