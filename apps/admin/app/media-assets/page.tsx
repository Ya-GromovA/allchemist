import { Badge, Card, MetricCard, SectionHeader, StatusPill } from "@allchemist/ui";
import { AdminShell } from "../admin-shell";

export default function Page() {
  return (
    <AdminShell active="/media-assets" title="Media assets">
      <div className="admin-route">
        <SectionHeader title="Media assets" description="Future asset registry placeholder; no Rive/Lottie/3D runtime loaded." />
        <div className="admin-grid">
          <MetricCard label="Images" value="0" /><MetricCard label="SVG" value="0" /><MetricCard label="GLB/gltf" value="0" /><MetricCard label="Processing" value="0" />
        </div>
        <Card>
          <Badge tone="info">Read-only foundation</Badge>
          <h3>Contract-first placeholder</h3>
          <p>This route is ready for typed adapters from packages/api-client. Destructive actions are intentionally absent.</p>
          <StatusPill status="Non-production" tone="warning" />
        </Card>
        <table className="admin-table">
          <thead><tr><th>Area</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody><tr><td>Media assets</td><td>Placeholder</td><td>Raw backend contracts require defensive adapters</td></tr></tbody>
        </table>
      </div>
    </AdminShell>
  );
}
