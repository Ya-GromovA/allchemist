export type ChemistryTheoryMode = "grade" | "bookline";

export type ChemistryTheoryBlock = {
  short: string;
  full: string;
  explanation: string;
  examples: string[];
  keyTerms: string[];
  formulaBlock: string[];
  commonMistakes: string[];
  miniCheck: string[];
};

export type ChemistryBookLine = {
  id: string;
  book: string;
  author: string;
};

export type ChemistryExamHint = {
  exam: "ОГЭ" | "ЕГЭ" | "МЦКО";
  prompt: string;
};

export type ChemistryTopicContent = {
  id: string;
  grade: string;
  title: string;
  summary: string;
  bookLine: ChemistryBookLine;
  theory: {
    gradeMode: ChemistryTheoryBlock;
    bookLineMode: ChemistryTheoryBlock;
  };
  visuals: string[];
  examHints: ChemistryExamHint[];
  parentNote: string;
  teacherNote: string;
};
