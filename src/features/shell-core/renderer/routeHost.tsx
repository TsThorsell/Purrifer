import type { SliceRouteHost } from "@app/registry/routeHostTypes";
import { JobsPage } from "./JobsPage";
import { LandingPage } from "./LandingPage";
import { SettingsPage } from "./SettingsPage";

export const sliceRouteHosts: SliceRouteHost[] = [
  {
    route: "landing",
    render: ({ onNavigate, onDrilldownDeviation }) => (
      <LandingPage onNavigate={onNavigate} onDrilldownDeviation={onDrilldownDeviation} />
    )
  },
  {
    route: "jobs",
    render: () => <JobsPage />
  },
  {
    route: "settings",
    render: () => <SettingsPage />
  }
];

