/**
 * Configuration management for GitHub Activity
 */

import * as path from "path";
import * as fs from "fs";
import { Config } from "./types";

export interface CliOptions {
  token?: string;
  user?: string;
  format?: "json" | "sqlite";
  path?: string;
  output?: string;
  log?: "debug" | "info" | "warn" | "error";
}

export class ConfigManager {
  private config: Config;

  constructor(cliOptions?: CliOptions) {
    this.config = this.loadConfig(cliOptions);
  }

  /**
   * Build storage path from CLI options
   */
  private buildStoragePath(
    cliOptions?: CliOptions,
    format: "json" | "sqlite" = "json",
  ): string {
    const extension = format === "json" ? ".json" : ".db";
    const defaultFilename = `activities${extension}`;

    // Build from path and output options
    const directory = cliOptions?.path || path.join(process.cwd(), "data");
    const filename = cliOptions?.output
      ? cliOptions.output.includes(".")
        ? cliOptions.output
        : `${cliOptions.output}${extension}`
      : defaultFilename;

    return path.join(directory, filename);
  }

  /**
   * Load configuration from CLI options
   */
  private loadConfig(cliOptions?: CliOptions): Config {
    const githubToken = cliOptions?.token;
    const githubUsername = cliOptions?.user;

    if (!githubToken) {
      throw new Error(
        "GITHUB_TOKEN is required. Provide it via --token <token> flag.\n\n" +
          "Create a token at: https://github.com/settings/tokens\n" +
          "Required scopes: repo, user, read:org",
      );
    }

    if (!githubUsername) {
      throw new Error(
        "GITHUB_USERNAME is required. Provide it via --user <username> flag.",
      );
    }

    // Build storage path from format, path, and file options
    const storageFormat = cliOptions?.format || "json";
    const storagePath = this.buildStoragePath(cliOptions, storageFormat);

    return {
      githubToken,
      githubUsername,
      storageType: storageFormat,
      storagePath,
      logLevel: cliOptions?.log || "info",
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.githubToken || this.config.githubToken.trim() === "") {
      errors.push("GitHub token is missing or empty");
    }

    if (
      !this.config.githubUsername ||
      this.config.githubUsername.trim() === ""
    ) {
      errors.push("GitHub username is missing or empty");
    }

    if (!["json", "sqlite"].includes(this.config.storageType)) {
      errors.push('Storage type must be either "json" or "sqlite"');
    }

    if (!["debug", "info", "warn", "error"].includes(this.config.logLevel)) {
      errors.push("Log level must be one of: debug, info, warn, error");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories(): void {
    const dir = path.dirname(this.config.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
