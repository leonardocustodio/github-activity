/**
 * Unit tests for ConfigManager
 */

import { ConfigManager } from "../../src/config";

describe("ConfigManager", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validate", () => {
    it("should return valid for proper configuration", () => {
      process.env.GITHUB_TOKEN = "test_token";
      process.env.GITHUB_USERNAME = "testuser";

      const configManager = new ConfigManager();
      const validation = configManager.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should return errors for missing GitHub token", () => {
      process.env.GITHUB_TOKEN = "";
      process.env.GITHUB_USERNAME = "testuser";

      expect(() => {
        new ConfigManager();
      }).toThrow("GITHUB_TOKEN is required");
    });

    it("should return errors for missing username", () => {
      process.env.GITHUB_TOKEN = "test_token";
      process.env.GITHUB_USERNAME = "";

      expect(() => {
        new ConfigManager();
      }).toThrow("GITHUB_USERNAME is required");
    });

    it("should return errors for invalid storage type", () => {
      process.env.GITHUB_TOKEN = "test_token";
      process.env.GITHUB_USERNAME = "testuser";
      process.env.STORAGE_TYPE = "invalid";

      const configManager = new ConfigManager();
      const validation = configManager.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Storage type must be either "json" or "sqlite"',
      );
    });
  });

  describe("getConfig", () => {
    it("should return configuration object", () => {
      process.env.GITHUB_TOKEN = "test_token";
      process.env.GITHUB_USERNAME = "testuser";

      const configManager = new ConfigManager();
      const config = configManager.getConfig();

      expect(config.githubToken).toBe("test_token");
      expect(config.githubUsername).toBe("testuser");
      expect(config.storageType).toBe("json");
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      process.env.GITHUB_TOKEN = "test_token";
      process.env.GITHUB_USERNAME = "testuser";

      const configManager = new ConfigManager();
      configManager.updateConfig({ logLevel: "debug" });

      const config = configManager.getConfig();
      expect(config.logLevel).toBe("debug");
    });
  });
});
