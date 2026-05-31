import type { SliceManifest } from "@app/registry/slices";

export const invoiceAndPaymentManifest: SliceManifest = {
  sliceId: "invoice-and-payment",
  displayName: "Invoice and Payment",
  moduleDocPath: "src/features/invoice-and-payment/MODULE.md",
  ownedAreas: ["supplier invoices", "payment events", "payment matching"],
  navigation: [
    {
      route: "invoice-and-payment",
      label: "Fakturor",
      sliceId: "invoice-and-payment"
    }
  ]
};

