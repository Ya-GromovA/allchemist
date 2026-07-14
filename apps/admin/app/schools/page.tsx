import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/schools" title="Schools">
      <div className="admin-route">
        <SectionHeader title="Schools" description="School/license management shell. No destructive actions connected." />
        <div className="admin-grid">
          <MetricCard label="School registry" value="0" /><MetricCard label="Classes" value="0" /><MetricCard label="Invites" value="0" /><MetricCard label="License scope" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Schools</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
