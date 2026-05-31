import type { SliceManifest } from "@app/registry/slices";

export const bootstrapStageManifest: SliceManifest = {
  sliceId: "bootstrap-stage",
  displayName: "Bootstrap Stage Gate",
  moduleDocPath: "src/features/bootstrap-stage/MODULE.md",
  ownedAreas: ["stage-import-gate", "record-status-classification"],
  navigation: [
    {
      route: "bootstrap-stage",
      label: "Bootstrap Stage",
      sliceId: "bootstrap-stage"
    }
  ]
};
