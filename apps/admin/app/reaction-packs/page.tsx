import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/reaction-packs" title="Reaction packs">
      <div className="admin-route">
        <SectionHeader title="Reaction packs" description="Chemistry reaction pack readiness placeholder." />
        <div className="admin-grid">
          <MetricCard label="Source-backed" value="0" /><MetricCard label="Verified" value="0" /><MetricCard label="Safety" value="0" /><MetricCard label="Visual metadata" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Reaction packs</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
