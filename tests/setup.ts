/**
 * Global test setup file
 * This file runs before each test suite
 */

import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Set test environment
process.env.NODE_ENV = "test";

// Global test timeout
jest.setTimeout(30000);

// Custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidGitHubUrl(): R;
      toHaveValidTimestamp(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }

  namespace NodeJS {
    interface Global {
      testHelpers: typeof testHelpers;
    }
  }

  var testHelpers: {
    waitFor: (
      condition: () => Promise<boolean> | boolean,
      timeout?: number,
      interval?: number,
    ) => Promise<boolean>;
    delay: (ms: number) => Promise<void>;
    randomString: (length?: number) => string;
    mockGitHubResponse: <T = any>(
      data: T,
      status?: number,
    ) => {
      status: number;
      data: T;
      headers: {
        "x-ratelimit-remaining": string;
        "x-ratelimit-limit": string;
        "x-ratelimit-reset": number;
      };
    };
  };
}

// Extend Jest matchers
expect.extend({
  toBeValidGitHubUrl(received: string) {
    const githubUrlPattern =
      /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/(pull|issues)\/\d+$/;
    const pass = githubUrlPattern.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid GitHub URL`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid GitHub URL`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: string) {
    const date = new Date(received);
    const pass = date instanceof Date && !isNaN(date.getTime());

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;

    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test helpers
const testHelpers = {
  // Wait for a condition to be true
  waitFor: async (
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error("Condition not met within timeout");
  },

  // Create a delay
  delay: (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length: number = 10): string => {
    return Math.random()
      .toString(36)
      .substring(2, length + 2);
  },

  // Mock GitHub API response
  mockGitHubResponse: <T = any>(data: T, status: number = 200) => {
    return {
      status,
      data,
      headers: {
        "x-ratelimit-remaining": "4999",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-reset": Math.floor(Date.now() / 1000) + 3600,
      },
    };
  },
};

// Make test helpers globally available
global.testHelpers = testHelpers;

// Cleanup after all tests
afterAll(() => {
  // Perform any global cleanup here
});
