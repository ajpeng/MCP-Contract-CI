import { readFile } from "node:fs/promises";
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateSchema(schema, path) {
    if (!isObject(schema))
        throw new Error(`${path} must be an object`);
    if (schema.type !== undefined && typeof schema.type !== "string" && !Array.isArray(schema.type)) {
        throw new Error(`${path}.type must be a string or array`);
    }
}
export function validateManifest(value, source = "manifest") {
    if (!isObject(value))
        throw new Error(`${source} must be a JSON object`);
    if (value.schemaVersion !== 1)
        throw new Error(`${source}.schemaVersion must be 1`);
    if (!isObject(value.server) || typeof value.server.name !== "string") {
        throw new Error(`${source}.server.name must be a string`);
    }
    if (!Array.isArray(value.tools))
        throw new Error(`${source}.tools must be an array`);
    for (const [index, tool] of value.tools.entries()) {
        if (!isObject(tool) || typeof tool.name !== "string")
            throw new Error(`${source}.tools[${index}].name must be a string`);
        validateSchema(tool.inputSchema, `${source}.tools[${index}].inputSchema`);
        if (tool.outputSchema !== undefined)
            validateSchema(tool.outputSchema, `${source}.tools[${index}].outputSchema`);
    }
    for (const key of ["resources", "prompts"]) {
        if (value[key] !== undefined && !Array.isArray(value[key]))
            throw new Error(`${source}.${key} must be an array`);
    }
}
export async function loadManifest(path) {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    validateManifest(parsed, path);
    return parsed;
}
export function createManifest(manifest) {
    return { ...manifest, schemaVersion: 1, generatedAt: new Date().toISOString() };
}
//# sourceMappingURL=manifest.js.map