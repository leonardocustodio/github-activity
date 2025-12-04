/**
 * CLI Integration Tests
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

interface CLIResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

describe("CLI Integration Tests", () => {
  let testStorageDir: string;
  let cliPath: string;

  beforeAll(async () => {
    testStorageDir = path.join(
      os.tmpdir(),
      `gh-watcher-cli-test-${Date.now()}`,
    );
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
    cliPath = path.join(__dirname, "../../dist/cli.js");
  });

  afterAll(async () => {
    try {
      if (fs.existsSync(testStorageDir)) {
        fs.rmSync(testStorageDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  /**
   * Helper function to run CLI command
   */
  const runCLI = (
    args: string[],
    options: Record<string, any> = {},
  ): Promise<CLIResult> => {
    return new Promise((resolve, reject) => {
      const proc: ChildProcess = spawn("node", [cliPath, ...args], {
        env: {
          ...process.env,
          GH_WATCHER_STORAGE: testStorageDir,
          ...options.env,
        },
        cwd: options.cwd || process.cwd(),
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      proc.on("error", (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error("CLI command timeout"));
      }, 30000);
    });
  };

  describe("Help Command", () => {
    it("should display help with --help flag", async () => {
      const result = await runCLI(["--help"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    it("should display help with -h flag", async () => {
      const result = await runCLI(["-h"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });
  });

  describe("Version Command", () => {
    it("should display version with --version flag", async () => {
      const result = await runCLI(["--version"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it("should display version with -V flag", async () => {
      const result = await runCLI(["-V"]);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("Configuration", () => {
    it("should handle missing GitHub token", async () => {
      const result = await runCLI(["sync"], {
        env: { GITHUB_TOKEN: "" },
      });

      expect(result.code).not.toBe(0);
      expect(result.stderr.toLowerCase()).toContain("token");
    });

    it("should handle missing username", async () => {
      const result = await runCLI(["sync"], {
        env: {
          GITHUB_TOKEN: "test_token",
          GITHUB_USERNAME: "",
        },
      });

      expect(result.code).not.toBe(0);
      expect(result.stderr.toLowerCase()).toContain("username");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid command", async () => {
      const result = await runCLI(["invalid-command"]);

      expect(result.code).not.toBe(0);
      expect(result.stderr || result.stdout).toContain("invalid");
    });

    it("should handle invalid options", async () => {
      const result = await runCLI(["sync", "--invalid-option"]);

      expect(result.code).not.toBe(0);
    });
  });
});
