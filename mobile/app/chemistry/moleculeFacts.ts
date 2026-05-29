export type MoleculeFacts = {
  description: string;
  uses: string[];
  reactsWith: string[];
  incompatibleWith: string[];
  source: string[];
};

export const MOLECULE_FACTS_BY_FORMULA: Record<string, MoleculeFacts> = {
  H2O: {
    description: "Вода, оксид водорода. Полярный растворитель.",
    uses: ["растворитель", "охлаждение", "теплоноситель"],
    reactsWith: ["щелочные металлы (Na, K)", "оксиды кислотных ангидридов"],
    incompatibleWith: ["натрий и калий в больших количествах", "карбид кальция"],
    source: ["PubChem CID 962", "NIST Chemistry WebBook"],
  },
  CO2: {
    description: "Углекислый газ, кислотный оксид.",
    uses: ["газирование напитков", "огнетушители", "защитная атмосфера"],
    reactsWith: ["щелочи (NaOH, KOH)", "вода (образует H2CO3)"],
    incompatibleWith: ["сильные восстановители при нагреве"],
    source: ["PubChem CID 280", "NIOSH Pocket Guide"],
  },
  CH4: {
    description: "Метан, основной компонент природного газа.",
    uses: ["топливо", "сырье для синтеза водорода и метанола"],
    reactsWith: ["кислород (горение)", "хлор при УФ-облучении"],
    incompatibleWith: ["окислители", "источники воспламенения"],
    source: ["PubChem CID 297", "NIOSH Pocket Guide"],
  },
  C2H6: {
    description: "Этан, насыщенный углеводород (алкан).",
    uses: ["сырье для получения этилена", "топливный газ"],
    reactsWith: ["кислород (горение)", "галогены при УФ"],
    incompatibleWith: ["окислители", "открытое пламя"],
    source: ["PubChem CID 6324", "NIOSH Pocket Guide"],
  },
  O2: {
    description: "Кислород, сильный окислитель.",
    uses: ["медицина", "металлургия", "сварка"],
    reactsWith: ["горючие вещества", "металлы при нагреве"],
    incompatibleWith: ["масла и жиры под давлением", "горючие газы"],
    source: ["PubChem CID 977", "NIOSH Pocket Guide"],
  },
  N2: {
    description: "Азот, инертный двухатомный газ при нормальных условиях.",
    uses: ["инертная атмосфера", "криогеника (жидкий азот)"],
    reactsWith: ["водород при высоком давлении и катализаторе (синтез NH3)"],
    incompatibleWith: ["нет выраженной химической несовместимости при Н.У."],
    source: ["PubChem CID 947", "NIST Chemistry WebBook"],
  },
  NH3: {
    description: "Аммиак, основание Льюиса, токсичный газ с резким запахом.",
    uses: ["удобрения", "хладагент", "химсинтез"],
    reactsWith: ["кислоты", "галогены", "окислители"],
    incompatibleWith: ["хлорсодержащие окислители", "кислоты без контроля"],
    source: ["PubChem CID 222", "NIOSH Pocket Guide"],
  },
  HCl: {
    description: "Хлороводород, в воде образует соляную кислоту.",
    uses: ["травление металлов", "регулировка pH", "химсинтез"],
    reactsWith: ["основания", "карбонаты", "активные металлы"],
    incompatibleWith: ["гипохлориты (выделение Cl2)", "сильные окислители"],
    source: ["PubChem CID 313", "NIOSH Pocket Guide"],
  },
  HNO3: {
    description: "Азотная кислота, сильная кислота и окислитель.",
    uses: ["нитрование", "производство удобрений", "травление"],
    reactsWith: ["металлы", "основания", "органические вещества"],
    incompatibleWith: ["восстановители", "органические растворители без контроля"],
    source: ["PubChem CID 944", "NIOSH Pocket Guide"],
  },
  H2SO4: {
    description: "Серная кислота, сильная двухосновная кислота, дегидратирующее средство.",
    uses: ["аккумуляторы", "химсинтез", "удобрения"],
    reactsWith: ["основания", "металлы", "вода (сильное тепловыделение)"],
    incompatibleWith: ["вода при неправильном смешении", "органика", "щелочи"],
    source: ["PubChem CID 1118", "NIOSH Pocket Guide"],
  },
  SO2: {
    description: "Диоксид серы, кислотный оксид.",
    uses: ["консервант", "отбеливание", "производство H2SO4"],
    reactsWith: ["вода", "щелочи", "окислители"],
    incompatibleWith: ["сильные окислители"],
    source: ["PubChem CID 1119", "NIOSH Pocket Guide"],
  },
  SO3: {
    description: "Триоксид серы, ангидрид серной кислоты.",
    uses: ["производство серной кислоты", "сульфирование"],
    reactsWith: ["вода (бурно)", "основания"],
    incompatibleWith: ["вода без охлаждения", "органические вещества"],
    source: ["PubChem CID 24682", "NIST Chemistry WebBook"],
  },
  H2O2: {
    description: "Пероксид водорода, окислитель.",
    uses: ["дезинфекция", "отбеливание", "окислитель в синтезе"],
    reactsWith: ["восстановители", "катализаторы разложения (MnO2, ионы металлов)"],
    incompatibleWith: ["органика в концентрированном виде", "металлические примеси"],
    source: ["PubChem CID 784", "NIOSH Pocket Guide"],
  },
  Cl2: {
    description: "Хлор, сильный окислитель, токсичный газ.",
    uses: ["обеззараживание воды", "производство ПВХ", "отбеливание"],
    reactsWith: ["металлы", "органические соединения", "вода"],
    incompatibleWith: ["аммиак", "водород", "органические растворители"],
    source: ["PubChem CID 24526", "NIOSH Pocket Guide"],
  },
};
