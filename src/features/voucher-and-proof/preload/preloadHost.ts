import type { PreloadHostContext, PreloadSliceHost } from "@app/registry/preloadHostTypes";
import { voucherAndProofChannels } from "@features/voucher-and-proof/contracts";

export function createPreloadSliceHost(_context: PreloadHostContext): PreloadSliceHost {
  return {
    sliceId: "voucher-and-proof",
    namespace: "voucherAndProof",
    methods: [
      {
        method: "listVouchers",
        channel: voucherAndProofChannels.listVouchers,
        permission: "public"
      },
      {
        method: "getVoucher",
        channel: voucherAndProofChannels.getVoucher,
        permission: "public"
      },
      {
        method: "listVoucherCandidates",
        channel: voucherAndProofChannels.listVoucherCandidates,
        permission: "public"
      },
      {
        method: "listVoucherRelations",
        channel: voucherAndProofChannels.listVoucherRelations,
        permission: "public"
      },
      {
        method: "linkVoucherToDocument",
        channel: voucherAndProofChannels.linkVoucherToDocument,
        permission: "restricted"
      },
      {
        method: "getVoucherStatusHistory",
        channel: voucherAndProofChannels.getVoucherStatusHistory,
        permission: "public"
      },
      {
        method: "getVoucherProofChain",
        channel: voucherAndProofChannels.getVoucherProofChain,
        permission: "public"
      },
      {
        method: "createVoucherFromDocument",
        channel: voucherAndProofChannels.createVoucherFromDocument,
        permission: "restricted"
      },
      {
        method: "setVoucherVerificationStatus",
        channel: voucherAndProofChannels.setVoucherVerificationStatus,
        permission: "restricted"
      },
      {
        method: "exportVoucherBackup",
        channel: voucherAndProofChannels.exportVoucherBackup,
        permission: "restricted"
      },
      {
        method: "openVoucherSourceDocument",
        channel: voucherAndProofChannels.openVoucherSourceDocument,
        permission: "restricted"
      }
    ]
  };
}
