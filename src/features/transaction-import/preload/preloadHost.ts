import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { transactionImportChannels } from "@features/transaction-import/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "transaction-import",
    namespace: "transactionImport",
    methods: [
      {
        method: "selectAndPreviewImportFile",
        channel: transactionImportChannels.selectAndPreviewImportFile,
        permission: "restricted"
      },
      {
        method: "listImportBatches",
        channel: transactionImportChannels.listImportBatches,
        permission: "public"
      },
      {
        method: "getImportBatch",
        channel: transactionImportChannels.getImportBatch,
        permission: "public"
      },
      {
        method: "getImportReview",
        channel: transactionImportChannels.getImportReview,
        permission: "public"
      },
      {
        method: "saveImportRowMapping",
        channel: transactionImportChannels.saveImportRowMapping,
        permission: "restricted"
      },
      {
        method: "commitImportBatch",
        channel: transactionImportChannels.commitImportBatch,
        permission: "restricted"
      },
      {
        method: "stopImportBatch",
        channel: transactionImportChannels.stopImportBatch,
        permission: "restricted"
      },
      {
        method: "resumeImportBatch",
        channel: transactionImportChannels.resumeImportBatch,
        permission: "restricted"
      }
    ]
  };
}
