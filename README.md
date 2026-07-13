# MCP Contract CI

MCP Contract CI catches the changes that quietly break agents after an MCP server ships. It compares a released capability manifest with a candidate version, highlights breaking changes in plain language, and can replay saved tool calls against a running server before release.

It is built for teams that treat MCP tools as a product surface. A tool rename, a newly required field, or a missing response property can be enough to strand an otherwise healthy agent workflow.

## What it checks

- Removed or likely renamed tools
- Removed resources and prompts
- Input fields that disappear or become required
- Input schemas that accept fewer values, including narrowed types, enums, and object shapes
- Output fields that disappear or schemas that narrow
- Saved tool-call traces against a manifest or a running stdio MCP server

The checker reports only breaking changes. Additive, optional inputs are allowed so a team can evolve a server without noisy CI failures.

## Quick start

```bash
npm install
npm run build
npx mcp-contract diff examples/before.json examples/after.json --format markdown --fail-on breaking
```

The included example intentionally fails with a report like this:

```text
input-field-now-required: create_event adds required input field 'timezone'
output-field-removed: create_event no longer returns output field 'url'
tool-removed: Tool 'find_availability' was removed
```

## Capability manifests

A manifest is a small, versioned description of the MCP surface your clients depend on. Keep the current released copy in your repository, then generate a candidate copy during a pull request.

```json
{
  "schemaVersion": 1,
  "server": { "name": "calendar-mcp", "version": "1.4.0" },
  "tools": [
    {
      "name": "create_event",
      "inputSchema": {
        "type": "object",
        "properties": { "title": { "type": "string" } },
        "required": ["title"]
      },
      "outputSchema": {
        "type": "object",
        "properties": { "eventId": { "type": "string" } }
      }
    }
  ],
  "resources": [{ "uri": "calendar://timezone" }],
  "prompts": [{ "name": "schedule-team-meeting" }]
}
```

`schemaVersion` is the contract format version. `server.version` is your server release version. This separation lets clients pin a known server capability manifest while the checker itself evolves.

Publish a validated, timestamped copy as a release artifact or commit it with the server version:

```bash
npx mcp-contract manifest publish .mcp/candidate.json --out releases/2.0.0/capabilities.json
```

## CLI

Compare two manifests and fail a release when an agent contract would break:

```bash
npx mcp-contract diff .mcp/released.json .mcp/candidate.json --fail-on breaking
```

Use `--format text`, `--format markdown`, or `--format json` depending on where the report goes.

Replay saved calls structurally before starting a server:

```bash
npx mcp-contract replay traces/scheduling.json .mcp/candidate.json
```

Replay the same trace against a candidate MCP server over stdio. The command starts the server, performs MCP initialization, and issues `tools/call` requests from the trace:

```bash
npx mcp-contract replay traces/scheduling.json .mcp/candidate.json \
  --command "node dist/server.js"
```

Add `expectedOutput` to a trace call when the response shape matters. Expected output uses partial matching, so a stable subset of the response is enough to protect an agent workflow.

```json
{
  "version": 1,
  "calls": [{
    "name": "Schedule launch review",
    "tool": "create_event",
    "arguments": { "title": "Launch review" },
    "expectedOutput": { "structuredContent": { "eventId": "evt_123" } }
  }]
}
```

## GitHub Action

Use the action from this repository after publishing it, or try it locally with `uses: ./`.

```yaml
name: MCP contract

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/mcp-contract-ci@v1
        with:
          baseline: .mcp/released.json
          candidate: .mcp/candidate.json
          traces: |
            traces/scheduling.json
            traces/onboarding.json
          replay-command: node dist/server.js
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

The action adds an annotation for every break, writes a readable job summary, and maintains one PR comment instead of spamming every run. When `traces` is supplied, its PR comment also says how many saved agent workflows the candidate breaks. Add `replay-command` to exercise those calls against a live candidate server. Set `fail-on-breaking: "false"` while introducing it to an existing server.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

The project intentionally has a small dependency footprint. The contract engine is framework-free TypeScript, the tests use Node's built-in test runner, and the action uses the GitHub REST API directly.

## Scope and next steps

This MVP focuses on JSON capability snapshots because they are reviewable, easy to archive, and reliable in CI. A production follow-up would add server introspection to generate manifests automatically, semantic version policy, richer JSON Schema support, and a small release-history dashboard backed by the same report format.
