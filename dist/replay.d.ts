import type { CapabilityManifest, ReplayResult, TraceFile } from "./types.js";
export declare function replayTrace(trace: TraceFile, manifest: CapabilityManifest): ReplayResult;
export declare function replayLiveTrace(trace: TraceFile, command: string): Promise<ReplayResult>;
