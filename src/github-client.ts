/**
 * GitHub API client for fetching user activities
 */

import { Octokit } from "@octokit/rest";
import { PullRequest, Issue, Review, FetchOptions, Logger } from "./types";

// GitHub API response types
interface GitHubLabel {
  name?: string;
  [key: string]: unknown;
}

interface GitHubUser {
  login?: string;
  [key: string]: unknown;
}

interface GitHubSearchItem {
  id: number;
  number: number;
  title: string;
  url: string;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  repository_url: string;
  user?: GitHubUser | null;
  labels: (GitHubLabel | string)[];
  assignees?: GitHubUser[] | null;
  comments?: number;
  body?: string | null;
  [key: string]: unknown;
}

export class GitHubClient {
  private octokit: Octokit;
  private username: string;
  private logger: Logger;

  constructor(token: string, username: string, logger: Logger) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.username = username;
    this.logger = logger;
  }

  /**
   * Helper method to paginate through search results using date-based pagination
   * This allows fetching beyond GitHub's 1000 result limit per query
   */
  private async *paginateSearch(
    baseQuery: string,
    sortField: "created" | "updated" = "created",
  ): AsyncGenerator<GitHubSearchItem[], void, unknown> {
    let currentDate = new Date();
    const oldestDate = new Date("2008-01-01"); // GitHub founded in 2008
    let hasMore = true;

    while (hasMore) {
      const dateFilter = `${sortField}:<${currentDate.toISOString().split("T")[0]}`;
      const searchQuery = `${baseQuery} ${dateFilter}`;
      let page = 1;
      const maxPages = 10;
      let batchResults: GitHubSearchItem[] = [];

      this.logger.debug(`Searching with query: ${searchQuery}`);

      while (page <= maxPages) {
        try {
          const response = await this.octokit.search.issuesAndPullRequests({
            q: searchQuery,
            sort: sortField,
            order: "desc",
            per_page: 100,
            page,
          });

          if (response.data.items.length === 0) {
            hasMore = false;
            break;
          }

          if (response.data.incomplete_results) {
            this.logger.warn("Search results are incomplete (hit API limit)");
            break;
          }

          batchResults.push(...response.data.items);

          // Track oldest date for next iteration
          for (const item of response.data.items) {
            const itemDate = new Date(
              item[sortField === "created" ? "created_at" : "updated_at"],
            );
            if (itemDate < currentDate) {
              currentDate = itemDate;
            }
          }

          if (response.data.items.length < 100) {
            hasMore = false;
            break;
          }

          page++;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            (error as { status: number }).status === 422
          ) {
            this.logger.warn(
              `Hit GitHub Search API limit. Moving to next date range.`,
            );
            currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          }
          throw error;
        }
      }

      if (batchResults.length > 0) {
        yield batchResults;
      }

      if (currentDate <= oldestDate || batchResults.length === 0) {
        hasMore = false;
      }

      if (hasMore) {
        currentDate = new Date(currentDate.getTime() - 1000);
      }
    }
  }

  /**
   * Fetch all pull requests created by the user
   */
  async fetchPullRequests(_options: FetchOptions = {}): Promise<PullRequest[]> {
    this.logger.info(`Fetching pull requests for user: ${this.username}`);
    const pullRequests: PullRequest[] = [];

    try {
      const baseQuery = `author:${this.username} type:pr`;

      for await (const batch of this.paginateSearch(baseQuery, "created")) {
        this.logger.info(`Processing batch of ${batch.length} PRs`);

        for (const item of batch) {
          const [owner, repo] = item.repository_url.split("/").slice(-2);

          try {
            const prDetail = await this.octokit.pulls.get({
              owner,
              repo,
              pull_number: item.number,
            });

            const pr: PullRequest = {
              id: prDetail.data.id,
              number: prDetail.data.number,
              title: prDetail.data.title,
              url: prDetail.data.url,
              htmlUrl: prDetail.data.html_url,
              state: prDetail.data.state as "open" | "closed",
              createdAt: prDetail.data.created_at,
              updatedAt: prDetail.data.updated_at,
              closedAt: prDetail.data.closed_at || undefined,
              mergedAt: prDetail.data.merged_at || undefined,
              repository: {
                name: repo,
                fullName: `${owner}/${repo}`,
                owner,
                url: `https://github.com/${owner}/${repo}`,
                private: item.repository_url.includes("private") || false,
              },
              author: prDetail.data.user?.login || this.username,
              draft: prDetail.data.draft || false,
              labels: prDetail.data.labels.map((label: GitHubLabel | string) =>
                typeof label === "string" ? label : label.name || "",
              ),
              assignees:
                prDetail.data.assignees
                  ?.map((a) => a.login || "")
                  .filter(Boolean) || [],
              reviewers:
                prDetail.data.requested_reviewers
                  ?.map((r) => r.login || "")
                  .filter(Boolean) || [],
              commits: prDetail.data.commits || 0,
              additions: prDetail.data.additions || 0,
              deletions: prDetail.data.deletions || 0,
              changedFiles: prDetail.data.changed_files || 0,
            };

            pullRequests.push(pr);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to fetch PR details for ${owner}/${repo}#${item.number}: ${message}`,
            );
          }
        }
      }

      this.logger.info(`Fetched ${pullRequests.length} pull requests`);
      return pullRequests;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to fetch pull requests:", error);
      throw new Error(`Failed to fetch pull requests: ${message}`);
    }
  }

  /**
   * Fetch all issues created by the user
   */
  async fetchIssues(_options: FetchOptions = {}): Promise<Issue[]> {
    this.logger.info(`Fetching issues for user: ${this.username}`);
    const issues: Issue[] = [];

    try {
      const baseQuery = `author:${this.username} type:issue`;

      for await (const batch of this.paginateSearch(baseQuery, "created")) {
        this.logger.info(`Processing batch of ${batch.length} issues`);

        for (const item of batch) {
          const [owner, repo] = item.repository_url.split("/").slice(-2);

          const issue: Issue = {
            id: item.id,
            number: item.number,
            title: item.title,
            url: item.url,
            htmlUrl: item.html_url,
            state: item.state as "open" | "closed",
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            closedAt: item.closed_at || undefined,
            repository: {
              name: repo,
              fullName: `${owner}/${repo}`,
              owner,
              url: `https://github.com/${owner}/${repo}`,
              private: item.repository_url.includes("private") || false,
            },
            author: item.user?.login || this.username,
            labels: item.labels.map((label: GitHubLabel | string) =>
              typeof label === "string" ? label : label.name || "",
            ),
            assignees: item.assignees?.map((a) => a.login || "") || [],
            comments: item.comments || 0,
            body: item.body || undefined,
          };

          issues.push(issue);
        }
      }

      this.logger.info(`Fetched ${issues.length} issues`);
      return issues;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to fetch issues:", error);
      throw new Error(`Failed to fetch issues: ${message}`);
    }
  }

  /**
   * Fetch all reviews submitted by the user
   */
  async fetchReviews(_options: FetchOptions = {}): Promise<Review[]> {
    this.logger.info(`Fetching reviews for user: ${this.username}`);
    const reviews: Review[] = [];

    try {
      const baseQuery = `reviewed-by:${this.username} type:pr`;

      for await (const batch of this.paginateSearch(baseQuery, "updated")) {
        this.logger.info(
          `Processing batch of ${batch.length} PRs with reviews`,
        );

        for (const item of batch) {
          const [owner, repo] = item.repository_url.split("/").slice(-2);

          try {
            // Get reviews for this PR
            const reviewsResponse = await this.octokit.pulls.listReviews({
              owner,
              repo,
              pull_number: item.number,
            });

            // Filter reviews by the current user
            const userReviews = reviewsResponse.data.filter(
              (review) => review.user?.login === this.username,
            );

            for (const reviewData of userReviews) {
              const review: Review = {
                id: reviewData.id,
                pullRequestNumber: item.number,
                pullRequestTitle: item.title,
                pullRequestUrl: item.html_url,
                state: reviewData.state as Review["state"],
                submittedAt:
                  reviewData.submitted_at || new Date().toISOString(),
                repository: {
                  name: repo,
                  fullName: `${owner}/${repo}`,
                  owner,
                  url: `https://github.com/${owner}/${repo}`,
                  private: item.repository_url.includes("private") || false,
                },
                author: this.username,
                body: reviewData.body || undefined,
                htmlUrl: reviewData.html_url,
              };

              reviews.push(review);
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Failed to fetch reviews for ${owner}/${repo}#${item.number}: ${message}`,
            );
          }
        }
      }

      this.logger.info(`Fetched ${reviews.length} reviews`);
      return reviews;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to fetch reviews:", error);
      throw new Error(`Failed to fetch reviews: ${message}`);
    }
  }

  /**
   * Test API connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.octokit.users.getAuthenticated();
      this.logger.info(`Successfully authenticated as: ${response.data.login}`);
      return true;
    } catch (error) {
      this.logger.error("Authentication failed:", error);
      return false;
    }
  }
}
