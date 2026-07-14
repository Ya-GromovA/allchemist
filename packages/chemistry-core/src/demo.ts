import type { Reaction, Substance } from "./types";

export const zincHydrochloricAcidSubstances: Substance[] = [
  { id: "zn", nameRu: "Zinc", formula: "Zn", state: "solid", hazardKinds: ["none"], sourceIds: ["demo_source_general_chemistry"] },
  { id: "hcl", nameRu: "Hydrochloric acid", formula: "HCl", state: "aqueous", hazardKinds: ["acid", "corrosive"], sourceIds: ["demo_source_general_chemistry"] },
  { id: "zncl2", nameRu: "Zinc chloride", formula: "ZnCl2", state: "aqueous", hazardKinds: ["irritant"], sourceIds: ["demo_source_general_chemistry"] },
  { id: "h2", nameRu: "Hydrogen", formula: "H2", state: "gas", hazardKinds: ["flammable", "gas"], sourceIds: ["demo_source_general_chemistry"] },
];

export const zincHydrochloricAcidReaction: Reaction = {
  id: "rxn_zn_hcl_hydrogen_demo",
  titleRu: "Zinc and hydrochloric acid",
  equation: {
    raw: "Zn + 2HCl -> ZnCl2 + H2",
    reactants: [
      { formula: "Zn", coefficient: 1 },
      { formula: "HCl", coefficient: 2 },
    ],
    products: [
      { formula: "ZnCl2", coefficient: 1 },
      { formula: "H2", coefficient: 1 },
    ],
  },
  reagents: [
    { substanceId: "zn", amount: { value: 1, unit: "g" } },
    { substanceId: "hcl", amount: { value: 10, unit: "ml" }, concentration: { value: 1, unit: "M" } },
  ],
  products: ["zncl2", "h2"],
  hazards: ["acid", "corrosive", "flammable", "gas"],
  observations: [
    { kind: "gas_bubbles", labelRu: "Gas bubbles appear.", verified: false },
    { kind: "temperature_rise", labelRu: "Mixture warms slightly.", verified: false },
    { kind: "ph_change", labelRu: "Acidic environment remains during the reaction.", verified: false },
  ],
  sourceIds: ["demo_source_general_chemistry"],
  verificationStatus: "draft",
};
