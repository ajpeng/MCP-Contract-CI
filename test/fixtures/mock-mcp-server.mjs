import readline from "node:readline";

const lines = readline.createInterface({ input: process.stdin });

lines.on("line", (line) => {
  const request = JSON.parse(line);
  if (request.method === "initialize") {
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "mock", version: "1.0.0" } } })}\n`);
    return;
  }
  if (request.method === "tools/call" && request.params.name === "search") {
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { structuredContent: { found: true, query: request.params.arguments.query } } })}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { message: "Unknown tool" } })}\n`);
});
