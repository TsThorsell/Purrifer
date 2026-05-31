import type { SliceManifest } from "@app/registry/slices";

export const bootstrapReviewManifest: SliceManifest = {
  sliceId: "bootstrap-review",
  displayName: "Bootstrap Review",
  moduleDocPath: "src/features/bootstrap-review/MODULE.md",
  ownedAreas: ["review-queue", "bulk-review-actions"],
  navigation: [
    {
      route: "bootstrap-review",
      label: "Bootstrap Review",
      sliceId: "bootstrap-review"
    }
  ]
};
