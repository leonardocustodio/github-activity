/**
 * Data storage layer for GitHub Activity
 */

import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";
import { ActivityData, Storage, PullRequest, Issue, Review } from "./types";

/**
 * JSON-based storage implementation
 */
export class JsonStorage implements Storage {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async save(data: ActivityData): Promise<void> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, jsonData, "utf8");
    } catch (error) {
      throw new Error(`Failed to save data to ${this.filePath}: ${error}`);
    }
  }

  async load(): Promise<ActivityData | null> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }

      const jsonData = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(jsonData) as ActivityData;
    } catch (error) {
      throw new Error(`Failed to load data from ${this.filePath}: ${error}`);
    }
  }

  async append(
    type: "pullRequests" | "issues" | "reviews",
    items: (PullRequest | Issue | Review)[],
  ): Promise<void> {
    try {
      const existingData = await this.load();

      if (!existingData) {
        // If no existing data, create new structure
        const newData: ActivityData = {
          pullRequests: [],
          issues: [],
          reviews: [],
          metadata: {
            lastUpdated: new Date().toISOString(),
            username: "",
            totalPullRequests: 0,
            totalIssues: 0,
            totalReviews: 0,
          },
        };
        if (type === "pullRequests") {
          newData[type] = items as PullRequest[];
        } else if (type === "issues") {
          newData[type] = items as Issue[];
        } else if (type === "reviews") {
          newData[type] = items as Review[];
        }

        // Update metadata counts based on type
        if (type === "pullRequests") {
          newData.metadata.totalPullRequests = items.length;
        } else if (type === "issues") {
          newData.metadata.totalIssues = items.length;
        } else if (type === "reviews") {
          newData.metadata.totalReviews = items.length;
        }

        await this.save(newData);
        return;
      }

      // Merge new items with existing ones, avoiding duplicates
      const existingItems = existingData[type];
      const existingIds = new Set(
        existingItems.map((item: PullRequest | Issue | Review) => item.id),
      );
      const newItems = items.filter((item) => !existingIds.has(item.id));

      if (type === "pullRequests") {
        existingData[type] = [...existingItems, ...newItems] as PullRequest[];
      } else if (type === "issues") {
        existingData[type] = [...existingItems, ...newItems] as Issue[];
      } else if (type === "reviews") {
        existingData[type] = [...existingItems, ...newItems] as Review[];
      }
      existingData.metadata.lastUpdated = new Date().toISOString();

      // Update metadata counts based on type
      if (type === "pullRequests") {
        existingData.metadata.totalPullRequests = existingData[type].length;
      } else if (type === "issues") {
        existingData.metadata.totalIssues = existingData[type].length;
      } else if (type === "reviews") {
        existingData.metadata.totalReviews = existingData[type].length;
      }

      await this.save(existingData);
    } catch (error) {
      throw new Error(`Failed to append ${type}: ${error}`);
    }
  }
}

/**
 * SQLite-based storage implementation
 */
