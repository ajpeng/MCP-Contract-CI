import test from "node:test";
import assert from "node:assert/strict";
import { diffManifests } from "../src/diff.js";
import type { CapabilityManifest } from "../src/types.js";

const baseline: CapabilityManifest = {
  schemaVersion: 1,
  server: { name: "demo", version: "1.0.0" },
  tools: [{
    name: "search",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" } }, required: ["query"] },
    outputSchema: { type: "object", properties: { items: { type: "array" }, total: { type: "integer" } } }
  }],
  resources: [{ uri: "demo://readme" }],
  prompts: [{ name: "research" }]
};

test("reports removed capabilities and incompatible schema changes", () => {
  const candidate: CapabilityManifest = {
    ...baseline,
    server: { name: "demo", version: "2.0.0" },
    tools: [{
      name: "search",
      inputSchema: { type: "object", properties: { query: { type: "string", enum: ["only-this"] }, limit: { type: "integer" }, region: { type: "string" } }, required: ["query", "region"] },
      outputSchema: { type: "object", properties: { items: { type: "array" } } }
    }],
    resources: [],
    prompts: []
  };
  const result = diffManifests(baseline, candidate);
  assert.deepEqual(result.changes.map((change) => change.kind).sort(), ["input-field-now-required", "input-schema-narrowed", "output-field-removed", "prompt-removed", "resource-removed"]);
});

test("flags a same-shape renamed tool", () => {
  const result = diffManifests(baseline, { ...baseline, tools: [{ ...baseline.tools[0], name: "query" }] });
  assert.equal(result.changes[0]?.kind, "tool-renamed");
  assert.match(result.changes[0]?.message ?? "", /search.*query/);
});

test("accepts additive optional input changes", () => {
  const result = diffManifests(baseline, { ...baseline, tools: [{ ...baseline.tools[0], inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" }, locale: { type: "string" } }, required: ["query"] } }] });
  assert.equal(result.summary.breaking, 0);
});
