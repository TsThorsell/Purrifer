import type { SliceManifest } from "@app/registry/slices";

export const shellCoreManifest: SliceManifest = {
  sliceId: "shell-core",
  displayName: "Shell Core",
  moduleDocPath: "src/features/shell-core/MODULE.md",
  ownedAreas: [
    "app shell",
    "navigation",
    "landing page",
    "jobs page",
    "settings page",
    "design system foundation"
  ],
  navigation: [
    { route: "landing", label: "Landningsyta", sliceId: "shell-core" },
    { route: "jobs", label: "Jobb", sliceId: "shell-core" },
    { route: "settings", label: "Inställningar", sliceId: "shell-core" }
  ]
};
