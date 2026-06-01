import type { AppRouteKey } from "./routes";
import type { AppNavigationTreeItem } from "./sliceManifestTypes";

export interface ShellHostRenderContext {
  activeRoute: AppRouteKey;
  navigation: AppNavigationTreeItem[];
  onNavigate: (route: AppRouteKey) => void;
  children: React.ReactNode;
}

export interface ShellSliceHost {
  sliceId: string;
  schemaVersion?: string;
  renderShell: (context: ShellHostRenderContext) => JSX.Element;
}

export interface ShellHostDiscoveryIssue {
  code:
    | "SHELL_HOST_MISSING"
    | "INVALID_HOST_ENTRY"
    | "DUPLICATE_HOST"
    | "SCHEMA_VERSION_MISSING"
    | "SCHEMA_VERSION_INVALID"
    | "SCHEMA_VERSION_UNSUPPORTED_MAJOR"
    | "SCHEMA_VERSION_FUTURE";
  severity: "warning" | "error";
  sliceId: string;
  message: string;
}

export interface ShellHostDiscoveryResult {
  host?: ShellSliceHost;
  issues: ShellHostDiscoveryIssue[];
}
