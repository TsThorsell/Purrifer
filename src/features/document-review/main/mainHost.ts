import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { documentReviewChannels } from "@features/document-review/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "document-review",
    allowedChannels: Object.values(documentReviewChannels),
    handlers: [
      {
        channel: documentReviewChannels.extractDocumentFields,
        permission: "restricted",
        handler: (_event, documentId: string) => context.documentReviewService.extractDocumentFields(documentId)
      },
      {
        channel: documentReviewChannels.extractDocumentTables,
        permission: "restricted",
        handler: (_event, documentId: string) => context.documentReviewService.extractDocumentTables(documentId)
      },
      {
        channel: documentReviewChannels.updateFieldRegion,
        permission: "restricted",
        handler: (_event, documentId: string, fieldKey: string, region: { x: number; y: number; width: number; height: number }) =>
          context.documentReviewService.updateFieldRegion(documentId, fieldKey, region)
      },
      {
        channel: documentReviewChannels.saveFieldTemplate,
        permission: "restricted",
        handler: (_event, input: { templateKey: string; payloadJson: string }) =>
          context.documentReviewService.saveFieldTemplate(input)
      },
      {
        channel: documentReviewChannels.saveTableTemplate,
        permission: "restricted",
        handler: (_event, input: { templateKey: string; payloadJson: string }) =>
          context.documentReviewService.saveTableTemplate(input)
      },
      {
        channel: documentReviewChannels.listNeedsReviewQueue,
        permission: "restricted",
        handler: () => context.documentReviewService.listNeedsReviewQueue()
      },
      {
        channel: documentReviewChannels.decideReviewDocument,
        permission: "restricted",
        handler: (_event, input) => context.documentReviewService.decideReviewDocument(input)
      },
      {
        channel: documentReviewChannels.correctRejectedDocument,
        permission: "restricted",
        handler: (_event, input) => context.documentReviewService.correctRejectedDocument(input)
      },
      {
        channel: documentReviewChannels.getDecisionTrail,
        permission: "restricted",
        handler: (_event, documentId: string) => context.documentReviewService.getDecisionTrail(documentId)
      }
    ]
  };
}
