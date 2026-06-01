import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const searchAndIndexManifest: SliceManifest = {
  sliceId: "search-and-index",
  displayName: "Search and Index",
  moduleDocPath: "src/features/search-and-index/MODULE.md",
  ownedAreas: ["mastersearch", "search index", "cross-object search results"],
  navigation: [
    {
      route: "search",
      label: "Mastersearch",
      sliceId: "search-and-index"
    }
  ]
};

