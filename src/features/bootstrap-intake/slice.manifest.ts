import type { SliceManifest } from "@app/registry/slices";

export const bootstrapIntakeManifest: SliceManifest = {
  sliceId: "bootstrap-intake",
  displayName: "Bootstrap Intake",
  moduleDocPath: "src/features/bootstrap-intake/MODULE.md",
  ownedAreas: ["rawzonsingest", "folder-batch-intake", "hash-dedupe"],
  navigation: [
    {
      route: "bootstrap-intake",
      label: "Bootstrap Intake",
      sliceId: "bootstrap-intake"
    }
  ]
};
