import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const bootstrapCommitManifest: SliceManifest = {
  sliceId: "bootstrap-commit",
  displayName: "Bootstrap Commit",
  moduleDocPath: "src/features/bootstrap-commit/MODULE.md",
  ownedAreas: ["commit-import", "proof-chain-links"],
  navigation: [
    {
      route: "bootstrap-commit",
      label: "Bootstrap Commit",
      sliceId: "bootstrap-commit"
    }
  ]
};

