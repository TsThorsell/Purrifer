import type { SliceManifest } from "@app/registry/slices";

export const holdingsAndEventsManifest: SliceManifest = {
  sliceId: "holdings-and-events",
  displayName: "Holdings and Events",
  moduleDocPath: "src/features/holdings-and-events/MODULE.md",
  ownedAreas: ["innehav", "handelser", "tidslinje"],
  navigation: [
    {
      route: "holdings-and-events",
      label: "Innehav",
      sliceId: "holdings-and-events"
    }
  ]
};
