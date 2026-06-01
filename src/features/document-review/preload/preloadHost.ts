import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { documentReviewChannels } from "@features/document-review/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "document-review",
    namespace: "documentReview",
    methods: [
      {
        method: "extractDocumentFields",
        channel: documentReviewChannels.extractDocumentFields,
        permission: "restricted"
      },
      {
        method: "extractDocumentTables",
        channel: documentReviewChannels.extractDocumentTables,
        permission: "restricted"
      },
      {
        method: "updateFieldRegion",
        channel: documentReviewChannels.updateFieldRegion,
        permission: "restricted"
      },
      {
        method: "saveFieldTemplate",
        channel: documentReviewChannels.saveFieldTemplate,
        permission: "restricted"
      },
      {
        method: "saveTableTemplate",
        channel: documentReviewChannels.saveTableTemplate,
        permission: "restricted"
      },
      {
        method: "listNeedsReviewQueue",
        channel: documentReviewChannels.listNeedsReviewQueue,
        permission: "restricted"
      },
      {
        method: "decideReviewDocument",
        channel: documentReviewChannels.decideReviewDocument,
        permission: "restricted"
      },
      {
        method: "correctRejectedDocument",
        channel: documentReviewChannels.correctRejectedDocument,
        permission: "restricted"
      },
      {
        method: "getDecisionTrail",
        channel: documentReviewChannels.getDecisionTrail,
        permission: "restricted"
      }
    ]
  };
}
