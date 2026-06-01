import { useMemo, useState, type PropsWithChildren } from "react";
import type { AppRouteKey } from "@app/registry/routes";
import { appNavigationTree } from "@app/registry/slices";
import { routeHostDiscoveryIssues, resolveRouteHost } from "@app/registry/routeHosts";
import { Button, EmptyState, Page, PageHeader, Panel, StatusPill } from "@renderer/components/Ui";
import type { DeviationCaseSummary, SearchNavigationTarget } from "@app/registry/routeHostTypes";
import { shellHostDiscoveryIssues, resolveShellHost } from "@app/registry/shellHosts";

function routeHostDiagnostics(route: AppRouteKey): string[] {
  return routeHostDiscoveryIssues.filter((issue) => issue.route === route).map((issue) => issue.message);
}

function shellHostDiagnostics(): string[] {
  return shellHostDiscoveryIssues.map((issue) => `${issue.sliceId}: ${issue.message}`);
}

function FallbackShellHost({ children }: PropsWithChildren) {
  return <div className="ui-shell-fallback">{children}</div>;
}

function InvalidRouteFallback({
  route,
  onNavigate
}: {
  route: AppRouteKey;
  onNavigate: (route: AppRouteKey) => void;
}) {
  const messages = routeHostDiagnostics(route);
  const hasMessages = messages.length > 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Routing"
        title={`Route ${route} kunde inte öppnas`}
        description="Modulens render-host är inte tillgänglig."
      />
      <Panel title="Diagnostik" status={<StatusPill tone="danger">routing-fel</StatusPill>}>
        {hasMessages ? (
          <ul>
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <EmptyState>Ingen route-specifik diagnostik tillgänglig.</EmptyState>
        )}
      </Panel>
      <Panel title="Åtgärd">
        <Button tone="secondary" onClick={() => onNavigate("landing")}>
          Öppna landningsruta
        </Button>
      </Panel>
    </Page>
  );
}

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

  const activeRouteIssues = routeHostDiagnostics(activeRoute);
  const currentHost = resolveRouteHost(activeRoute);
  const shellHost = resolveShellHost();
  const shellIssues = shellHostDiagnostics();

  const page = useMemo(() => {
    if (!currentHost) {
      return <InvalidRouteFallback route={activeRoute} onNavigate={handleNavigate} />;
    }

    return currentHost.render({
      searchTarget,
      drilldownTarget,
      onNavigate: handleNavigate,
      onSearchTarget: handleSearchResultOpen,
      onDrilldownDeviation: handleDeviationDrilldown
    });
  }, [activeRoute, currentHost, drilldownTarget, searchTarget]);

  const shellContent = (
    <>
      {activeRouteIssues.length > 0 ? (
        <Panel title="Routing-varning" status={<StatusPill tone="warning">problem i registry</StatusPill>}>
          <ul>
            {activeRouteIssues.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {shellIssues.length > 0 ? (
        <Panel title="Shell-host-varning" status={<StatusPill tone="warning">problem i shell</StatusPill>}>
          <ul>
            {shellIssues.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {page}
    </>
  );

  return (
    shellHost?.renderShell({
      activeRoute,
      navigation: appNavigationTree,
      onNavigate: handleNavigate,
      children: shellContent
    }) ?? <FallbackShellHost>{shellContent}</FallbackShellHost>
  );
}
