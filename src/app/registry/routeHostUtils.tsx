import type { AppRouteKey } from "./routes";
import type { SearchNavigationTarget } from "./routeHostTypes";
import { Panel } from "@renderer/components/Ui";

export type SearchHitBanner = (route: AppRouteKey) => JSX.Element | null;

export function getSearchHitBanner(searchTarget: SearchNavigationTarget | null): SearchHitBanner {
  return (route: AppRouteKey) => {
    if (searchTarget?.route !== route) {
      return null;
    }

    return (
      <Panel title="Aktiv sökträff">
        <p className="ui-muted">typ: {searchTarget.objectType} · id: {searchTarget.objectId}</p>
        {searchTarget.title ? <p>{searchTarget.title}</p> : null}
        {searchTarget.summary ? <small>{searchTarget.summary}</small> : null}
      </Panel>
    );
  };
}
