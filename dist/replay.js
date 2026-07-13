import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
function stable(value) {
    if (Array.isArray(value))
        return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
    }
    return JSON.stringify(value);
}
function matchesSchema(value, schema) {
    if (schema.const !== undefined && stable(value) !== stable(schema.const))
        return false;
    if (schema.enum && !schema.enum.some((item) => stable(item) === stable(value)))
        return false;
    const type = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
    if (type.length && !type.some((item) => matchesType(value, item)))
        return false;
    if (value && typeof value === "object" && !Array.isArray(value) && schema.properties) {
        const record = value;
        if ((schema.required ?? []).some((name) => record[name] === undefined))
            return false;
        if (schema.additionalProperties === false && Object.keys(record).some((name) => !schema.properties?.[name]))
            return false;
        return Object.entries(record).every(([name, item]) => !schema.properties?.[name] || matchesSchema(item, schema.properties[name]));
    }
    return true;
}
function matchesType(value, type) {
    if (type === "null")
        return value === null;
    if (type === "array")
        return Array.isArray(value);
    if (type === "object")
        return typeof value === "object" && value !== null && !Array.isArray(value);
    if (type === "integer")
        return typeof value === "number" && Number.isInteger(value);
    return typeof value === type;
}
export function replayTrace(trace, manifest) {
    const tools = new Map(manifest.tools.map((tool) => [tool.name, tool]));
    const calls = trace.calls.map((call) => {
        const tool = tools.get(call.tool);
        if (!tool)
            return { tool: call.tool, passed: false, reason: "Tool does not exist" };
        if (!matchesSchema(call.arguments, tool.inputSchema))
            return { tool: call.tool, passed: false, reason: "Saved arguments no longer satisfy the input schema" };
        return { tool: call.tool, passed: true };
    });
    return { passed: calls.every((call) => call.passed), calls };
}
function contains(actual, expected) {
    if (expected === null || typeof expected !== "object")
        return Object.is(actual, expected);
    if (Array.isArray(expected))
        return Array.isArray(actual) && expected.every((item, index) => contains(actual[index], item));
    if (!actual || typeof actual !== "object" || Array.isArray(actual))
        return false;
    return Object.entries(expected).every(([key, value]) => contains(actual[key], value));
}
class StdioMcpClient {
    nextId = 1;
    pending = new Map();
    process;
    constructor(command) {
        this.process = spawn(command, { shell: true, stdio: ["pipe", "pipe", "pipe"] });
        const lines = createInterface({ input: this.process.stdout });
        lines.on("line", (line) => {
            try {
                const response = JSON.parse(line);
                if (typeof response.id === "number") {
                    const pending = this.pending.get(response.id);
                    if (pending) {
                        this.pending.delete(response.id);
                        clearTimeout(pending.timer);
                        pending.resolve(response);
                    }
                }
            }
            catch { }
        });
    }
    async request(method, params) {
        const id = this.nextId++;
        const response = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pending.delete(id))
                    reject(new Error(`${method} timed out after 10 seconds`));
            }, 10_000);
            this.pending.set(id, { resolve, reject, timer });
        });
        this.process.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
        const message = await response;
        if (message.error)
            throw new Error(message.error.message ?? `${method} failed`);
        return message.result;
    }
    async close() {
        this.process.kill();
    }
}
export async function replayLiveTrace(trace, command) {
    const client = new StdioMcpClient(command);
    try {
        await client.request("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "mcp-contract-ci", version: "0.1.0" }
        });
        const calls = [];
        for (const call of trace.calls) {
            try {
                const result = await client.request("tools/call", { name: call.tool, arguments: call.arguments });
                if (call.expectedOutput !== undefined && !contains(result, call.expectedOutput)) {
                    calls.push({ tool: call.tool, passed: false, reason: "Server response no longer matches the saved expected output" });
                }
                else
                    calls.push({ tool: call.tool, passed: true });
            }
            catch (error) {
                calls.push({ tool: call.tool, passed: false, reason: error instanceof Error ? error.message : String(error) });
            }
        }
        return { passed: calls.every((call) => call.passed), calls };
    }
    finally {
        await client.close();
    }
}
//# sourceMappingURL=replay.js.map