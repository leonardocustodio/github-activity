-- GitHub Activity Database Schema
-- Version: 1.0.0
-- Database: SQLite 3.x

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Auto-vacuum to prevent database bloat
PRAGMA auto_vacuum = INCREMENTAL;

-- ============================================================================
-- TABLE: pull_requests
-- Purpose: Store pull request metadata from GitHub
-- ============================================================================
CREATE TABLE IF NOT EXISTS pull_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_number INTEGER NOT NULL,
    github_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('open', 'closed', 'merged', 'draft')),
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    merged_at TIMESTAMP,
    draft BOOLEAN DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    review_comments_count INTEGER DEFAULT 0,
    head_ref TEXT,
    base_ref TEXT,
    labels TEXT,  -- JSON array: ["bug", "enhancement"]
    assignees TEXT,  -- JSON array: ["user1", "user2"]
    metadata TEXT,  -- JSON object for extensibility
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_owner, repo_name, pr_number)
);

-- Indexes for pull_requests
CREATE INDEX IF NOT EXISTS idx_pr_state ON pull_requests(state);
CREATE INDEX IF NOT EXISTS idx_pr_created ON pull_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_updated ON pull_requests(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_merged ON pull_requests(merged_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_repo ON pull_requests(repo_owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_pr_author ON pull_requests(author);
CREATE INDEX IF NOT EXISTS idx_pr_github_id ON pull_requests(github_id);
CREATE INDEX IF NOT EXISTS idx_pr_repo_state ON pull_requests(repo_owner, repo_name, state);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_pr_repo_created_state
    ON pull_requests(repo_owner, repo_name, created_at DESC, state);

-- ============================================================================
-- TABLE: issues
-- Purpose: Store issue metadata from GitHub
-- ============================================================================
CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_number INTEGER NOT NULL,
    github_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('open', 'closed')),
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    comments_count INTEGER DEFAULT 0,
    labels TEXT,  -- JSON array
    assignees TEXT,  -- JSON array
    milestone TEXT,
    metadata TEXT,  -- JSON object
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_owner, repo_name, issue_number)
);

-- Indexes for issues
CREATE INDEX IF NOT EXISTS idx_issue_state ON issues(state);
CREATE INDEX IF NOT EXISTS idx_issue_created ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_updated ON issues(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_closed ON issues(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_repo ON issues(repo_owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_issue_author ON issues(author);
CREATE INDEX IF NOT EXISTS idx_issue_github_id ON issues(github_id);
CREATE INDEX IF NOT EXISTS idx_issue_repo_state ON issues(repo_owner, repo_name, state);

-- ============================================================================
-- TABLE: reviews
-- Purpose: Store pull request review data
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER UNIQUE NOT NULL,
    pr_id INTEGER NOT NULL,
    reviewer TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING')),
    body TEXT,
    submitted_at TIMESTAMP NOT NULL,
    commit_sha TEXT,
    metadata TEXT,  -- JSON object
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_review_pr ON reviews(pr_id);
CREATE INDEX IF NOT EXISTS idx_review_reviewer ON reviews(reviewer);
CREATE INDEX IF NOT EXISTS idx_review_state ON reviews(state);
CREATE INDEX IF NOT EXISTS idx_review_submitted ON reviews(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_pr_reviewer ON reviews(pr_id, reviewer);
CREATE INDEX IF NOT EXISTS idx_review_github_id ON reviews(github_id);

-- ============================================================================
-- TABLE: repositories
-- Purpose: Track watched repositories
-- ============================================================================
CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    is_private BOOLEAN DEFAULT 0,
    default_branch TEXT DEFAULT 'main',
    watched BOOLEAN DEFAULT 1,
    last_synced TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,  -- JSON object: stars, forks, language, etc.
    UNIQUE(owner, name)
);

-- Indexes for repositories
CREATE INDEX IF NOT EXISTS idx_repo_watched ON repositories(watched);
CREATE INDEX IF NOT EXISTS idx_repo_last_synced ON repositories(last_synced);
CREATE INDEX IF NOT EXISTS idx_repo_full_name ON repositories(full_name);

-- ============================================================================
-- TABLE: sync_history
-- Purpose: Track synchronization operations for monitoring and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_owner TEXT,
    repo_name TEXT,
    sync_type TEXT NOT NULL CHECK(sync_type IN ('full', 'incremental', 'pr', 'issue', 'review')),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'partial')),
    items_fetched INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT  -- JSON object: rate_limit_remaining, api_calls, etc.
);

