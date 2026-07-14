import { SectionHeader, SubjectCard } from "@allchemist/ui";

export default function ModulesPage() {
  return (
    <main className="module-shell">
      <SectionHeader eyebrow="Modules" title="STEM modules" description="???????????????????????? ?????????????? ?????????????? ???????????????????? ??????????????." />
      <div className="module-grid">
        <SubjectCard subject="chemistry" title="Chemistry" description="Virtual chemistry lab, reaction packs, source-backed molecule views." meta="/modules/chemistry" />
        <SubjectCard subject="physics" title="Physics" description="Interactive simulations, formulas, parameters, graphs and experiments." meta="/modules/physics" />
        <SubjectCard subject="biology" title="Biology" description="Virtual microscope, cell viewer, anatomy and observation packs." meta="/modules/biology" />
      </div>
    </main>
  );
}
