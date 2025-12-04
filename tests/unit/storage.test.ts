/**
 * Unit tests for Storage implementations
 */

import { JsonStorage, createStorage } from "../../src/storage";
import { ActivityData } from "../../src/types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Note: This test file tests the JsonStorage implementation
// SqliteStorage is conditionally imported only when better-sqlite3 is available
let SqliteStorage: any;
try {
  SqliteStorage = require("../../src/storage").SqliteStorage;
} catch (error) {
  // SqliteStorage not available (better-sqlite3 not installed)
  SqliteStorage = null;
}

describe("JsonStorage", () => {
  let storage: JsonStorage;
  let testDir: string;
  let testFile: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `github-watcher-test-${Date.now()}`);
    testFile = path.join(testDir, "test-activities.json");

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    storage = new JsonStorage(testFile);
  });

  afterEach(() => {
    // Cleanup test files
    try {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Initialization", () => {
    it("should initialize with file path", () => {
      expect(storage).toBeDefined();
    });

    it("should create directory if not exists", () => {
      const nestedPath = path.join(testDir, "nested", "path", "data.json");
      const nestedStorage = new JsonStorage(nestedPath);

      expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);
    });
  });

  describe("save()", () => {
    const mockData: ActivityData = {
      pullRequests: [
        {
          id: 1,
          number: 100,
          title: "Test PR 1",
          url: "https://api.github.com/repos/owner/repo/pulls/100",
          htmlUrl: "https://github.com/owner/repo/pull/100",
          state: "open",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          repository: {
            name: "repo",
            fullName: "owner/repo",
            owner: "owner",
            url: "https://github.com/owner/repo",
            private: false,
          },
          author: "testuser",
          draft: false,
          labels: ["bug"],
          assignees: [],
          reviewers: [],
          commits: 1,
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        },
      ],
      issues: [],
      reviews: [],
      metadata: {
        lastUpdated: "2025-01-01T00:00:00Z",
        username: "testuser",
        totalPullRequests: 1,
        totalIssues: 0,
        totalReviews: 0,
      },
    };

    it("should save data to JSON file", async () => {
      await storage.save(mockData);

      expect(fs.existsSync(testFile)).toBe(true);

      const content = fs.readFileSync(testFile, "utf8");
      const savedData = JSON.parse(content);

      expect(savedData.pullRequests).toHaveLength(1);
      expect(savedData.pullRequests[0].title).toBe("Test PR 1");
    });

    it("should overwrite existing data", async () => {
      await storage.save(mockData);

      const newData: ActivityData = {
        ...mockData,
        pullRequests: [
          {
            ...mockData.pullRequests[0],
            id: 2,
            title: "New PR",
          },
        ],
      };

      await storage.save(newData);

      const loaded = await storage.load();
      expect(loaded?.pullRequests).toHaveLength(1);
      expect(loaded?.pullRequests[0].title).toBe("New PR");
    });

    it("should pretty print JSON", async () => {
      await storage.save(mockData);

      const content = fs.readFileSync(testFile, "utf8");
      expect(content).toContain("\n"); // Should be formatted
      expect(content).toContain("  "); // Should have indentation
    });

    it("should handle write errors gracefully", async () => {
      const invalidPath = "/invalid/path/that/does/not/exist/data.json";

      expect(() => {
        new JsonStorage(invalidPath);
      }).toThrow();
    });
  });

  describe("load()", () => {
    it("should return null when file does not exist", async () => {
      const result = await storage.load();
      expect(result).toBeNull();
    });

    it("should load data from JSON file", async () => {
      const mockData: ActivityData = {
        pullRequests: [
          {
            id: 1,
            number: 100,
            title: "Test PR",
            url: "https://api.github.com/repos/owner/repo/pulls/100",
            htmlUrl: "https://github.com/owner/repo/pull/100",
            state: "open",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            repository: {
              name: "repo",
              fullName: "owner/repo",
              owner: "owner",
              url: "https://github.com/owner/repo",
              private: false,
            },
            author: "testuser",
            draft: false,
            labels: [],
            assignees: [],
            reviewers: [],
            commits: 1,
            additions: 10,
            deletions: 5,
            changedFiles: 2,
          },
        ],
        issues: [],
        reviews: [],
        metadata: {
          lastUpdated: "2025-01-01T00:00:00Z",
          username: "testuser",
          totalPullRequests: 1,
          totalIssues: 0,
          totalReviews: 0,
        },
      };

      await storage.save(mockData);
      const loaded = await storage.load();

      expect(loaded).not.toBeNull();
      expect(loaded?.pullRequests).toHaveLength(1);
      expect(loaded?.pullRequests[0].title).toBe("Test PR");
    });

    it("should handle corrupted JSON file", async () => {
      fs.writeFileSync(testFile, "{ invalid json }", "utf8");

      await expect(storage.load()).rejects.toThrow();
    });
  });

  describe("append()", () => {
    const baseMockData: ActivityData = {
      pullRequests: [
        {
          id: 1,
          number: 100,
          title: "Existing PR",
          url: "https://api.github.com/repos/owner/repo/pulls/100",
          htmlUrl: "https://github.com/owner/repo/pull/100",
          state: "open",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          repository: {
            name: "repo",
            fullName: "owner/repo",
            owner: "owner",
            url: "https://github.com/owner/repo",
            private: false,
          },
          author: "testuser",
          draft: false,
          labels: [],
          assignees: [],
          reviewers: [],
          commits: 1,
          additions: 10,
          deletions: 5,
          changedFiles: 2,
        },
      ],
      issues: [],
      reviews: [],
      metadata: {
        lastUpdated: "2025-01-01T00:00:00Z",
        username: "testuser",
        totalPullRequests: 1,
        totalIssues: 0,
        totalReviews: 0,
      },
    };

    it("should append new items without duplicates", async () => {
      await storage.save(baseMockData);

      const newPR = {
        ...baseMockData.pullRequests[0],
        id: 2,
        number: 101,
        title: "New PR",
      };

      await storage.append("pullRequests", [newPR]);

      const loaded = await storage.load();
      expect(loaded?.pullRequests).toHaveLength(2);
    });

    it("should not create duplicates", async () => {
      await storage.save(baseMockData);

      // Try to append same PR again
      await storage.append("pullRequests", [baseMockData.pullRequests[0]]);

      const loaded = await storage.load();
      expect(loaded?.pullRequests).toHaveLength(1);
    });

    it("should update metadata counts", async () => {
      await storage.save(baseMockData);

      const newPR = {
        ...baseMockData.pullRequests[0],
        id: 2,
        title: "New PR",
      };

      await storage.append("pullRequests", [newPR]);

      const loaded = await storage.load();
      expect(loaded?.metadata.totalPullRequests).toBe(2);
    });

    it("should create initial structure if no data exists", async () => {
      const newPR = {
        ...baseMockData.pullRequests[0],
        id: 1,
        title: "First PR",
      };

      await storage.append("pullRequests", [newPR]);

      const loaded = await storage.load();
      expect(loaded).not.toBeNull();
      expect(loaded?.pullRequests).toHaveLength(1);
    });

    it("should handle appending issues", async () => {
      await storage.save(baseMockData);

      const newIssue = {
        id: 10,
        number: 1,
        title: "Test Issue",
        url: "https://api.github.com/repos/owner/repo/issues/1",
        htmlUrl: "https://github.com/owner/repo/issues/1",
        state: "open" as const,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        repository: {
          name: "repo",
          fullName: "owner/repo",
          owner: "owner",
          url: "https://github.com/owner/repo",
          private: false,
        },
        author: "testuser",
        labels: [],
        assignees: [],
        comments: 0,
      };

      await storage.append("issues", [newIssue]);

      const loaded = await storage.load();
      expect(loaded?.issues).toHaveLength(1);
      expect(loaded?.metadata.totalIssues).toBe(1);
    });

    it("should handle appending reviews", async () => {
      await storage.save(baseMockData);

      const newReview = {
        id: 100,
        pullRequestNumber: 100,
        pullRequestTitle: "Existing PR",
        pullRequestUrl: "https://api.github.com/repos/owner/repo/pulls/100",
        state: "APPROVED" as const,
        submittedAt: "2025-01-01T00:00:00Z",
        repository: {
          name: "repo",
          fullName: "owner/repo",
          owner: "owner",
          url: "https://github.com/owner/repo",
          private: false,
        },
        author: "reviewer",
        htmlUrl: "https://github.com/owner/repo/pull/100#review-100",
      };

      await storage.append("reviews", [newReview]);

      const loaded = await storage.load();
      expect(loaded?.reviews).toHaveLength(1);
      expect(loaded?.metadata.totalReviews).toBe(1);
    });
  });
});

describe("createStorage factory", () => {
  it("should create JsonStorage when type is json", () => {
    const storage = createStorage("json", "./test.json");
    expect(storage).toBeInstanceOf(JsonStorage);
  });

  (SqliteStorage ? it : it.skip)(
    "should create SqliteStorage when type is sqlite",
    () => {
      const storage = createStorage("sqlite", "./tests/test.db");
      expect(storage).toBeInstanceOf(SqliteStorage);
    },
  );

  it("should throw error for unsupported storage type", () => {
    expect(() => {
      createStorage("invalid" as any, "./test.dat");
    }).toThrow("Unsupported storage type");
  });
});
