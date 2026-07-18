import test from "node:test";
import assert from "node:assert/strict";
import { issueCommentUrl, issueCommentsUrl } from "../src/github.js";

test("builds the issue comments collection endpoint for a pull request", () => {
  assert.equal(issueCommentsUrl("owner/repo", 42), "https://api.github.com/repos/owner/repo/issues/42/comments");
});

test("builds the single issue comment endpoint for updates", () => {
  assert.equal(issueCommentUrl("owner/repo", 99), "https://api.github.com/repos/owner/repo/issues/comments/99");
});
