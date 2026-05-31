import type { SliceManifest } from "@app/registry/slices";

export const reportsLiteManifest: SliceManifest = {
  sliceId: "reports-lite",
  displayName: "Reports Lite",
  moduleDocPath: "src/features/reports-lite/MODULE.md",
  ownedAreas: ["entity ledger", "entity balance snapshot", "report drilldown"],
  navigation: [
    {
      route: "reports-lite",
      label: "Rapporter",
      sliceId: "reports-lite"
    }
  ]
};
