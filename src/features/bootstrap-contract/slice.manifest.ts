import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const bootstrapContractManifest: SliceManifest = {
  sliceId: "bootstrap-contract",
  displayName: "Bootstrap Contract",
  moduleDocPath: "src/features/bootstrap-contract/MODULE.md",
  ownedAreas: ["canonical-import-contract", "schema-validator"],
  navigation: []
};

