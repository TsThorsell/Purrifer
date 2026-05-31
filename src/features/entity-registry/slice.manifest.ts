import type { SliceManifest } from "@app/registry/slices";

export const entityRegistryManifest: SliceManifest = {
  sliceId: "entity-registry",
  displayName: "Entity Registry",
  moduleDocPath: "src/features/entity-registry/MODULE.md",
  ownedAreas: ["entities", "ownership relations", "accounts"],
  navigation: [{ route: "entity-registry", label: "Entiteter", sliceId: "entity-registry" }]
};

