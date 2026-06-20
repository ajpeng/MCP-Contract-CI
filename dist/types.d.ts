export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
export interface JsonSchema {
    type?: string | string[];
    description?: string;
    enum?: Json[];
    const?: Json;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean | JsonSchema;
    items?: JsonSchema;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
    [key: string]: unknown;
}
export interface ToolContract {
    name: string;
    description?: string;
    inputSchema: JsonSchema;
    outputSchema?: JsonSchema;
}
export interface ResourceContract {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
}
export interface PromptContract {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}
export interface CapabilityManifest {
    schemaVersion: 1;
    server: {
        name: string;
        version?: string;
    };
    generatedAt?: string;
    tools: ToolContract[];
    resources?: ResourceContract[];
    prompts?: PromptContract[];
}
export type ChangeKind = "tool-removed" | "tool-renamed" | "resource-removed" | "prompt-removed" | "input-field-removed" | "input-field-now-required" | "input-schema-narrowed" | "output-field-removed" | "output-schema-changed";
export interface ContractChange {
    kind: ChangeKind;
    subject: string;
    path?: string;
    message: string;
    breaking: true;
}
export interface DiffResult {
    baseline: {
        name: string;
        version?: string;
    };
    candidate: {
        name: string;
        version?: string;
    };
    changes: ContractChange[];
    summary: {
        breaking: number;
        toolsCompared: number;
    };
}
export interface TraceCall {
    tool: string;
    arguments: Record<string, Json>;
    expectedOutput?: Json;
    name?: string;
}
export interface TraceFile {
    version: 1;
    calls: TraceCall[];
}
export interface ReplayResult {
    passed: boolean;
    calls: Array<{
        tool: string;
        passed: boolean;
        reason?: string;
    }>;
}
