import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jestPlugin from "eslint-plugin-jest";

export default [
  // Ignore patterns
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "tests/test.db",
      "tests/test-report.xml",
      "data/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
      "no-undef": "off",
    },
  },

  // Test files
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "jest/expect-expect": "warn",
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/valid-expect": "error",
    },
  },
];
