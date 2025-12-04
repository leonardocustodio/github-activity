module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.spec.tsx'
  ],
  collectCoverage: false,
  moduleDirectories: ['node_modules', 'src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testResultsProcessor: 'jest-sonar-reporter',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!@octokit)'
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
