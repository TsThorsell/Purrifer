import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const bootstrapAuditManifest: SliceManifest = {
  sliceId: "bootstrap-audit",
  displayName: "Bootstrap Audit",
  moduleDocPath: "src/features/bootstrap-audit/MODULE.md",
  ownedAreas: ["audit-traceability", "lineage-view"],
  navigation: [
    {
      route: "bootstrap-audit",
      label: "Bootstrap Audit",
      sliceId: "bootstrap-audit"
    }
  ]
};

