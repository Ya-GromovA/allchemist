import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/biology-microscope-packs" title="Biology microscope packs">
      <div className="admin-route">
        <SectionHeader title="Biology microscope packs" description="Future sample and observation registry placeholder." />
        <div className="admin-grid">
          <MetricCard label="Samples" value="0" /><MetricCard label="Zoom" value="0" /><MetricCard label="Focus" value="0" /><MetricCard label="Labels" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Biology microscope packs</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
