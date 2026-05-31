import type { SliceManifest } from "@app/registry/slices";

export const retirementBaselineManifest: SliceManifest = {
  sliceId: "retirement-baseline",
  displayName: "Retirement Baseline",
  moduleDocPath: "src/features/retirement-baseline/MODULE.md",
  ownedAreas: ["pensionsbaslinje", "scenario-antaganden", "hitl-godkannande"],
  navigation: [
    {
      route: "retirement-baseline",
      label: "Pension",
      sliceId: "retirement-baseline"
    }
  ]
};

