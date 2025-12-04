# GitHub Activity

A powerful CLI tool to track and report on all your GitHub activity including pull requests, issues, and code reviews across all repositories (both public and private).

## Quick Start

#### 1. Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token" (classic)
3. Select the following scopes:
    - `repo` - Full control of private repositories (includes read access to pull requests, issues, and reviews)
    - `read:org` - Read organization membership (optional, for organization repos)
4. Generate the token and copy it

#### 2. Run the Tool

```bash
# Run directly with npx
npx github-activity fetch --token YOUR_GITHUB_TOKEN --user YOUR_USERNAME

# Or install globally
npm install -g github-activity
github-activity fetch --token YOUR_GITHUB_TOKEN --user YOUR_USERNAME
```

## Features

- Fetch all pull requests created by you across all accessible repositories
- Track issues you've created in any repository
- Monitor code reviews you've submitted
- No repository-level configuration needed - works at the user level
- Supports both public and private repositories with proper authentication
- SQLite or JSON-based storage for easy querying and portability

## CLI Commands

| Command | Description | Options |
|---------|-------------|---------|
| `fetch` | Fetch all activities | `--max-pages <number>` |
| `fetch-prs` | Fetch only pull requests | `--max-pages <number>` |
| `fetch-issues` | Fetch only issues | `--max-pages <number>` |
| `fetch-reviews` | Fetch only code reviews | `--max-pages <number>` |
| `summary` | Show activity statistics | None |
| `list` | List stored activities | `--type <prs\|issues\|reviews\|all>`, `--limit <number>` |

## CLI Arguments

Pass configuration directly via command-line flags:

**Available Options:**
- `-t, --token <token>` - GitHub Personal Access Token (required)
- `-u, --user <username>` - GitHub username (required)
- `-f, --format <format>` - Storage format: `json` or `sqlite` (default: `json`)
- `-p, --path <path>` - Path to storage directory (default: `./data`)
- `-o, --output <filename>` - Storage filename (default: `activities.json` or `activities.db`)
- `-l, --log <level>` - Log level: `debug`, `info`, `warn`, `error` (default: `info`)

## Data Structure

Activities are stored in a JSON file with the following structure:

```json
{
  "pullRequests": [
    {
      "id": 123456,
      "number": 42,
      "title": "Add new feature",
      "url": "https://api.github.com/repos/owner/repo/pulls/42",
      "htmlUrl": "https://github.com/owner/repo/pull/42",
      "state": "merged",
      "repository": {
        "name": "repo",
        "fullName": "owner/repo",
        "owner": "owner",
        "url": "https://github.com/owner/repo",
        "private": false
      },
      "author": "username",
      "createdAt": "2025-09-01T10:00:00Z",
      "mergedAt": "2025-09-05T14:30:00Z"
    }
  ],
  "issues": [...],
  "reviews": [...],
  "metadata": {
    "lastUpdated": "2025-09-29T12:00:00Z",
    "username": "username",
    "totalPullRequests": 45,
    "totalIssues": 23,
    "totalReviews": 127
  }
}
```

## How It Works

### 1. Authentication

The tool uses GitHub Personal Access Tokens for authentication, which provides:
- Access to both public and private repositories
- Higher rate limits (5,000 requests/hour)
- Ability to access organization repositories

### 2. Data Fetching

The tool uses GitHub's Search API to fetch activities:

- **Pull Requests**: `GET /search/issues?q=author:USERNAME type:pr`
- **Issues**: `GET /search/issues?q=author:USERNAME type:issue`
- **Reviews**: `GET /search/issues?q=reviewed-by:USERNAME type:pr` + individual PR review endpoints

### 3. Pagination

The GitHub API returns results in pages (max 100 items per page). The tool automatically:
- Handles pagination to fetch all results
- Respects rate limits and implements backoff
- Allows configuring max pages to fetch

### 4. Storage

Activities are stored in a JSON file with:
- Deduplication by GitHub ID
- Metadata tracking (last sync time, counts)
- Easy querying and filtering

## Rate Limits

GitHub API rate limits:
- **Authenticated requests**: 5,000 requests/hour
- **Search API**: 30 requests/minute

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[MIT](./LICENSE)

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Roadmap

Future enhancements:
- Web dashboard for visualization
- Date range filtering
- Export to CSV/PDF
