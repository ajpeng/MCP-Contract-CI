const githubApiBase = "https://api.github.com";

export function issueCommentsUrl(repository: string, issueNumber: number): string {
  return `${githubApiBase}/repos/${repository}/issues/${issueNumber}/comments`;
}

export function issueCommentUrl(repository: string, commentId: number): string {
  return `${githubApiBase}/repos/${repository}/issues/comments/${commentId}`;
}
