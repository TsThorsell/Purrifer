import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { retirementBaselineChannels } from "@features/retirement-baseline/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "retirement-baseline",
    allowedChannels: Object.values(retirementBaselineChannels),
    handlers: [
      {
        channel: retirementBaselineChannels.saveRetirementAssumptions,
        permission: "restricted",
        handler: (_event, input) => context.retirementBaselineService.saveRetirementAssumptions(input)
      },
      {
        channel: retirementBaselineChannels.getRetirementScenario,
        permission: "public",
        handler: (_event, entityId: string) =>
          context.retirementBaselineService.getRetirementScenario(entityId)
      },
      {
        channel: retirementBaselineChannels.approveRetirementScenario,
        permission: "restricted",
        handler: (_event, input) => context.retirementBaselineService.approveRetirementScenario(input)
      },
      {
        channel: retirementBaselineChannels.listRetirementScenarios,
        permission: "public",
        handler: (_event, entityId: string) =>
          context.retirementBaselineService.listRetirementScenarios(entityId)
      },
      {
        channel: retirementBaselineChannels.compareRetirementScenarios,
        permission: "public",
        handler: (
          _event,
          entityId: string,
          leftScenarioId: string,
          rightScenarioId: string
        ) =>
          context.retirementBaselineService.compareRetirementScenarios(entityId, leftScenarioId, rightScenarioId)
      }
    ]
  };
}
