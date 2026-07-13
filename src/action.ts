import { appendFile, readFile } from "node:fs/promises";
import { diffManifests, formatMarkdown } from "./diff.js";
import { loadManifest } from "./manifest.js";
import { replayLiveTrace, replayTrace } from "./replay.js";
import type { TraceFile } from "./types.js";

const marker = "<!-- mcp-contract-ci -->";

async function output(name: string, value: string): Promise<void> {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function postComment(body: string): Promise<void> {
  const token = process.env.INPUT_GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!token || !repository || !eventPath || process.env.GITHUB_EVENT_NAME !== "pull_request") return;
  const event = JSON.parse(await readFile(eventPath, "utf8")) as { pull_request?: { number?: number } };
  const number = event.pull_request?.number;
  if (!number) return;
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
  const base = `https://api.github.com/repos/${repository}/issues/${number}/comments`;
  const existing = await fetch(base, { headers }).then(async (response) => response.ok ? response.json() as Promise<Array<{ id: number; body: string }>> : []);
  const previous = existing.find((comment) => comment.body.includes(marker));
  const options = { method: previous ? "PATCH" : "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ body: `${marker}\n${body}` }) };
  const response = await fetch(previous ? `${base}/${previous.id}` : base, options);
  if (!response.ok) console.warn(`Could not post PR comment: ${response.status} ${response.statusText}`);
}

async function replaySavedTraces(paths: string | undefined, manifestPath: string, command: string | undefined): Promise<number> {
  if (!paths?.trim()) return 0;
  const manifest = await loadManifest(manifestPath);
  let broken = 0;
  for (const path of paths.split("\n").map((value) => value.trim()).filter(Boolean)) {
    const trace = JSON.parse(await readFile(path, "utf8")) as TraceFile;
    if (trace.version !== 1 || !Array.isArray(trace.calls)) throw new Error(`${path} is not a valid trace file`);
    const result = command ? await replayLiveTrace(trace, command) : replayTrace(trace, manifest);
    if (!result.passed) broken += 1;
  }
  return broken;
}

async function main(): Promise<void> {
  const baseline = process.env.INPUT_BASELINE;
  const candidate = process.env.INPUT_CANDIDATE;
  if (!baseline || !candidate) throw new Error("The baseline and candidate inputs are required");
  const result = diffManifests(await loadManifest(baseline), await loadManifest(candidate));
  const brokenWorkflows = await replaySavedTraces(process.env.INPUT_TRACES, candidate, process.env.INPUT_REPLAY_COMMAND);
  const impact = brokenWorkflows > 0
    ? `\n\n> **Agent workflow impact:** This candidate breaks ${brokenWorkflows} saved workflow${brokenWorkflows === 1 ? "" : "s"}.`
    : "";
  const report = `${formatMarkdown(result)}${impact}`;
  const shouldFail = result.summary.breaking > 0 && (process.env.INPUT_FAIL_ON_BREAKING ?? "true") === "true";
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  for (const change of result.changes) console.log(`::${shouldFail ? "error" : "warning"} title=MCP contract break::${change.message}`);
  await postComment(report);
  await output("breaking-changes", String(result.summary.breaking));
  await output("broken-workflows", String(brokenWorkflows));
  if (shouldFail) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});