-- Indexes for sync_history
CREATE INDEX IF NOT EXISTS idx_sync_repo ON sync_history(repo_owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_sync_started ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_type ON sync_history(sync_type);

-- ============================================================================
-- TABLE: review_comments
-- Purpose: Store individual review comments (optional, for detailed tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER UNIQUE NOT NULL,
    review_id INTEGER NOT NULL,
    pr_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    path TEXT,  -- File path
    position INTEGER,  -- Line number
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    metadata TEXT,  -- JSON object
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

-- Indexes for review_comments
CREATE INDEX IF NOT EXISTS idx_review_comment_review ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_pr ON review_comments(pr_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_author ON review_comments(author);
CREATE INDEX IF NOT EXISTS idx_review_comment_created ON review_comments(created_at DESC);

-- ============================================================================
-- TABLE: commits (optional, for tracking PR commits)
-- Purpose: Store commit metadata for pull requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sha TEXT UNIQUE NOT NULL,
    pr_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    message TEXT NOT NULL,
    committed_at TIMESTAMP NOT NULL,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    metadata TEXT,  -- JSON object
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pr_id) REFERENCES pull_requests(id) ON DELETE CASCADE
);

-- Indexes for commits
CREATE INDEX IF NOT EXISTS idx_commit_pr ON commits(pr_id);
CREATE INDEX IF NOT EXISTS idx_commit_author ON commits(author);
CREATE INDEX IF NOT EXISTS idx_commit_date ON commits(committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commit_sha ON commits(sha);

-- ============================================================================
-- TABLE: cache_metadata
-- Purpose: Track cache entries for HTTP responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS cache_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    size_bytes INTEGER DEFAULT 0,
    metadata TEXT  -- JSON object
);

-- Indexes for cache_metadata
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_metadata(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_endpoint ON cache_metadata(endpoint);

-- ============================================================================
-- VIEWS: Convenient queries for common reports
-- ============================================================================

-- View: Active pull requests with review status
CREATE VIEW IF NOT EXISTS v_active_prs AS
SELECT
    p.id,
    p.pr_number,
    p.title,
    p.repo_owner || '/' || p.repo_name AS repository,
    p.author,
    p.created_at,
    p.updated_at,
    p.state,
    COUNT(DISTINCT r.id) AS review_count,
    SUM(CASE WHEN r.state = 'APPROVED' THEN 1 ELSE 0 END) AS approvals,
    SUM(CASE WHEN r.state = 'CHANGES_REQUESTED' THEN 1 ELSE 0 END) AS change_requests,
    p.url
FROM pull_requests p
LEFT JOIN reviews r ON p.id = r.pr_id
WHERE p.state IN ('open', 'draft')
GROUP BY p.id
ORDER BY p.created_at DESC;

-- View: User activity summary
CREATE VIEW IF NOT EXISTS v_user_activity AS
SELECT
    author AS username,
    COUNT(*) AS total_prs,
    SUM(CASE WHEN state = 'merged' THEN 1 ELSE 0 END) AS merged_prs,
    SUM(CASE WHEN state = 'open' THEN 1 ELSE 0 END) AS open_prs,
    SUM(CASE WHEN state = 'closed' AND merged_at IS NULL THEN 1 ELSE 0 END) AS closed_prs,
    SUM(additions) AS total_additions,
    SUM(deletions) AS total_deletions,
    MIN(created_at) AS first_pr,
    MAX(created_at) AS latest_pr
FROM pull_requests
GROUP BY author
ORDER BY total_prs DESC;

-- View: Repository statistics
CREATE VIEW IF NOT EXISTS v_repo_stats AS
SELECT
    r.owner,
    r.name,
    r.full_name,
    r.watched,
    r.last_synced,
    COUNT(DISTINCT p.id) AS pr_count,
    COUNT(DISTINCT i.id) AS issue_count,
    COUNT(DISTINCT rv.id) AS review_count,
    SUM(CASE WHEN p.state = 'open' THEN 1 ELSE 0 END) AS open_prs,
    SUM(CASE WHEN i.state = 'open' THEN 1 ELSE 0 END) AS open_issues
FROM repositories r
LEFT JOIN pull_requests p ON r.owner = p.repo_owner AND r.name = p.repo_name
LEFT JOIN issues i ON r.owner = i.repo_owner AND r.name = i.repo_name
LEFT JOIN reviews rv ON p.id = rv.pr_id
GROUP BY r.id
ORDER BY pr_count DESC;

-- View: Recent sync operations
CREATE VIEW IF NOT EXISTS v_recent_syncs AS
SELECT
    repo_owner || '/' || repo_name AS repository,
    sync_type,
    status,
    started_at,
    completed_at,
    (julianday(completed_at) - julianday(started_at)) * 86400 AS duration_seconds,
    items_fetched,
    items_created,
    items_updated,
    error_message
FROM sync_history
WHERE started_at >= datetime('now', '-7 days')
ORDER BY started_at DESC;

-- View: PR review turnaround time
CREATE VIEW IF NOT EXISTS v_review_turnaround AS
SELECT
    p.repo_owner || '/' || p.repo_name AS repository,
    p.pr_number,
    p.title,
    p.author,
    p.created_at AS pr_created,
    MIN(r.submitted_at) AS first_review,
    (julianday(MIN(r.submitted_at)) - julianday(p.created_at)) * 24 AS hours_to_first_review,
    p.merged_at,
    (julianday(p.merged_at) - julianday(p.created_at)) * 24 AS hours_to_merge
FROM pull_requests p
LEFT JOIN reviews r ON p.id = r.pr_id
WHERE p.state = 'merged'
GROUP BY p.id
HAVING first_review IS NOT NULL
ORDER BY hours_to_first_review;

-- ============================================================================
-- TRIGGERS: Maintain data integrity and automation
-- ============================================================================

-- Trigger: Update repositories.updated_at on modification
CREATE TRIGGER IF NOT EXISTS tr_repositories_updated_at
AFTER UPDATE ON repositories
FOR EACH ROW
BEGIN
    UPDATE repositories
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Cascade delete PR reviews when PR is deleted
-- (Already handled by FOREIGN KEY ON DELETE CASCADE, but explicit for clarity)

-- Trigger: Update cache hit count on access
CREATE TRIGGER IF NOT EXISTS tr_cache_hit_count
AFTER UPDATE OF last_accessed ON cache_metadata
FOR EACH ROW
BEGIN
    UPDATE cache_metadata
    SET hit_count = hit_count + 1
    WHERE id = NEW.id;
END;

-- ============================================================================
-- INITIAL DATA: Sample configuration (optional)
-- ============================================================================

-- Example: Pre-populate with popular repositories (commented out)
-- INSERT OR IGNORE INTO repositories (owner, name, full_name, url, watched) VALUES
-- ('facebook', 'react', 'facebook/react', 'https://github.com/facebook/react', 1),
-- ('microsoft', 'vscode', 'microsoft/vscode', 'https://github.com/microsoft/vscode', 1),
-- ('vercel', 'next.js', 'vercel/next.js', 'https://github.com/vercel/next.js', 1);

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Cleanup expired cache entries
-- DELETE FROM cache_metadata WHERE expires_at < datetime('now');

-- Vacuum database to reclaim space
-- VACUUM;

-- Analyze tables for query optimization
-- ANALYZE;

-- Check database integrity
-- PRAGMA integrity_check;

-- Get database statistics
-- SELECT
--     (SELECT COUNT(*) FROM pull_requests) AS pr_count,
--     (SELECT COUNT(*) FROM issues) AS issue_count,
--     (SELECT COUNT(*) FROM reviews) AS review_count,
--     (SELECT COUNT(*) FROM repositories) AS repo_count,
--     (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) AS db_size_bytes;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
