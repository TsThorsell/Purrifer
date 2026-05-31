import { SearchAndIndexRepository } from "./SearchAndIndexRepository";
import type { RebuildSearchIndexResult, SearchResultItem } from "../contracts";

export class SearchAndIndexService {
  constructor(private readonly repository: SearchAndIndexRepository) {}

  async searchAll(query: string): Promise<SearchResultItem[]> {
    return this.repository.searchByQuery(query);
  }

  async rebuildSearchIndex(): Promise<RebuildSearchIndexResult> {
    const indexedAt = new Date().toISOString();
    const indexedCount = await this.repository.rebuildIndex(indexedAt);
    return {
      indexedAt,
      indexedCount
    };
  }
}
