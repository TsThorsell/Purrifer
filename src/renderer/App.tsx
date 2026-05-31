import { useMemo, useState } from "react";
import { appNavigation } from "@app/registry/slices";
import type { AppRouteKey } from "@app/registry/routes";
import { BootstrapIntakePage } from "@features/bootstrap-intake/renderer/BootstrapIntakePage";
import { BootstrapCommitPage } from "@features/bootstrap-commit/renderer/BootstrapCommitPage";
import { BootstrapPreprocessPage } from "@features/bootstrap-preprocess/renderer/BootstrapPreprocessPage";
import { BootstrapReviewPage } from "@features/bootstrap-review/renderer/BootstrapReviewPage";
import { BootstrapStagePage } from "@features/bootstrap-stage/renderer/BootstrapStagePage";
import { BootstrapAuditPage } from "@features/bootstrap-audit/renderer/BootstrapAuditPage";
import { BootstrapPilotDashboardPage } from "@features/bootstrap-pilot-dashboard/renderer/BootstrapPilotDashboardPage";
import { DocumentInboxPage } from "@features/document-inbox/renderer/DocumentInboxPage";
import { DocumentReviewPage } from "@features/document-review/renderer/DocumentReviewPage";
import { EntityRegistryPage } from "@features/entity-registry/renderer/EntityRegistryPage";
import { HoldingsAndEventsPage } from "@features/holdings-and-events/renderer/HoldingsAndEventsPage";
import { InvoiceAndPaymentPage } from "@features/invoice-and-payment/renderer/InvoiceAndPaymentPage";
import type { DeviationCaseSummary } from "@features/obligations-and-cases/contracts";
import { ObligationsAndCasesPage } from "@features/obligations-and-cases/renderer/ObligationsAndCasesPage";
import { ReportsLitePage } from "@features/reports-lite/renderer/ReportsLitePage";
import { RetirementBaselinePage } from "@features/retirement-baseline/renderer/RetirementBaselinePage";
import type { SearchNavigationTarget } from "@features/search-and-index/contracts";
import { SearchAndIndexPage } from "@features/search-and-index/renderer/SearchAndIndexPage";
import { LandingPage } from "@features/shell-core/renderer/LandingPage";
import { JobsPage } from "@features/shell-core/renderer/JobsPage";
import { SettingsPage } from "@features/shell-core/renderer/SettingsPage";
import { ShellLayout } from "@features/shell-core/renderer/ShellLayout";
import { TransactionImportPage } from "@features/transaction-import/renderer/TransactionImportPage";
import { VoucherAndProofPage } from "@features/voucher-and-proof/renderer/VoucherAndProofPage";

export function App() {
  const [activeRoute, setActiveRoute] = useState<AppRouteKey>("landing");
  const [drilldownTarget, setDrilldownTarget] = useState<DeviationCaseSummary | null>(null);
  const [searchTarget, setSearchTarget] = useState<SearchNavigationTarget | null>(null);

  function handleNavigate(route: AppRouteKey) {
    setActiveRoute(route);
    if (route !== "obligations-and-cases") {
      setDrilldownTarget(null);
    }
    if (route !== "search") {
      setSearchTarget(null);
    }
  }

  function handleDeviationDrilldown(item: DeviationCaseSummary) {
    setDrilldownTarget(item);
    setActiveRoute("obligations-and-cases");
  }

  function handleSearchResultOpen(target: SearchNavigationTarget) {
    setSearchTarget(target);
    setActiveRoute(target.route);
  }

  function activeSearchHitBanner(route: AppRouteKey) {
    if (searchTarget?.route !== route) {
      return null;
    }

    return (
      <section className="panel-card">
        <h3>Aktiv soktraff</h3>
        <p className="muted">
          typ: {searchTarget.objectType} · id: {searchTarget.objectId}
        </p>
        {searchTarget.title ? <p>{searchTarget.title}</p> : null}
        {searchTarget.summary ? <small>{searchTarget.summary}</small> : null}
      </section>
    );
  }

  const page = useMemo(() => {
    switch (activeRoute) {
      case "document-inbox":
        return (
          <>
            {activeSearchHitBanner("document-inbox")}
            <DocumentInboxPage />
          </>
        );
      case "document-review":
        return <DocumentReviewPage />;
      case "entity-registry":
        return <EntityRegistryPage />;
      case "holdings-and-events":
        return <HoldingsAndEventsPage />;
      case "transaction-import":
        return <TransactionImportPage />;
      case "bootstrap-intake":
        return <BootstrapIntakePage />;
      case "bootstrap-preprocess":
        return <BootstrapPreprocessPage />;
      case "bootstrap-stage":
        return <BootstrapStagePage />;
      case "bootstrap-review":
        return <BootstrapReviewPage />;
      case "bootstrap-commit":
        return <BootstrapCommitPage />;
      case "bootstrap-audit":
        return <BootstrapAuditPage />;
      case "bootstrap-pilot-dashboard":
        return <BootstrapPilotDashboardPage />;
      case "invoice-and-payment":
        return (
          <>
            {activeSearchHitBanner("invoice-and-payment")}
            <InvoiceAndPaymentPage />
          </>
        );
      case "obligations-and-cases":
        return (
          <>
            {activeSearchHitBanner("obligations-and-cases")}
            {drilldownTarget ? (
              <section className="panel-card">
                <h3>Drilldown fran landningsyta</h3>
                <p className="muted">
                  Regel: {drilldownTarget.rule} · case: {drilldownTarget.caseId} · kalla: {" "}
                  {drilldownTarget.sourceType}/{drilldownTarget.sourceId}
                </p>
                <small>Malobjekt: {drilldownTarget.obligationId ?? drilldownTarget.sourceId}</small>
              </section>
            ) : null}
            <ObligationsAndCasesPage />
          </>
        );
      case "vouchers":
        return (
          <>
            {activeSearchHitBanner("vouchers")}
            <VoucherAndProofPage />
          </>
        );
      case "search":
        return <SearchAndIndexPage onOpenTarget={handleSearchResultOpen} />;
      case "reports-lite":
        return <ReportsLitePage onDrilldown={handleSearchResultOpen} />;
      case "retirement-baseline":
        return <RetirementBaselinePage />;
      case "jobs":
        return <JobsPage />;
      case "settings":
        return <SettingsPage />;
      case "landing":
      default:
        return <LandingPage onNavigate={handleNavigate} onDrilldownDeviation={handleDeviationDrilldown} />;
    }
  }, [activeRoute, drilldownTarget, searchTarget]);

  return (
    <ShellLayout activeRoute={activeRoute} navigation={appNavigation} onNavigate={handleNavigate}>
      {page}
    </ShellLayout>
  );
}