export class SqliteStorage implements Storage {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.ensureDirectory();
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private initialize(): void {
    try {
      // Read and execute the schema SQL file from data directory
      const schemaPath = path.join(__dirname, "..", "data", "DATA_SCHEMA.sql");

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }

      const schema = fs.readFileSync(schemaPath, "utf8");

      // Execute schema in a transaction for atomicity
      this.db.exec(schema);
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  async save(data: ActivityData): Promise<void> {
    const transaction = this.db.transaction(() => {
      try {
        // Clear existing data
        this.db.prepare("DELETE FROM pull_requests").run();
        this.db.prepare("DELETE FROM issues").run();
        this.db.prepare("DELETE FROM reviews").run();

        // Insert pull requests
        const insertPR = this.db.prepare(`
          INSERT OR REPLACE INTO pull_requests (
            github_id, pr_number, title, url, state,
            repo_owner, repo_name, author,
            created_at, updated_at, closed_at, merged_at,
            draft, additions, deletions, changed_files,
            labels, assignees, metadata
          ) VALUES (
            @github_id, @pr_number, @title, @url, @state,
            @repo_owner, @repo_name, @author,
            @created_at, @updated_at, @closed_at, @merged_at,
            @draft, @additions, @deletions, @changed_files,
            @labels, @assignees, @metadata
          )
        `);

        for (const pr of data.pullRequests) {
          insertPR.run({
            github_id: pr.id,
            pr_number: pr.number,
            title: pr.title,
            url: pr.htmlUrl,
            state: pr.mergedAt ? "merged" : pr.state,
            repo_owner: pr.repository.owner,
            repo_name: pr.repository.name,
            author: pr.author,
            created_at: pr.createdAt,
            updated_at: pr.updatedAt,
            closed_at: pr.closedAt || null,
            merged_at: pr.mergedAt || null,
            draft: pr.draft ? 1 : 0,
            additions: pr.additions,
            deletions: pr.deletions,
            changed_files: pr.changedFiles,
            labels: JSON.stringify(pr.labels),
            assignees: JSON.stringify(pr.assignees),
            metadata: JSON.stringify({
              htmlUrl: pr.htmlUrl,
              url: pr.url,
              reviewers: pr.reviewers,
              commits: pr.commits,
              private: pr.repository.private,
              fullName: pr.repository.fullName,
              repoUrl: pr.repository.url,
            }),
          });
        }

        // Insert issues
        const insertIssue = this.db.prepare(`
          INSERT OR REPLACE INTO issues (
            github_id, issue_number, title, url, state,
            repo_owner, repo_name, author,
            created_at, updated_at, closed_at,
            comments_count, labels, assignees, metadata
          ) VALUES (
            @github_id, @issue_number, @title, @url, @state,
            @repo_owner, @repo_name, @author,
            @created_at, @updated_at, @closed_at,
            @comments_count, @labels, @assignees, @metadata
          )
        `);

        for (const issue of data.issues) {
          insertIssue.run({
            github_id: issue.id,
            issue_number: issue.number,
            title: issue.title,
            url: issue.htmlUrl,
            state: issue.state,
            repo_owner: issue.repository.owner,
            repo_name: issue.repository.name,
            author: issue.author,
            created_at: issue.createdAt,
            updated_at: issue.updatedAt,
            closed_at: issue.closedAt || null,
            comments_count: issue.comments,
            labels: JSON.stringify(issue.labels),
            assignees: JSON.stringify(issue.assignees),
            metadata: JSON.stringify({
              htmlUrl: issue.htmlUrl,
              url: issue.url,
              body: issue.body,
              private: issue.repository.private,
              fullName: issue.repository.fullName,
              repoUrl: issue.repository.url,
            }),
          });
        }

        // Insert reviews
        const insertReview = this.db.prepare(`
          INSERT OR REPLACE INTO reviews (
            github_id, pr_id, reviewer, state, body,
            submitted_at, metadata
          ) VALUES (
            @github_id, @pr_id, @reviewer, @state, @body,
            @submitted_at, @metadata
          )
        `);

        for (const review of data.reviews) {
          // Find the pr_id from pull_requests table
          const prRow = this.db
            .prepare("SELECT id FROM pull_requests WHERE github_id = ? LIMIT 1")
            .get(review.id) as { id: number } | undefined;

          if (prRow) {
            insertReview.run({
              github_id: review.id,
              pr_id: prRow.id,
              reviewer: review.author,
              state: review.state,
              body: review.body || null,
              submitted_at: review.submittedAt,
              metadata: JSON.stringify({
                pullRequestNumber: review.pullRequestNumber,
                pullRequestTitle: review.pullRequestTitle,
                pullRequestUrl: review.pullRequestUrl,
                htmlUrl: review.htmlUrl,
                repository: review.repository,
              }),
            });
          }
        }
      } catch (error) {
        throw new Error(`Failed to save data: ${error}`);
      }
    });

    transaction();
  }

  async load(): Promise<ActivityData | null> {
    try {
      // Check if tables have any data
      const prCount = this.db
        .prepare("SELECT COUNT(*) as count FROM pull_requests")
        .get() as { count: number };
      const issueCount = this.db
        .prepare("SELECT COUNT(*) as count FROM issues")
        .get() as { count: number };
      const reviewCount = this.db
        .prepare("SELECT COUNT(*) as count FROM reviews")
        .get() as { count: number };

      if (
        prCount.count === 0 &&
        issueCount.count === 0 &&
        reviewCount.count === 0
      ) {
        return null;
      }

      // Load pull requests
      const prRows = this.db
        .prepare(
          `
        SELECT * FROM pull_requests ORDER BY created_at DESC
      `,
        )
        .all();

      const pullRequests: PullRequest[] = (
        prRows as Record<string, unknown>[]
      ).map((row) => {
        const metadata = JSON.parse((row.metadata as string) || "{}");
        return {
          id: row.github_id as number,
          number: row.pr_number as number,
          title: row.title as string,
          url: metadata.url || (row.url as string),
          htmlUrl: metadata.htmlUrl || (row.url as string),
          state: (row.state === "merged" ? "closed" : row.state) as
            | "open"
            | "closed",
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          closedAt: (row.closed_at as string) || undefined,
          mergedAt: (row.merged_at as string) || undefined,
          repository: {
            name: row.repo_name as string,
            fullName: metadata.fullName || `${row.repo_owner}/${row.repo_name}`,
            owner: row.repo_owner as string,
            url:
              metadata.repoUrl ||
              `https://github.com/${row.repo_owner}/${row.repo_name}`,
            private: metadata.private || false,
          },
          author: row.author as string,
          draft: row.draft === 1,
          labels: JSON.parse((row.labels as string) || "[]"),
          assignees: JSON.parse((row.assignees as string) || "[]"),
          reviewers: metadata.reviewers || [],
          commits: metadata.commits || 0,
          additions: row.additions as number,
          deletions: row.deletions as number,
          changedFiles: row.changed_files as number,
        };
      });

      // Load issues
      const issueRows = this.db
        .prepare(
          `
        SELECT * FROM issues ORDER BY created_at DESC
      `,
        )
        .all();

      const issues: Issue[] = (issueRows as Record<string, unknown>[]).map(
        (row) => {
          const metadata = JSON.parse((row.metadata as string) || "{}");
          return {
            id: row.github_id as number,
            number: row.issue_number as number,
            title: row.title as string,
            url: metadata.url || (row.url as string),
            htmlUrl: metadata.htmlUrl || (row.url as string),
            state: row.state as "open" | "closed",
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
            closedAt: (row.closed_at as string) || undefined,
            repository: {
              name: row.repo_name as string,
              fullName:
                metadata.fullName || `${row.repo_owner}/${row.repo_name}`,
              owner: row.repo_owner as string,
              url:
                metadata.repoUrl ||
                `https://github.com/${row.repo_owner}/${row.repo_name}`,
              private: metadata.private || false,
            },
            author: row.author as string,
            labels: JSON.parse((row.labels as string) || "[]"),
            assignees: JSON.parse((row.assignees as string) || "[]"),
            comments: row.comments_count as number,
            body: metadata.body,
          };
        },
      );

      // Load reviews
      const reviewRows = this.db
        .prepare(
          `
        SELECT * FROM reviews ORDER BY submitted_at DESC
      `,
        )
        .all();

      const reviews: Review[] = (reviewRows as Record<string, unknown>[]).map(
        (row) => {
          const metadata = JSON.parse((row.metadata as string) || "{}");
          return {
            id: row.github_id as number,
            pullRequestNumber: metadata.pullRequestNumber,
            pullRequestTitle: metadata.pullRequestTitle,
            pullRequestUrl: metadata.pullRequestUrl,
            state: row.state as Review["state"],
            submittedAt: row.submitted_at as string,
            repository: metadata.repository || {
              name: "",
              fullName: "",
              owner: "",
              url: "",
              private: false,
            },
            author: row.reviewer as string,
            body: (row.body as string) || undefined,
            htmlUrl: metadata.htmlUrl,
          };
        },
      );

      // Determine username from data
      let username = "";
      if (pullRequests.length > 0) {
        username = pullRequests[0].author;
      } else if (issues.length > 0) {
        username = issues[0].author;
      } else if (reviews.length > 0) {
        username = reviews[0].author;
      }

      return {
        pullRequests,
        issues,
        reviews,
        metadata: {
          lastUpdated: new Date().toISOString(),
          username,
          totalPullRequests: pullRequests.length,
          totalIssues: issues.length,
          totalReviews: reviews.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to load data from database: ${error}`);
    }
  }

  async append(
    type: "pullRequests" | "issues" | "reviews",
    items: (PullRequest | Issue | Review)[],
  ): Promise<void> {
    const transaction = this.db.transaction(() => {
      try {
        if (type === "pullRequests") {
          const insertPR = this.db.prepare(`
            INSERT OR REPLACE INTO pull_requests (
              github_id, pr_number, title, url, state,
              repo_owner, repo_name, author,
              created_at, updated_at, closed_at, merged_at,
              draft, additions, deletions, changed_files,
              labels, assignees, metadata
            ) VALUES (
              @github_id, @pr_number, @title, @url, @state,
              @repo_owner, @repo_name, @author,
              @created_at, @updated_at, @closed_at, @merged_at,
              @draft, @additions, @deletions, @changed_files,
              @labels, @assignees, @metadata
            )
          `);

          for (const pr of items as PullRequest[]) {
            insertPR.run({
              github_id: pr.id,
              pr_number: pr.number,
              title: pr.title,
              url: pr.htmlUrl,
              state: pr.mergedAt ? "merged" : pr.state,
              repo_owner: pr.repository.owner,
              repo_name: pr.repository.name,
              author: pr.author,
              created_at: pr.createdAt,
              updated_at: pr.updatedAt,
              closed_at: pr.closedAt || null,
              merged_at: pr.mergedAt || null,
              draft: pr.draft ? 1 : 0,
              additions: pr.additions,
              deletions: pr.deletions,
              changed_files: pr.changedFiles,
              labels: JSON.stringify(pr.labels),
              assignees: JSON.stringify(pr.assignees),
              metadata: JSON.stringify({
                htmlUrl: pr.htmlUrl,
                url: pr.url,
                reviewers: pr.reviewers,
                commits: pr.commits,
                private: pr.repository.private,
                fullName: pr.repository.fullName,
                repoUrl: pr.repository.url,
              }),
            });
          }
        } else if (type === "issues") {
          const insertIssue = this.db.prepare(`
            INSERT OR REPLACE INTO issues (
              github_id, issue_number, title, url, state,
              repo_owner, repo_name, author,
              created_at, updated_at, closed_at,
              comments_count, labels, assignees, metadata
            ) VALUES (
              @github_id, @issue_number, @title, @url, @state,
              @repo_owner, @repo_name, @author,
              @created_at, @updated_at, @closed_at,
              @comments_count, @labels, @assignees, @metadata
            )
          `);

          for (const issue of items as Issue[]) {
            insertIssue.run({
              github_id: issue.id,
              issue_number: issue.number,
              title: issue.title,
              url: issue.htmlUrl,
              state: issue.state,
              repo_owner: issue.repository.owner,
              repo_name: issue.repository.name,
              author: issue.author,
              created_at: issue.createdAt,
              updated_at: issue.updatedAt,
              closed_at: issue.closedAt || null,
              comments_count: issue.comments,
              labels: JSON.stringify(issue.labels),
              assignees: JSON.stringify(issue.assignees),
              metadata: JSON.stringify({
                htmlUrl: issue.htmlUrl,
                url: issue.url,
                body: issue.body,
                private: issue.repository.private,
                fullName: issue.repository.fullName,
                repoUrl: issue.repository.url,
              }),
            });
          }
        } else if (type === "reviews") {
          const insertReview = this.db.prepare(`
            INSERT OR REPLACE INTO reviews (
              github_id, pr_id, reviewer, state, body,
              submitted_at, metadata
            ) VALUES (
              @github_id, @pr_id, @reviewer, @state, @body,
              @submitted_at, @metadata
            )
          `);

          for (const review of items as Review[]) {
            // Find the pr_id from pull_requests table using PR number and repo info
            const prRow = this.db
              .prepare(
                `
              SELECT id FROM pull_requests
              WHERE pr_number = ?
              AND repo_owner = ?
              AND repo_name = ?
              LIMIT 1
            `,
              )
              .get(
                review.pullRequestNumber,
                review.repository.owner,
                review.repository.name,
              ) as { id: number } | undefined;

            if (prRow) {
              insertReview.run({
                github_id: review.id,
                pr_id: prRow.id,
                reviewer: review.author,
                state: review.state,
                body: review.body || null,
                submitted_at: review.submittedAt,
                metadata: JSON.stringify({
                  pullRequestNumber: review.pullRequestNumber,
                  pullRequestTitle: review.pullRequestTitle,
                  pullRequestUrl: review.pullRequestUrl,
                  htmlUrl: review.htmlUrl,
                  repository: review.repository,
                }),
              });
            }
          }
        }
      } catch (error) {
        throw new Error(`Failed to append ${type}: ${error}`);
      }
    });

    transaction();
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

/**
 * Factory function to create appropriate storage instance
 */
export const createStorage = (
  storageType: "json" | "sqlite",
  storagePath: string,
): Storage => {
  switch (storageType) {
    case "json":
      return new JsonStorage(storagePath);
    case "sqlite":
      return new SqliteStorage(storagePath);
    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }
};
