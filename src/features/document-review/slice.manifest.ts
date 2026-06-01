import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const documentReviewManifest: SliceManifest = {
  sliceId: "document-review",
  displayName: "Document Review",
  moduleDocPath: "src/features/document-review/MODULE.md",
  ownedAreas: [
    "document interpretation",
    "ocr and extraction review",
    "field region adjustment",
    "template persistence",
    "review decision routing",
    "decision audit trail"
  ],
  navigation: [{ route: "document-review", label: "Granskning", sliceId: "document-review" }]
};


