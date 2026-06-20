import type { CapabilityManifest, DiffResult, Json } from "./types.js";
export declare function diffManifests(baseline: CapabilityManifest, candidate: CapabilityManifest): DiffResult;
export declare function formatMarkdown(result: DiffResult): string;
export declare function formatText(result: DiffResult): string;
export declare function isJson(value: unknown): value is Json;
