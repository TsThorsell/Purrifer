import { BrowserWindow } from "electron";
import type { MainHostContext, MainSliceHost } from "@app/registry/mainHostTypes";
import { voucherAndProofChannels } from "@features/voucher-and-proof/contracts";
import type { VoucherRelationType } from "@features/voucher-and-proof/contracts";

export function createMainSliceHost(context: MainHostContext): MainSliceHost {
  return {
    sliceId: "voucher-and-proof",
    allowedChannels: Object.values(voucherAndProofChannels),
    handlers: [
      {
        channel: voucherAndProofChannels.listVouchers,
        permission: "public",
        handler: () => context.voucherAndProofService.listVouchers()
      },
      {
        channel: voucherAndProofChannels.getVoucher,
        permission: "public",
        handler: (_event, voucherId: string) => context.voucherAndProofService.getVoucher(voucherId)
      },
      {
        channel: voucherAndProofChannels.listVoucherCandidates,
        permission: "public",
        handler: () => context.voucherAndProofService.listVoucherCandidates()
      },
      {
        channel: voucherAndProofChannels.listVoucherRelations,
        permission: "public",
        handler: (_event, voucherId: string) =>
          context.voucherAndProofService.listVoucherRelations(voucherId)
      },
      {
        channel: voucherAndProofChannels.linkVoucherToDocument,
        permission: "restricted",
        handler: (
          _event,
          voucherId: string,
          documentId: string,
          relationType?: VoucherRelationType
        ) => context.voucherAndProofService.linkVoucherToDocument(voucherId, documentId, relationType)
      },
      {
        channel: voucherAndProofChannels.getVoucherStatusHistory,
        permission: "public",
        handler: (_event, voucherId: string) =>
          context.voucherAndProofService.getVoucherStatusHistory(voucherId)
      },
      {
        channel: voucherAndProofChannels.getVoucherProofChain,
        permission: "public",
        handler: (_event, voucherId: string) =>
          context.voucherAndProofService.getVoucherProofChain(voucherId)
      },
      {
        channel: voucherAndProofChannels.createVoucherFromDocument,
        permission: "restricted",
        handler: (_event, documentId: string) => context.voucherAndProofService.createVoucherFromDocument(documentId)
      },
      {
        channel: voucherAndProofChannels.setVoucherVerificationStatus,
        permission: "restricted",
        handler: (_event, voucherId: string, status) =>
          context.voucherAndProofService.setVoucherVerificationStatus(voucherId, status)
      },
      {
        channel: voucherAndProofChannels.exportVoucherBackup,
        permission: "restricted",
        requiresWindow: true,
        handler: (event, voucherId: string) => {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error("Ingen aktiv applikationsruta hittades för backup-export.");
          }
          return context.voucherAndProofService.exportVoucherBackup(voucherId, window);
        }
      },
      {
        channel: voucherAndProofChannels.openVoucherSourceDocument,
        permission: "restricted",
        handler: (_event, voucherId: string) => context.voucherAndProofService.openVoucherSourceDocument(voucherId)
      }
    ]
  };
}
