module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/*.d.ts'],
  coverageDirectory: '../coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text-summary', 'lcov'],
  testEnvironment: 'node',
};
