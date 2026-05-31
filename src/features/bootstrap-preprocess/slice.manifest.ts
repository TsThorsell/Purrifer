import type { SliceManifest } from "@app/registry/slices";

export const bootstrapPreprocessManifest: SliceManifest = {
  sliceId: "bootstrap-preprocess",
  displayName: "Bootstrap Preprocess",
  moduleDocPath: "src/features/bootstrap-preprocess/MODULE.md",
  ownedAreas: ["offline-preprocess", "canonical-record-generation"],
  navigation: [
    {
      route: "bootstrap-preprocess",
      label: "Bootstrap Preprocess",
      sliceId: "bootstrap-preprocess"
    }
  ]
};
