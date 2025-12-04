/**
 * Type definitions for GitHub Activity
 */

export interface Config {
  githubToken: string;
  githubUsername: string;
  storageType: "json" | "sqlite";
  storagePath: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  url: string;
  htmlUrl: string;
  state: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
  repository: {
    name: string;
    fullName: string;
    owner: string;
    url: string;
    private: boolean;
  };
  author: string;
  draft: boolean;
  labels: string[];
  assignees: string[];
  reviewers: string[];
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  url: string;
  htmlUrl: string;
  state: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  repository: {
    name: string;
    fullName: string;
    owner: string;
    url: string;
    private: boolean;
  };
  author: string;
  labels: string[];
  assignees: string[];
  comments: number;
  body?: string;
}

export interface Review {
  id: number;
  pullRequestNumber: number;
  pullRequestTitle: string;
  pullRequestUrl: string;
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
  submittedAt: string;
  repository: {
    name: string;
    fullName: string;
    owner: string;
    url: string;
    private: boolean;
  };
  author: string;
  body?: string;
  htmlUrl: string;
}

export interface ActivityData {
  pullRequests: PullRequest[];
  issues: Issue[];
  reviews: Review[];
  metadata: {
    lastUpdated: string;
    username: string;
    totalPullRequests: number;
    totalIssues: number;
    totalReviews: number;
  };
}

export interface FetchOptions {
  since?: Date;
  state?: "open" | "closed" | "all";
  includePrivate?: boolean;
  maxPages?: number;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface Storage {
  save(data: ActivityData): Promise<void>;
  load(): Promise<ActivityData | null>;
  append(
    type: "pullRequests" | "issues" | "reviews",
    items: (PullRequest | Issue | Review)[],
  ): Promise<void>;
}
