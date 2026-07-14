import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/physics-simulations" title="Physics simulations">
      <div className="admin-route">
        <SectionHeader title="Physics simulations" description="Future physics model registry placeholder." />
        <div className="admin-grid">
          <MetricCard label="Formulas" value="0" /><MetricCard label="Variables" value="0" /><MetricCard label="Graphs" value="0" /><MetricCard label="Experiments" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Physics simulations</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
