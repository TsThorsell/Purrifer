import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const voucherAndProofManifest: SliceManifest = {
  sliceId: "voucher-and-proof",
  displayName: "Voucher and Proof",
  moduleDocPath: "src/features/voucher-and-proof/MODULE.md",
  ownedAreas: [
    "voucher records",
    "verification status",
    "voucher detail views",
    "human-readable backup export"
  ],
  navigation: [
    { route: "vouchers", label: "Verifikat", sliceId: "voucher-and-proof" }
  ]
};


