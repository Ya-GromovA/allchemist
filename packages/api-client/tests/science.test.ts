import type { Molecule, Reaction } from "../src";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function testMoleculeReactionFixtureShapes() {
  const molecule: Molecule = { id: "water", name: "????????", formula: "H2O", atoms: [{ el: "O" }] };
  const reaction: Reaction = { id: "r1", equation: "HCl + NaOH -> NaCl + H2O", reactants: [], products: [] };
  assert(molecule.formula === "H2O", "molecule fixture typed");
  assert(reaction.products.length === 0, "reaction fixture typed");
}
