import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/licenses-payments" title="Licenses and payments">
      <div className="admin-route">
        <SectionHeader title="Licenses and payments" description="Read-only monetization placeholder." />
        <div className="admin-grid">
          <MetricCard label="School licenses" value="0" /><MetricCard label="Subscriptions" value="0" /><MetricCard label="Payments" value="0" /><MetricCard label="Webhook health" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Licenses and payments</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
