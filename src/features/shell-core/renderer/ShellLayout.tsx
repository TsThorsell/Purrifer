import type { PropsWithChildren } from "react";
import type { AppRouteKey } from "@app/registry/routes";
import type { AppNavigationTreeItem } from "@app/registry/slices";

interface ShellLayoutProps extends PropsWithChildren {
  activeRoute: AppRouteKey;
  navigation: AppNavigationTreeItem[];
  onNavigate: (route: AppRouteKey) => void;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function renderNavigationNodes({
  items,
  activeRoute,
  onNavigate,
  depth = 0
}: {
  items: AppNavigationTreeItem[];
  activeRoute: AppRouteKey;
  onNavigate: (route: AppRouteKey) => void;
  depth?: number;
}) {
  return items.map((item) => {
    const isActive = item.route === activeRoute;

    return (
      <div key={`${item.route}-${depth}`}>
        <button
          className={cx(
            "ui-shell-nav-item",
            isActive ? "ui-shell-nav-item--active" : false,
            item.permissions && item.permissions.length > 0 ? "ui-shell-nav-item--restricted" : false,
            `ui-shell-nav-item--depth-${depth}`
          )}
          type="button"
          onClick={() => onNavigate(item.route)}
          aria-label={`Navigera till ${item.title ?? item.label}`}
        >
          {item.icon ? <span className="ui-shell-nav-item__icon">{item.icon}</span> : null}
          <span className="ui-shell-nav-item__label">{item.title ?? item.label}</span>
          <span className="ui-shell-nav-item__marker" aria-hidden="true" />
        </button>

        {item.children.length > 0 ? (
          <div className="ui-shell-nav-children">
            {renderNavigationNodes({
              items: item.children,
              activeRoute,
              onNavigate,
              depth: depth + 1
            })}
          </div>
        ) : null}
      </div>
    );
  });
}

export function ShellLayout({ activeRoute, navigation, onNavigate, children }: ShellLayoutProps) {
  return (
    <div className="ui-shell">
      <aside className="ui-shell-sidebar">
        <div className="ui-shell-brand">
          <p className="ui-eyebrow">Purrifer</p>
          <h1>Ekonomisk kontrollpanel</h1>
          <p className="ui-muted">Lokal arbetsapp för dokument, verifikat, betalningar och uppföljning.</p>
        </div>

        <nav className="ui-shell-nav" aria-label="Huvudnavigation">
          {renderNavigationNodes({ items: navigation, activeRoute, onNavigate })}
        </nav>
      </aside>

      <main className="ui-shell-main">{children}</main>
    </div>
  );
}

