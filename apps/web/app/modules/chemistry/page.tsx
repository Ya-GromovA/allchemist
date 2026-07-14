import { Badge, Card, SectionHeader } from "@allchemist/ui";

export default function Page() {
  return (
    <main className="module-shell">
      <SectionHeader eyebrow="chemistry" title="Chemistry module foundation" description="Reaction packs, periodic table, source-backed visual metadata and configurable lab engine previews." />
      <div className="module-grid">
        <Card>
          <Badge tone="info">Interactive draft</Badge>
          <h3>Zn + HCl laboratory</h3>
          <p>Configurable lab scenario with safety gate, reagent actions, observations and AI hint states.</p>
          <p>
            <a href="/modules/chemistry/lab/zinc-hcl">Открыть лабораторию {"->"}</a>
          </p>
        </Card>
        <Card>
          <Badge tone="warning">Needs review</Badge>
          <h3>Verification gate</h3>
          <p>Safety and educational content remain draft until source and methodist review is complete.</p>
        </Card>
      </div>
    </main>
  );
}
