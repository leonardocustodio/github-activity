/**
 * Mock for @octokit/rest to avoid ES module import issues in Jest
 */

export class Octokit {
  constructor(_options?: any) {}

  rest = {
    pulls: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      get: jest.fn().mockResolvedValue({ data: {} }),
      listReviews: jest.fn().mockResolvedValue({ data: [] }),
    },
    issues: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      get: jest.fn().mockResolvedValue({ data: {} }),
    },
    search: {
      issuesAndPullRequests: jest
        .fn()
        .mockResolvedValue({ data: { items: [] } }),
    },
    rateLimit: {
      get: jest.fn().mockResolvedValue({
        data: {
          rate: {
            limit: 5000,
            remaining: 4999,
            reset: Math.floor(Date.now() / 1000) + 3600,
          },
        },
      }),
    },
  };
}

export default { Octokit };
