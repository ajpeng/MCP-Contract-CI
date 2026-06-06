import test from "node:test";
import assert from "node:assert/strict";
import { replayLiveTrace, replayTrace } from "../src/replay.js";
import type { CapabilityManifest, TraceFile } from "../src/types.js";

const manifest: CapabilityManifest = {
  schemaVersion: 1,
  server: { name: "demo" },
  tools: [{ name: "search", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } }]
};

test("replays saved calls against a capability manifest", () => {
  const trace: TraceFile = { version: 1, calls: [{ tool: "search", arguments: { query: "mcp" } }] };
  assert.deepEqual(replayTrace(trace, manifest), { passed: true, calls: [{ tool: "search", passed: true }] });
});

test("identifies missing tools and obsolete arguments", () => {
  const trace: TraceFile = { version: 1, calls: [{ tool: "missing", arguments: {} }, { tool: "search", arguments: { query: "mcp", oldFlag: true } }] };
  const result = replayTrace(trace, manifest);
  assert.equal(result.passed, false);
  assert.equal(result.calls[0]?.reason, "Tool does not exist");
  assert.equal(result.calls[1]?.reason, "Saved arguments no longer satisfy the input schema");
});

test("replays a trace against a live stdio MCP server", async () => {
  const trace: TraceFile = {
    version: 1,
    calls: [{ tool: "search", arguments: { query: "mcp" }, expectedOutput: { structuredContent: { found: true } } }]
  };
  const server = new URL("./fixtures/mock-mcp-server.mjs", import.meta.url).pathname;
  assert.deepEqual(await replayLiveTrace(trace, `node ${server}`), { passed: true, calls: [{ tool: "search", passed: true }] });
});
