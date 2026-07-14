import type { CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { RoleAccent, SubjectTheme } from "@allchemist/design-tokens";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type Size = "sm" | "md" | "lg";
type AssistantState = "idle" | "blink" | "wink" | "smile" | "thinking" | "hint" | "warning" | "success" | "typing" | "chatOpen";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: Size;
}

export function Button({ className = "", variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card ${className}`.trim()} {...props} />;
}

export function Panel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`ui-panel ${className}`.trim()} {...props} />;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function StatusPill({ status, tone = "neutral" }: { status: string; tone?: Tone }) {
  return <span className={`ui-status ui-status--${tone}`}>{status}</span>;
}

export function MetricCard({ label, value, delta, tone = "info" }: { label: string; value: string | number; delta?: string; tone?: Tone }) {
  return (
    <Card className="ui-metric">
      <span className="ui-metric__label">{label}</span>
      <strong>{value}</strong>
      {delta ? <span className={`ui-metric__delta ui-metric__delta--${tone}`}>{delta}</span> : null}
    </Card>
  );
}

export function SubjectCard({ subject, title, description, meta }: { subject: SubjectTheme; title: string; description: string; meta?: string }) {
  return (
    <Card className={`ui-subject ui-subject--${subject}`}>
      <span className="ui-subject__mark" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {meta ? <small>{meta}</small> : null}
      </div>
    </Card>
  );
}

export function AppShell({ sidebar, topbar, children }: { sidebar?: ReactNode; topbar?: ReactNode; children: ReactNode }) {
  return (
    <div className="ui-shell">
      {sidebar ? <aside className="ui-shell__sidebar">{sidebar}</aside> : null}
      <div className="ui-shell__main">
        {topbar ? <header className="ui-shell__topbar">{topbar}</header> : null}
        <main className="ui-shell__content">{children}</main>
      </div>
    </div>
  );
}

export function Sidebar({ title, items }: { title: string; items: Array<{ href: string; label: string; active?: boolean }> }) {
  return (
    <nav className="ui-sidebar" aria-label={title}>
      <strong>{title}</strong>
      {items.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={item.active ? "is-active" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="ui-topbar">
      <h1>{title}</h1>
      <div>{actions}</div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="ui-state"><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <div className="ui-state" aria-live="polite">{label}</div>;
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description?: string }) {
  return <div className="ui-state ui-state--error" role="alert"><strong>{title}</strong>{description ? <p>{description}</p> : null}</div>;
}

export function FeatureLockedCard({ title, description }: { title: string; description: string }) {
  return <Card className="ui-locked"><Badge tone="warning">Locked</Badge><h3>{title}</h3><p>{description}</p></Card>;
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return <div className="ui-ring" style={{ "--value": `${clamped}%` } as CSSProperties} aria-label={`${label}: ${clamped}%`}><span>{clamped}%</span><small>{label}</small></div>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress" aria-label={label ? `${label}: ${clamped}%` : `${clamped}%`}>
      <span style={{ "--value": `${clamped}%` } as CSSProperties} />
      {label ? <small>{label}</small> : null}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <header className="ui-section">{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}</header>;
}

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
}

export function DataTable<Row>({ columns, rows, getRowKey, emptyLabel = "No data" }: { columns: DataTableColumn<Row>[]; rows: Row[]; getRowKey: (row: Row, index: number) => string; emptyLabel?: string }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length || 1}>{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, title, children, footer, onClose }: { open: boolean; title: string; children: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  if (!open) return null;
  return (
    <div className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-modal__panel">
        <header>
          <h2>{title}</h2>
          {onClose ? <button className="ui-icon-button" type="button" onClick={onClose} aria-label="Close">x</button> : null}
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Tabs({ items, activeId, onSelect }: { items: Array<{ id: string; label: string }>; activeId: string; onSelect?: (id: string) => void }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          className={item.id === activeId ? "is-active" : undefined}
          onClick={() => onSelect?.(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="ui-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-control ${props.className ?? ""}`.trim()} {...props} />;
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-control ${props.className ?? ""}`.trim()} {...props} />;
}

export function TextareaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-control ${props.className ?? ""}`.trim()} {...props} />;
}

export interface ChatMessage {
  id: string;
  author: "assistant" | "user" | "system";
  body: ReactNode;
}

export function ChatThread({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="ui-chat" aria-live="polite">
      {messages.map((message) => (
        <article key={message.id} className={`ui-chat__message ui-chat__message--${message.author}`}>
          {message.body}
        </article>
      ))}
    </div>
  );
}

export function ChatComposer({ value, placeholder = "Ask a question", onChange, onSubmit }: { value: string; placeholder?: string; onChange: (value: string) => void; onSubmit?: () => void }) {
  return (
    <div className="ui-chat-composer">
      <TextInput value={value} placeholder={placeholder} onChange={(event) => onChange(event.currentTarget.value)} />
      <Button type="button" size="sm" onClick={onSubmit}>Send</Button>
    </div>
  );
}

export function AiAssistantVisual({ state = "idle", label = "AI assistant" }: { state?: AssistantState; label?: string }) {
  return (
    <div className={`ui-assistant ui-assistant--${state}`} aria-label={`${label}: ${state}`}>
      <span className="ui-assistant__face" aria-hidden="true" />
      <span className="ui-assistant__dot" aria-hidden="true" />
    </div>
  );
}

export function AiAssistantPanel({ state = "idle", title = "AI assistant", children }: { state?: AssistantState; title?: string; children?: ReactNode }) {
  return (
    <aside className={`ui-assistant-panel ui-assistant-panel--${state}`}>
      <AiAssistantVisual state={state} />
      <div>
        <strong>{title}</strong>
        {children ? <div className="ui-assistant-panel__body">{children}</div> : null}
      </div>
    </aside>
  );
}

export function roleAccentClass(role: RoleAccent) {
  return `ui-role--${role}`;
}
