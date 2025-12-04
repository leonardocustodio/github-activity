/**
 * Main GitHub Activity service
 */

import { GitHubClient } from "./github-client";
import { Storage } from "./types";
import { Logger, ActivityData, FetchOptions } from "./types";

export class GitHubActivityTracker {
  private client: GitHubClient;
  private storage: Storage;
  private logger: Logger;
  private username: string;

  constructor(
    token: string,
    username: string,
    storage: Storage,
    logger: Logger,
  ) {
    this.client = new GitHubClient(token, username, logger);
    this.storage = storage;
    this.logger = logger;
    this.username = username;
  }

  /**
   * Fetch all activities (PRs, issues, reviews) and save to storage
   */
  async fetchAll(options: FetchOptions = {}): Promise<ActivityData> {
    this.logger.info("Starting full activity fetch");

    try {
      // Test connection first
      const isConnected = await this.client.testConnection();
      if (!isConnected) {
        throw new Error("Failed to authenticate with GitHub");
      }

      // Fetch all data types in parallel for better performance
      this.logger.info("Fetching all activities...");
      const [pullRequests, issues, reviews] = await Promise.all([
        this.client.fetchPullRequests(options),
        this.client.fetchIssues(options),
        this.client.fetchReviews(options),
      ]);

      const activityData: ActivityData = {
        pullRequests,
        issues,
        reviews,
        metadata: {
          lastUpdated: new Date().toISOString(),
          username: this.username,
          totalPullRequests: pullRequests.length,
          totalIssues: issues.length,
          totalReviews: reviews.length,
        },
      };

      // Save to storage
      await this.storage.save(activityData);
      this.logger.info("Successfully saved all activities to storage");

      return activityData;
    } catch (error) {
      this.logger.error("Failed to fetch activities:", error);
      throw error;
    }
  }

  /**
   * Fetch only pull requests
   */
  async fetchPullRequests(options: FetchOptions = {}): Promise<void> {
    this.logger.info("Fetching pull requests only");

    try {
      const pullRequests = await this.client.fetchPullRequests(options);
      await this.storage.append("pullRequests", pullRequests);
      this.logger.info(`Saved ${pullRequests.length} pull requests`);
    } catch (error) {
      this.logger.error("Failed to fetch pull requests:", error);
      throw error;
    }
  }

  /**
   * Fetch only issues
   */
  async fetchIssues(options: FetchOptions = {}): Promise<void> {
    this.logger.info("Fetching issues only");

    try {
      const issues = await this.client.fetchIssues(options);
      await this.storage.append("issues", issues);
      this.logger.info(`Saved ${issues.length} issues`);
    } catch (error) {
      this.logger.error("Failed to fetch issues:", error);
      throw error;
    }
  }

  /**
   * Fetch only reviews
   */
  async fetchReviews(options: FetchOptions = {}): Promise<void> {
    this.logger.info("Fetching reviews only");

    try {
      const reviews = await this.client.fetchReviews(options);
      await this.storage.append("reviews", reviews);
      this.logger.info(`Saved ${reviews.length} reviews`);
    } catch (error) {
      this.logger.error("Failed to fetch reviews:", error);
      throw error;
    }
  }

  /**
   * Load stored activity data
   */
  async loadActivities(): Promise<ActivityData | null> {
    try {
      return await this.storage.load();
    } catch (error) {
      this.logger.error("Failed to load activities:", error);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{
    totalPullRequests: number;
    openPullRequests: number;
    mergedPullRequests: number;
    totalIssues: number;
    openIssues: number;
    closedIssues: number;
    totalReviews: number;
    approvedReviews: number;
    changesRequestedReviews: number;
  } | null> {
    try {
      const data = await this.storage.load();
      if (!data) return null;

      return {
        totalPullRequests: data.pullRequests.length,
        openPullRequests: data.pullRequests.filter((pr) => pr.state === "open")
          .length,
        mergedPullRequests: data.pullRequests.filter((pr) => pr.mergedAt)
          .length,
        totalIssues: data.issues.length,
        openIssues: data.issues.filter((issue) => issue.state === "open")
          .length,
        closedIssues: data.issues.filter((issue) => issue.state === "closed")
          .length,
        totalReviews: data.reviews.length,
        approvedReviews: data.reviews.filter((r) => r.state === "APPROVED")
          .length,
        changesRequestedReviews: data.reviews.filter(
          (r) => r.state === "CHANGES_REQUESTED",
        ).length,
      };
    } catch (error) {
      this.logger.error("Failed to get summary:", error);
      throw error;
    }
  }
}
