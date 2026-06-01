import { ShellLayout } from "./ShellLayout";
import type { ShellHostRenderContext, ShellSliceHost } from "@app/registry/shellHostTypes";

export const shellHost: ShellSliceHost = {
  sliceId: "shell-core",
  schemaVersion: "1.0.0",
  renderShell: ({ activeRoute, navigation, onNavigate, children }: ShellHostRenderContext) => (
    <ShellLayout activeRoute={activeRoute} navigation={navigation} onNavigate={onNavigate}>
      {children}
    </ShellLayout>
  )
};
