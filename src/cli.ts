#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { diffManifests, formatMarkdown, formatText } from "./diff.js";
import { createManifest, loadManifest } from "./manifest.js";
import { replayLiveTrace, replayTrace } from "./replay.js";
import type { TraceFile } from "./types.js";

function usage(): string {
  return `MCP Contract CI

Usage:
  mcp-contract diff <baseline.json> <candidate.json> [--format text|markdown|json] [--fail-on breaking]
  mcp-contract replay <trace.json> <manifest.json> [--command "node candidate-server.js"] [--format text|json]
  mcp-contract manifest publish <manifest.json> --out <path>
`;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function loadTrace(path: string): Promise<TraceFile> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!value || typeof value !== "object" || (value as TraceFile).version !== 1 || !Array.isArray((value as TraceFile).calls)) {
    throw new Error(`${path} is not a valid trace file`);
  }
  return value as TraceFile;
}

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "diff") {
    const [baselinePath, candidatePath] = rest;
    if (!baselinePath || !candidatePath) throw new Error("diff needs a baseline and candidate manifest");
    const result = diffManifests(await loadManifest(baselinePath), await loadManifest(candidatePath));
    const format = option(rest, "--format") ?? "text";
    if (format === "json") console.log(JSON.stringify(result, null, 2));
    else if (format === "markdown") console.log(formatMarkdown(result));
    else if (format === "text") console.log(formatText(result));
    else throw new Error(`Unsupported output format '${format}'`);
    if (option(rest, "--fail-on") === "breaking" && result.summary.breaking > 0) process.exitCode = 1;
    return;
  }
  if (command === "replay") {
    const [tracePath, manifestPath] = rest;
    if (!tracePath || !manifestPath) throw new Error("replay needs a trace and manifest");
    const trace = await loadTrace(tracePath);
    const localResult = replayTrace(trace, await loadManifest(manifestPath));
    const command = option(rest, "--command");
    const result = localResult.passed && command ? await replayLiveTrace(trace, command) : localResult;
    if ((option(rest, "--format") ?? "text") === "json") console.log(JSON.stringify(result, null, 2));
    else {
      for (const call of result.calls) console.log(`${call.passed ? "PASS" : "FAIL"} ${call.tool}${call.reason ? `: ${call.reason}` : ""}`);
      console.log(result.passed ? "All saved workflows remain compatible." : "One or more saved workflows are broken.");
    }
    if (!result.passed) process.exitCode = 1;
    return;
  }
  if (command === "manifest" && rest[0] === "publish") {
    const manifestPath = rest[1];
    const out = option(rest, "--out");
    if (!manifestPath || !out) throw new Error("manifest publish needs a manifest and --out path");
    const manifest = createManifest(await loadManifest(manifestPath));
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Published ${manifest.server.name}${manifest.server.version ? `@${manifest.server.version}` : ""} capability manifest to ${out}`);
    return;
  }
  throw new Error(`Unknown command '${command}'`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});
