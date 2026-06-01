import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { getSearchHitBanner } from "@app/registry/routeHostUtils";
import { ObligationsAndCasesPage } from "./ObligationsAndCasesPage";
import { Panel } from "@renderer/components/Ui";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "obligations-and-cases",
    render: ({ drilldownTarget, searchTarget }) => {
      const activeSearchHitBanner = getSearchHitBanner(searchTarget);
      const openCaseId = searchTarget?.route === "obligations-and-cases" && searchTarget.objectType === "case"
        ? searchTarget.objectId
        : undefined;
      const openObligationId = searchTarget?.route === "obligations-and-cases" &&
        searchTarget.objectType === "obligation"
        ? searchTarget.objectId
        : undefined;
      return (
        <>
          {activeSearchHitBanner("obligations-and-cases")}
          {drilldownTarget ? (
            <Panel title="Drilldown från landningsyta">
              <p className="ui-muted">
                Regel: {drilldownTarget.rule} · case: {drilldownTarget.caseId} · källa:{" "}
                {drilldownTarget.sourceType}/{drilldownTarget.sourceId}
              </p>
              <small>Målobjekt: {drilldownTarget.obligationId ?? drilldownTarget.sourceId}</small>
            </Panel>
          ) : null}
          <ObligationsAndCasesPage
            initialCaseId={openCaseId}
            initialObligationId={openObligationId}
          />
        </>
      );
    }
  }
];
