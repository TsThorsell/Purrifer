import type { AppNavigationItem } from "@app/registry/routes";

export type SearchObjectType =
  | "document"
  | "voucher"
  | "supplier-invoice"
  | "payment-event"
  | "obligation"
  | "case";

export interface SearchResultItem {
  objectType: SearchObjectType;
  objectId: string;
  title: string;
  summary: string;
  matchedText: string;
  sortDate?: string;
  targetRoute:
    | "document-inbox"
    | "vouchers"
    | "invoice-and-payment"
    | "obligations-and-cases";
}

export interface RebuildSearchIndexResult {
  indexedAt: string;
  indexedCount: number;
}

export interface SearchAndIndexApi {
  searchAll(query: string): Promise<SearchResultItem[]>;
  rebuildSearchIndex(): Promise<RebuildSearchIndexResult>;
}

export const searchAndIndexChannels = {
  searchAll: "search-and-index:search-all",
  rebuildSearchIndex: "search-and-index:rebuild-index"
} as const;

export interface SearchNavigationTarget {
  route: AppNavigationItem["route"];
  objectType: SearchObjectType;
  objectId: string;
  title?: string;
  summary?: string;
}
