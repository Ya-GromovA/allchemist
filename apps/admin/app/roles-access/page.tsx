import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/roles-access" title="Roles and access">
      <div className="admin-route">
        <SectionHeader title="Roles and access" description="Scope matrix and feature gates placeholder." />
        <div className="admin-grid">
          <MetricCard label="Roles" value="0" /><MetricCard label="Scopes" value="0" /><MetricCard label="Overrides" value="0" /><MetricCard label="Capabilities" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Roles and access</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
