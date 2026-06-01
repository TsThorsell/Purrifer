import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { retirementBaselineChannels } from "@features/retirement-baseline/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "retirement-baseline",
    namespace: "retirementBaseline",
    methods: [
      {
        method: "saveRetirementAssumptions",
        channel: retirementBaselineChannels.saveRetirementAssumptions,
        permission: "restricted"
      },
      {
        method: "getRetirementScenario",
        channel: retirementBaselineChannels.getRetirementScenario,
        permission: "public"
      },
      {
        method: "approveRetirementScenario",
        channel: retirementBaselineChannels.approveRetirementScenario,
        permission: "restricted"
      },
      {
        method: "listRetirementScenarios",
        channel: retirementBaselineChannels.listRetirementScenarios,
        permission: "public"
      },
      {
        method: "compareRetirementScenarios",
        channel: retirementBaselineChannels.compareRetirementScenarios,
        permission: "public"
      }
    ]
  };
}
