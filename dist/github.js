const githubApiBase = "https://api.github.com";
export function issueCommentsUrl(repository, issueNumber) {
    return `${githubApiBase}/repos/${repository}/issues/${issueNumber}/comments`;
}
export function issueCommentUrl(repository, commentId) {
    return `${githubApiBase}/repos/${repository}/issues/comments/${commentId}`;
}
//# sourceMappingURL=github.js.map