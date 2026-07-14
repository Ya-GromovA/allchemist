import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/dashboard" title="Admin dashboard">
      <div className="admin-route">
        <SectionHeader title="Admin dashboard" description="Read-only operational overview placeholder." />
        <div className="admin-grid">
          <MetricCard label="Schools" value="0" /><MetricCard label="Users" value="0" /><MetricCard label="Licenses" value="0" /><MetricCard label="Content QA" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Admin dashboard</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
