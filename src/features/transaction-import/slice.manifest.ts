import type { SliceManifest } from "@app/registry/slices";

export const transactionImportManifest: SliceManifest = {
  sliceId: "transaction-import",
  displayName: "Transaction Import",
  moduleDocPath: "src/features/transaction-import/MODULE.md",
  ownedAreas: ["transaktionsunderlag-import", "valideringspreview", "importbatch-lagring"],
  navigation: [
    {
      route: "transaction-import",
      label: "Import",
      sliceId: "transaction-import"
    }
  ]
};
