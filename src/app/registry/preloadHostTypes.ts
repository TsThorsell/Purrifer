export type PreloadIpcPermission = "public" | "restricted";

export interface PreloadIpcMethodSpec {
  method: string;
  channel: string;
  permission: PreloadIpcPermission;
  validate?: (args: unknown[]) => void;
}

export interface PreloadSliceHost {
  sliceId: string;
  namespace: string;
  schemaVersion?: string;
  methods: PreloadIpcMethodSpec[];
}

export interface PreloadHostContext {
  invoke: <T>(channel: string, ...args: unknown[]) => Promise<T>;
}

export interface PreloadHostDiscoveryIssue {
  code:
    | "INVALID_HOST_ENTRY"
    | "DUPLICATE_NAMESPACE"
    | "DUPLICATE_METHOD"
    | "METHOD_CHANNEL_MISSING"
    | "MODULE_LOAD_FAILURE"
    | "HOST_NAMESPACE_MISSING"
    | "SCHEMA_VERSION_MISSING"
    | "SCHEMA_VERSION_INVALID"
    | "SCHEMA_VERSION_UNSUPPORTED_MAJOR"
    | "SCHEMA_VERSION_FUTURE"
    | "HOST_METHOD_NOT_ALLOWED";
  severity: "warning" | "error";
  sliceId: string;
  namespace?: string;
  method?: string;
  channel?: string;
  message: string;
}

export interface PreloadHostDiscoveryResult {
  apis: Record<string, Record<string, unknown>>;
  issues: PreloadHostDiscoveryIssue[];
}
