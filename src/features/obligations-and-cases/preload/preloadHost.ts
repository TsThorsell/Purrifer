import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { obligationsAndCasesChannels } from "@features/obligations-and-cases/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "obligations-and-cases",
    namespace: "obligationsAndCases",
    methods: [
      {
        method: "createObligation",
        channel: obligationsAndCasesChannels.createObligation,
        permission: "restricted"
      },
      {
        method: "updateObligation",
        channel: obligationsAndCasesChannels.updateObligation,
        permission: "restricted"
      },
      {
        method: "listObligations",
        channel: obligationsAndCasesChannels.listObligations,
        permission: "public"
      },
      {
        method: "getObligationDetails",
        channel: obligationsAndCasesChannels.getObligationDetails,
        permission: "public"
      },
      {
        method: "createCase",
        channel: obligationsAndCasesChannels.createCase,
        permission: "restricted"
      },
      {
        method: "updateCase",
        channel: obligationsAndCasesChannels.updateCase,
        permission: "restricted"
      },
      {
        method: "listCases",
        channel: obligationsAndCasesChannels.listCases,
        permission: "public"
      },
      {
        method: "getCaseDetails",
        channel: obligationsAndCasesChannels.getCaseDetails,
        permission: "public"
      },
      {
        method: "createChecklistItem",
        channel: obligationsAndCasesChannels.createChecklistItem,
        permission: "restricted"
      },
      {
        method: "completeChecklistItem",
        channel: obligationsAndCasesChannels.completeChecklistItem,
        permission: "restricted"
      },
      {
        method: "runDeviationScan",
        channel: obligationsAndCasesChannels.runDeviationScan,
        permission: "restricted"
      },
      {
        method: "listDeviationCases",
        channel: obligationsAndCasesChannels.listDeviationCases,
        permission: "public"
      }
    ]
  };
}
