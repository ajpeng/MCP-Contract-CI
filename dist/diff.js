function stable(value) {
    if (Array.isArray(value))
        return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
    }
    return JSON.stringify(value);
}
function types(schema) {
    return schema.type === undefined ? undefined : Array.isArray(schema.type) ? schema.type : [schema.type];
}
function isNarrower(oldSchema, newSchema) {
    const oldTypes = types(oldSchema);
    const newTypes = types(newSchema);
    if (oldTypes && newTypes && oldTypes.some((type) => !newTypes.includes(type)))
        return true;
    const oldEnum = oldSchema.enum;
    const newEnum = newSchema.enum;
    if (!oldEnum && (newEnum || newSchema.const !== undefined))
        return true;
    if (oldEnum && newEnum && oldEnum.some((item) => !newEnum.some((next) => stable(item) === stable(next))))
        return true;
    if (oldSchema.enum && newSchema.const && !oldSchema.enum.some((item) => stable(item) === stable(newSchema.const)))
        return true;
    if (oldSchema.additionalProperties !== false && newSchema.additionalProperties === false)
        return true;
    return false;
}
function add(changes, kind, subject, message, path) {
    changes.push({ kind, subject, path, message, breaking: true });
}
function compareInputSchema(tool, previous, candidate, changes, path = "input") {
    if (isNarrower(previous, candidate)) {
        add(changes, "input-schema-narrowed", tool.name, `${tool.name} accepts fewer values at ${path}`, path);
    }
    const oldProperties = previous.properties ?? {};
    const newProperties = candidate.properties ?? {};
    const oldRequired = new Set(previous.required ?? []);
    const newRequired = new Set(candidate.required ?? []);
    for (const [name, oldProperty] of Object.entries(oldProperties)) {
        const propertyPath = `${path}.${name}`;
        const newProperty = newProperties[name];
        if (!newProperty) {
            add(changes, "input-field-removed", tool.name, `${tool.name} no longer accepts input field '${name}'`, propertyPath);
            continue;
        }
        if (!oldRequired.has(name) && newRequired.has(name)) {
            add(changes, "input-field-now-required", tool.name, `${tool.name} now requires input field '${name}'`, propertyPath);
        }
        compareInputSchema(tool, oldProperty, newProperty, changes, propertyPath);
    }
    for (const name of newRequired) {
        if (!oldProperties[name])
            add(changes, "input-field-now-required", tool.name, `${tool.name} adds required input field '${name}'`, `${path}.${name}`);
    }
}
function compareOutputSchema(tool, previous, candidate, changes, path = "output") {
    if (isNarrower(previous, candidate))
        add(changes, "output-schema-changed", tool.name, `${tool.name} narrows output values at ${path}`, path);
    for (const [name, oldProperty] of Object.entries(previous.properties ?? {})) {
        const propertyPath = `${path}.${name}`;
        const newProperty = (candidate.properties ?? {})[name];
        if (!newProperty) {
            add(changes, "output-field-removed", tool.name, `${tool.name} no longer returns output field '${name}'`, propertyPath);
            continue;
        }
        compareOutputSchema(tool, oldProperty, newProperty, changes, propertyPath);
    }
}
function likelyRenamed(previous, additions) {
    return additions.find((candidate) => stable(candidate.inputSchema) === stable(previous.inputSchema) && stable(candidate.outputSchema) === stable(previous.outputSchema))?.name;
}
export function diffManifests(baseline, candidate) {
    const changes = [];
    const nextTools = new Map(candidate.tools.map((tool) => [tool.name, tool]));
    const oldTools = new Map(baseline.tools.map((tool) => [tool.name, tool]));
    const additions = candidate.tools.filter((tool) => !oldTools.has(tool.name));
    for (const previous of baseline.tools) {
        const next = nextTools.get(previous.name);
        if (!next) {
            const renamed = likelyRenamed(previous, additions);
            if (renamed)
                add(changes, "tool-renamed", previous.name, `Tool '${previous.name}' was renamed to '${renamed}'`);
            else
                add(changes, "tool-removed", previous.name, `Tool '${previous.name}' was removed`);
            continue;
        }
        compareInputSchema(previous, previous.inputSchema, next.inputSchema, changes);
        if (previous.outputSchema && next.outputSchema)
            compareOutputSchema(previous, previous.outputSchema, next.outputSchema, changes);
        if (previous.outputSchema && !next.outputSchema)
            add(changes, "output-schema-changed", previous.name, `${previous.name} no longer declares an output schema`, "output");
    }
    const resources = new Set((candidate.resources ?? []).map((resource) => resource.uri));
    for (const resource of baseline.resources ?? []) {
        if (!resources.has(resource.uri))
            add(changes, "resource-removed", resource.uri, `Resource '${resource.uri}' was removed`);
    }
    const prompts = new Set((candidate.prompts ?? []).map((prompt) => prompt.name));
    for (const prompt of baseline.prompts ?? []) {
        if (!prompts.has(prompt.name))
            add(changes, "prompt-removed", prompt.name, `Prompt '${prompt.name}' was removed`);
    }
    return {
        baseline: baseline.server,
        candidate: candidate.server,
        changes,
        summary: { breaking: changes.length, toolsCompared: baseline.tools.filter((tool) => nextTools.has(tool.name)).length }
    };
}
export function formatMarkdown(result) {
    const title = result.summary.breaking === 0 ? "## MCP contract check passed" : `## MCP contract check found ${result.summary.breaking} breaking change${result.summary.breaking === 1 ? "" : "s"}`;
    const details = result.changes.map((change) => `- **${change.kind}**: ${change.message}`).join("\n");
    return `${title}\n\nCompared \`${result.baseline.name}${result.baseline.version ? `@${result.baseline.version}` : ""}\` with \`${result.candidate.name}${result.candidate.version ? `@${result.candidate.version}` : ""}\`.\n${details || "\nNo breaking changes detected."}\n`;
}
export function formatText(result) {
    if (result.summary.breaking === 0)
        return "No breaking MCP contract changes detected.";
    return result.changes.map((change) => `${change.kind}: ${change.message}`).join("\n");
}
export function isJson(value) {
    return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) || (typeof value === "object" && value !== null);
}
//# sourceMappingURL=diff.js.map