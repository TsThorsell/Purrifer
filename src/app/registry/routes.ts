export type AppRouteKey =
  | "landing"
  | "search"
  | "reports-lite"
  | "retirement-baseline"
  | "transaction-import"
  | "bootstrap-intake"
  | "bootstrap-preprocess"
  | "bootstrap-stage"
  | "bootstrap-review"
  | "bootstrap-commit"
  | "bootstrap-audit"
  | "bootstrap-pilot-dashboard"
  | "holdings-and-events"
  | "document-inbox"
  | "document-review"
  | "entity-registry"
  | "invoice-and-payment"
  | "obligations-and-cases"
  | "vouchers"
  | "jobs"
  | "settings";

export interface AppNavigationItem {
  route: AppRouteKey;
  label: string;
  sliceId: string;
}

