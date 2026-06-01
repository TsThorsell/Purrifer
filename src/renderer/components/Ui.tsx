import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
type ButtonTone = "primary" | "secondary";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

interface PanelProps extends PropsWithChildren {
  title?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

interface StatusPillProps extends PropsWithChildren {
  tone?: StatusTone;
  className?: string;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
}

interface FieldProps extends PropsWithChildren {
  label: ReactNode;
  className?: string;
}

export function Page({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <section {...rest} className={cx("ui-page", className)}>
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__copy">
        {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="ui-muted">{description}</p> : null}
      </div>
      {actions ? <div className="ui-header-actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, subtitle, status, actions, className, children }: PanelProps) {
  const hasHeader = title || subtitle || status || actions;

  return (
    <article className={cx("ui-card", className)}>
      {hasHeader ? (
        <div className="ui-card__header">
          <div className="ui-card__title-block">
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="ui-muted">{subtitle}</p> : null}
          </div>
          {status || actions ? (
            <div className="ui-card__meta">
              {status}
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}

export function Stack({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...rest} className={cx("ui-stack", className)}>
      {children}
    </div>
  );
}

export function SplitLayout({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <section {...rest} className={cx("ui-split-layout", className)}>
      {children}
    </section>
  );
}

export function StatusPill({ tone = "neutral", className, children }: StatusPillProps) {
  return <span className={cx("ui-pill", `ui-pill--${tone}`, className)}>{children}</span>;
}

export function Button({ tone = "primary", className, type = "button", ...rest }: ButtonProps) {
  return <button {...rest} type={type} className={cx("ui-button", `ui-button--${tone}`, className)} />;
}

export function EmptyState({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...rest} className={cx("ui-empty-state", className)}>
      {children}
    </div>
  );
}

export function FieldGrid({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...rest} className={cx("ui-field-grid", className)}>
      {children}
    </div>
  );
}

export function Field({ label, className, children }: FieldProps) {
  return (
    <div className={cx("ui-field", className)}>
      <p className="ui-field-label">{label}</p>
      {children}
    </div>
  );
}

export function Actions({ children, className, ...rest }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...rest} className={cx("ui-actions", className)}>
      {children}
    </div>
  );
}

