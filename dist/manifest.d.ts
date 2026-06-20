import type { CapabilityManifest } from "./types.js";
export declare function validateManifest(value: unknown, source?: string): asserts value is CapabilityManifest;
export declare function loadManifest(path: string): Promise<CapabilityManifest>;
export declare function createManifest(manifest: Omit<CapabilityManifest, "schemaVersion" | "generatedAt">): CapabilityManifest;
