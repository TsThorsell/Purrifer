import type { AppNavigationItem } from "./routes";

export interface SliceManifest {
  sliceId: string;
  displayName: string;
  moduleDocPath: string;
  ownedAreas: string[];
  navigation: AppNavigationItem[];
  schemaVersion?: string;
}

export interface AppNavigationTreeItem extends AppNavigationItem {
  children: AppNavigationTreeItem[];
}
