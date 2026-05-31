import type { SliceManifest } from "@app/registry/slices";

export const obligationsAndCasesManifest: SliceManifest = {
  sliceId: "obligations-and-cases",
  displayName: "Obligations and Cases",
  moduleDocPath: "src/features/obligations-and-cases/MODULE.md",
  ownedAreas: ["obligation records", "obligation list", "obligation detail", "obligation status"],
  navigation: [
    {
      route: "obligations-and-cases",
      label: "Ataganden",
      sliceId: "obligations-and-cases"
    }
  ]
};

