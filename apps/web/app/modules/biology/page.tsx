import { Badge, Card, SectionHeader } from "@allchemist/ui";

export default function Page() {
  return (
    <main className="module-shell">
      <SectionHeader eyebrow="biology" title="Biology module foundation" description="Microscope samples, cell structures, anatomy models and future observation packs." />
      <div className="module-grid">
        <Card><Badge tone="info">Placeholder</Badge><h3>Data contracts first</h3><p>No heavy runtime is loaded in this foundation step.</p></Card>
        <Card><Badge tone="warning">Future</Badge><h3>Verification gate</h3><p>Scientific visuals require source and verification metadata before rendering.</p></Card>
      </div>
    </main>
  );
}
