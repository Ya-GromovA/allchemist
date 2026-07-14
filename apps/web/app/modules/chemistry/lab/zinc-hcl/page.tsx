import { ChemistryLabScreen } from "../../../../../components/chemistry-lab/ChemistryLabScreen";
import { chemistryLabZincHclDemo } from "../../../../../lib/demo/chemistry-lab-zinc-hcl";

export default function Page() {
  return <ChemistryLabScreen scenario={chemistryLabZincHclDemo.scenario} />;
}
