import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const bootstrapPilotDashboardManifest: SliceManifest = {
  sliceId: "bootstrap-pilot-dashboard",
  displayName: "Bootstrap Pilot Dashboard",
  moduleDocPath: "src/features/bootstrap-pilot-dashboard/MODULE.md",
  ownedAreas: ["bootstrap-pilot-dashboard", "migration-kpi"],
  navigation: [
    {
      route: "bootstrap-pilot-dashboard",
      label: "Bootstrap Dashboard",
      sliceId: "bootstrap-pilot-dashboard"
    }
  ]
};


