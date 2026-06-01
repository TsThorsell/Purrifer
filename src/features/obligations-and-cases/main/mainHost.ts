import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { obligationsAndCasesChannels } from "@features/obligations-and-cases/contracts";
import type {
  CreateChecklistItemInput,
  CompleteChecklistItemInput,
  CreateCaseInput,
  CreateObligationInput,
  UpdateCaseInput,
  UpdateObligationInput
} from "@features/obligations-and-cases/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "obligations-and-cases",
    allowedChannels: Object.values(obligationsAndCasesChannels),
    handlers: [
      {
        channel: obligationsAndCasesChannels.createObligation,
        permission: "restricted",
        handler: (_event, input: CreateObligationInput) =>
          context.obligationsAndCasesService.createObligation(input)
      },
      {
        channel: obligationsAndCasesChannels.updateObligation,
        permission: "restricted",
        handler: (_event, input: UpdateObligationInput) =>
          context.obligationsAndCasesService.updateObligation(input)
      },
      {
        channel: obligationsAndCasesChannels.listObligations,
        permission: "public",
        handler: () => context.obligationsAndCasesService.listObligations()
      },
      {
        channel: obligationsAndCasesChannels.getObligationDetails,
        permission: "public",
        handler: (_event, obligationId: string) =>
          context.obligationsAndCasesService.getObligationDetails(obligationId)
      },
      {
        channel: obligationsAndCasesChannels.createCase,
        permission: "restricted",
        handler: (_event, input: CreateCaseInput) => context.obligationsAndCasesService.createCase(input)
      },
      {
        channel: obligationsAndCasesChannels.updateCase,
        permission: "restricted",
        handler: (_event, input: UpdateCaseInput) => context.obligationsAndCasesService.updateCase(input)
      },
      {
        channel: obligationsAndCasesChannels.listCases,
        permission: "public",
        handler: (_event, obligationId?: string) =>
          context.obligationsAndCasesService.listCases(obligationId)
      },
      {
        channel: obligationsAndCasesChannels.getCaseDetails,
        permission: "public",
        handler: (_event, caseId: string) => context.obligationsAndCasesService.getCaseDetails(caseId)
      },
      {
        channel: obligationsAndCasesChannels.createChecklistItem,
        permission: "restricted",
        handler: (_event, input: CreateChecklistItemInput) =>
          context.obligationsAndCasesService.createChecklistItem(input)
      },
      {
        channel: obligationsAndCasesChannels.completeChecklistItem,
        permission: "restricted",
        handler: (_event, input: CompleteChecklistItemInput) =>
          context.obligationsAndCasesService.completeChecklistItem(input)
      },
      {
        channel: obligationsAndCasesChannels.runDeviationScan,
        permission: "restricted",
        handler: () => context.obligationsAndCasesService.runDeviationScan()
      },
      {
        channel: obligationsAndCasesChannels.listDeviationCases,
        permission: "public",
        handler: () => context.obligationsAndCasesService.listDeviationCases()
      }
    ]
  };
}
