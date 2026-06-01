import type { AppRouteKey } from "./routes";

export interface SearchNavigationTarget {
  route: AppRouteKey;
  objectType: string;
  objectId: string;
  title?: string;
  summary?: string;
}

export interface DeviationCaseSummary {
  caseId: string;
  obligationId?: string;
  rule: string;
  sourceType: string;
  sourceId: string;
  status: string;
  detectedAt?: string;
  updatedAt?: string;
}

export interface RouteRenderContext {
  searchTarget: SearchNavigationTarget | null;
  drilldownTarget: DeviationCaseSummary | null;
  onNavigate: (route: AppRouteKey) => void;
  onSearchTarget: (target: SearchNavigationTarget) => void;
  onDrilldownDeviation: (item: DeviationCaseSummary) => void;
}

export interface SliceRouteHost {
  route: AppRouteKey;
  render: (context: RouteRenderContext) => JSX.Element;
}
