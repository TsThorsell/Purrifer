import type { PropsWithChildren } from "react";
import type { AppNavigationItem, AppRouteKey } from "@app/registry/routes";

interface ShellLayoutProps extends PropsWithChildren {
  activeRoute: AppRouteKey;
  navigation: AppNavigationItem[];
  onNavigate: (route: AppRouteKey) => void;
}

export function ShellLayout({
  activeRoute,
  navigation,
  onNavigate,
  children
}: ShellLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Purrifer</p>
          <h1>Ekonomisk kontrollpanel</h1>
          <p className="muted">
            Lokal arbetsapp för dokument, verifikat, betalningar och uppföljning.
          </p>
        </div>

        <nav className="nav-list" aria-label="Huvudnavigation">
          {navigation.map((item) => {
            const isActive = item.route === activeRoute;
            return (
              <button
                key={item.route}
                className={isActive ? "nav-item active" : "nav-item"}
                type="button"
                onClick={() => onNavigate(item.route)}
              >
                <span>{item.label}</span>
                <small>{item.sliceId}</small>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
