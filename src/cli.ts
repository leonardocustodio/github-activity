#!/usr/bin/env node

/**
 * CLI interface for GitHub Activity
 */

import { Command } from "commander";
import { ConfigManager, CliOptions } from "./config";
import { createLogger } from "./logger";
import { createStorage } from "./storage";
import { GitHubActivityTracker } from "./tracker";

const program = new Command();

program
  .name("github-activity")
  .usage("[command] [options]")
  .description(
    "Track all your GitHub PRs, issues, and reviews across repositories",
  )
  .version("1.0.0");

// Helper function to get CLI options from command options
interface CommandOptions {
  token?: string;
  user?: string;
  format?: string;
  path?: string;
  output?: string;
  log?: string;
  maxPages?: string;
  type?: string;
  limit?: string;
}

function getCliOptions(options: CommandOptions): CliOptions {
  return {
    token: options.token,
    user: options.user,
    format: options.format as "json" | "sqlite",
    path: options.path,
    output: options.output,
    log: options.log as "debug" | "info" | "warn" | "error",
  };
}

program
  .command("fetch")
  .description("Fetch all activities (PRs, issues, reviews)")
  .option("-t, --token <token>", "GitHub Personal Access Token")
  .option("-u, --user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .option(
    "-m, --max-pages <number>",
    "Maximum number of pages to fetch per type",
    "10",
  )
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      const validation = configManager.validate();

      if (!validation.valid) {
        console.error("Configuration errors:");
        validation.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }

      configManager.ensureDirectories();

      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      console.log(
        `Fetching activities for GitHub user: ${config.githubUsername}...`,
      );

      const data = await tracker.fetchAll({
        maxPages: parseInt(options.maxPages, 10),
      });

      console.log("\nFetch completed successfully!");
      console.log(`Pull Requests: ${data.metadata.totalPullRequests}`);
      console.log(`Issues: ${data.metadata.totalIssues}`);
      console.log(`Reviews: ${data.metadata.totalReviews}`);
      console.log(`\nData saved to: ${config.storagePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program
  .command("fetch-prs")
  .description("Fetch only pull requests")
  .option("-t, --token <token>", "GitHub Personal Access Token")
  .option("-u, --user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .option("-m, --max-pages <number>", "Maximum number of pages to fetch", "10")
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      configManager.ensureDirectories();

      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      console.log("Fetching pull requests...");
      await tracker.fetchPullRequests({
        maxPages: parseInt(options.maxPages, 10),
      });
      console.log("Pull requests fetched successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program
  .command("fetch-issues")
  .description("Fetch only issues")
  .option("-t, --token <token>", "GitHub Personal Access Token")
  .option("-u, --user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .option("-m, --max-pages <number>", "Maximum number of pages to fetch", "10")
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      configManager.ensureDirectories();

      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      console.log("Fetching issues...");
      await tracker.fetchIssues({ maxPages: parseInt(options.maxPages, 10) });
      console.log("Issues fetched successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program
  .command("fetch-reviews")
  .description("Fetch only code reviews")
  .option("-t, --token <token>", "GitHub Personal Access Token")
  .option("-u, --user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .option("-m, --max-pages <number>", "Maximum number of pages to fetch", "10")
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      configManager.ensureDirectories();

      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      console.log("Fetching reviews...");
      await tracker.fetchReviews({ maxPages: parseInt(options.maxPages, 10) });
      console.log("Reviews fetched successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program
  .command("summary")
  .description("Show summary statistics of stored activities")
  .option("-t, --token <token>", "GitHub Personal Access Token")
  .option("-u, --user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      const summary = await tracker.getSummary();

      if (!summary) {
        console.log('No data found. Run "github-tracker fetch" first.');
        return;
      }

      console.log("\n=== GitHub Activity Summary ===\n");
      console.log("Pull Requests:");
      console.log(`  Total: ${summary.totalPullRequests}`);
      console.log(`  Open: ${summary.openPullRequests}`);
      console.log(`  Merged: ${summary.mergedPullRequests}`);
      console.log("\nIssues:");
      console.log(`  Total: ${summary.totalIssues}`);
      console.log(`  Open: ${summary.openIssues}`);
      console.log(`  Closed: ${summary.closedIssues}`);
      console.log("\nReviews:");
      console.log(`  Total: ${summary.totalReviews}`);
      console.log(`  Approved: ${summary.approvedReviews}`);
      console.log(`  Changes Requested: ${summary.changesRequestedReviews}`);
      console.log("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List stored activities")
  .option("-t, --type <type>", "Activity type: prs, issues, or reviews", "all")
  .option("--limit <number>", "Maximum number of items to display", "10")
  .option("--token <token>", "GitHub Personal Access Token")
  .option("--user <username>", "GitHub username")
  .option("-f, --format <format>", "Storage format: json or sqlite", "json")
  .option("-p, --path <path>", "Path to storage directory")
  .option("-o, --output <filename>", "Storage filename")
  .option("-l, --log <level>", "Log level: debug, info, warn, error", "info")
  .action(async (options) => {
    try {
      const cliOptions = getCliOptions(options);
      const configManager = new ConfigManager(cliOptions);
      const config = configManager.getConfig();
      const logger = createLogger(config.logLevel);
      const storage = createStorage(config.storageType, config.storagePath);
      const tracker = new GitHubActivityTracker(
        config.githubToken,
        config.githubUsername,
        storage,
        logger,
      );

      const data = await tracker.loadActivities();

      if (!data) {
        console.log('No data found. Run "github-tracker fetch" first.');
        return;
      }

      const limit = parseInt(options.limit, 10);

      if (options.type === "all" || options.type === "prs") {
        console.log("\n=== Pull Requests ===\n");
        data.pullRequests.slice(0, limit).forEach((pr) => {
          console.log(`#${pr.number} - ${pr.title}`);
          console.log(`  Repository: ${pr.repository.fullName}`);
          console.log(`  State: ${pr.state}${pr.mergedAt ? " (merged)" : ""}`);
          console.log(`  URL: ${pr.htmlUrl}`);
          console.log("");
        });
      }

      if (options.type === "all" || options.type === "issues") {
        console.log("\n=== Issues ===\n");
        data.issues.slice(0, limit).forEach((issue) => {
          console.log(`#${issue.number} - ${issue.title}`);
          console.log(`  Repository: ${issue.repository.fullName}`);
          console.log(`  State: ${issue.state}`);
          console.log(`  URL: ${issue.htmlUrl}`);
          console.log("");
        });
      }

      if (options.type === "all" || options.type === "reviews") {
        console.log("\n=== Reviews ===\n");
        data.reviews.slice(0, limit).forEach((review) => {
          console.log(
            `Review on PR #${review.pullRequestNumber} - ${review.pullRequestTitle}`,
          );
          console.log(`  Repository: ${review.repository.fullName}`);
          console.log(`  State: ${review.state}`);
          console.log(`  URL: ${review.htmlUrl}`);
          console.log("");
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error:", message);
      process.exit(1);
    }
  });

program.parse(process.argv);
