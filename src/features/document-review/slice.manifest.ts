import type { SliceManifest } from "@app/registry/slices";

export const documentReviewManifest: SliceManifest = {
  sliceId: "document-review",
  displayName: "Document Review",
  moduleDocPath: "src/features/document-review/MODULE.md",
  ownedAreas: [
    "document interpretation",
    "ocr and extraction review",
    "field region adjustment",
    "template persistence"
  ],
  navigation: [{ route: "document-review", label: "Granskning", sliceId: "document-review" }]
};

