import type { SliceManifest } from "@app/registry/sliceManifestTypes";

export const documentInboxManifest: SliceManifest = {
  sliceId: "document-inbox",
  displayName: "Document Inbox",
  moduleDocPath: "src/features/document-inbox/MODULE.md",
  ownedAreas: [
    "document intake",
    "unclassified inbox",
    "file import",
    "paste intake",
    "stored source documents"
  ],
  navigation: [
    { route: "document-inbox", label: "Inkorg", sliceId: "document-inbox" }
  ]
};


