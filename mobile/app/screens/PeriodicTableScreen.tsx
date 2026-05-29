import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";

type ElementCard = {
  symbol: string;
  nameRu: string;
  nameEn: string;
  number: number;
  period: number;
  group: number;
  categoryRu: string;
  categoryEn: string;
  summaryRu: string;
  summaryEn: string;
};

type PeriodicMode = "study" | "properties" | "training" | "memory";

const MODE_LABELS: { key: PeriodicMode; labelRu: string; labelEn: string }[] = [
  { key: "study", labelRu: "Изучение", labelEn: "Study" },
  { key: "properties", labelRu: "Свойства", labelEn: "Properties" },
  { key: "training", labelRu: "Тренировка", labelEn: "Training" },
  { key: "memory", labelRu: "Запоминание", labelEn: "Memory" },
];

const SOURCE_LINE_RU = "Источники: IUPAC Periodic Table, CIAAW standard atomic weights, Royal Society of Chemistry. updated_at: 2026-05-26; verified_by: Allchemist content QA baseline.";
const SOURCE_LINE_EN = "Sources: IUPAC Periodic Table, CIAAW standard atomic weights, Royal Society of Chemistry. updated_at: 2026-05-26; verified_by: Allchemist content QA baseline.";

const ATOMIC_MASS_BY_SYMBOL: Record<string, string> = Object.fromEntries(
  "H:1.008,He:4.0026,Li:6.94,Be:9.0122,B:10.81,C:12.011,N:14.007,O:15.999,F:18.998,Ne:20.180,Na:22.990,Mg:24.305,Al:26.982,Si:28.085,P:30.974,S:32.06,Cl:35.45,Ar:39.948,K:39.098,Ca:40.078,Sc:44.956,Ti:47.867,V:50.942,Cr:51.996,Mn:54.938,Fe:55.845,Co:58.933,Ni:58.693,Cu:63.546,Zn:65.38,Ga:69.723,Ge:72.630,As:74.922,Se:78.971,Br:79.904,Kr:83.798,Rb:85.468,Sr:87.62,Y:88.906,Zr:91.224,Nb:92.906,Mo:95.95,Tc:98,Ru:101.07,Rh:102.91,Pd:106.42,Ag:107.87,Cd:112.41,In:114.82,Sn:118.71,Sb:121.76,Te:127.60,I:126.90,Xe:131.29,Cs:132.91,Ba:137.33,La:138.91,Ce:140.12,Pr:140.91,Nd:144.24,Pm:145,Sm:150.36,Eu:151.96,Gd:157.25,Tb:158.93,Dy:162.50,Ho:164.93,Er:167.26,Tm:168.93,Yb:173.05,Lu:174.97,Hf:178.49,Ta:180.95,W:183.84,Re:186.21,Os:190.23,Ir:192.22,Pt:195.08,Au:196.97,Hg:200.59,Tl:204.38,Pb:207.2,Bi:208.98,Po:209,At:210,Rn:222,Fr:223,Ra:226,Ac:227,Th:232.04,Pa:231.04,U:238.03,Np:237,Pu:244,Am:243,Cm:247,Bk:247,Cf:251,Es:252,Fm:257,Md:258,No:259,Lr:266,Rf:267,Db:268,Sg:269,Bh:270,Hs:277,Mt:278,Ds:281,Rg:282,Cn:285,Nh:286,Fl:289,Mc:290,Lv:293,Ts:294,Og:294"
    .split(",")
    .map((item) => item.split(":")),
);

const CATEGORY_DETAILS: Record<string, { propertiesRu: string; usesRu: string; safetyRu: string; propertiesEn: string; usesEn: string; safetyEn: string }> = {
  "Щелочной металл": {
    propertiesRu: "Очень реакционноспособный металл, обычно образует ион +1.",
    usesRu: "Соли, батареи, химический синтез, материалы.",
    safetyRu: "Активные металлы реагируют с влагой; школьные опыты только по правилам безопасности.",
    propertiesEn: "Very reactive metal, usually forms +1 ions.",
    usesEn: "Salts, batteries, chemical synthesis, materials.",
    safetyEn: "Reactive metals require strict safety rules around moisture.",
  },
  "Щелочноземельный металл": {
    propertiesRu: "Металл группы 2, часто образует соединения со степенью окисления +2.",
    usesRu: "Минералы, сплавы, строительные материалы, биологические системы.",
    safetyRu: "Работайте с соединениями по школьной инструкции и не смешивайте реактивы без задания.",
    propertiesEn: "Group 2 metal, often forms +2 compounds.",
    usesEn: "Minerals, alloys, construction materials, biological systems.",
    safetyEn: "Handle compounds according to lab instructions.",
  },
  "Переходный металл": {
    propertiesRu: "Часто имеет переменные степени окисления, окрашенные соединения и каталитические свойства.",
    usesRu: "Сплавы, проводники, катализаторы, магнитные и конструкционные материалы.",
    safetyRu: "Некоторые соли токсичны; не пробуйте вещества и используйте защиту.",
    propertiesEn: "Often has variable oxidation states, colored compounds and catalytic behavior.",
    usesEn: "Alloys, conductors, catalysts, magnetic and structural materials.",
    safetyEn: "Some salts are toxic; use protective handling.",
  },
  "Неметалл": {
    propertiesRu: "Обычно образует ковалентные соединения, молекулы и ионы; важен для живой природы и атмосферы.",
    usesRu: "Воздух, вода, органические вещества, кислоты, соли и школьные реакции.",
    safetyRu: "Следите за агрегатным состоянием и концентрацией: свойства соединений могут сильно отличаться.",
    propertiesEn: "Usually forms covalent compounds, molecules and ions; important for life and atmosphere.",
    usesEn: "Air, water, organic compounds, acids, salts and school reactions.",
    safetyEn: "Properties depend strongly on compound and concentration.",
  },
  "Благородный газ": {
    propertiesRu: "Малоактивный одноатомный газ с заполненной внешней электронной оболочкой.",
    usesRu: "Освещение, сварка, криогеника, научные приборы.",
    safetyRu: "Газовые баллоны и криогенные среды требуют взрослого контроля.",
    propertiesEn: "Low-reactivity monatomic gas with a filled outer shell.",
    usesEn: "Lighting, welding, cryogenics, scientific instruments.",
    safetyEn: "Gas cylinders and cryogenic media require supervision.",
  },
  "Лантаноид": {
    propertiesRu: "Редкоземельный элемент 4f-ряда с близкими химическими свойствами.",
    usesRu: "Магниты, люминофоры, стекло, электроника и специальные сплавы.",
    safetyRu: "Используйте как справочный материал; реальные соли требуют лабораторного контроля.",
    propertiesEn: "Rare-earth 4f element with similar chemical behavior across the series.",
    usesEn: "Magnets, phosphors, glass, electronics and special alloys.",
    safetyEn: "Use as reference material unless supervised in a lab.",
  },
  "Актиноид": {
    propertiesRu: "5f-элемент; многие представители радиоактивны и требуют строгого контроля.",
    usesRu: "Ядерная энергетика, датирование, медицина и фундаментальные исследования.",
    safetyRu: "Радиоактивные материалы не используются в бытовых и школьных опытах.",
    propertiesEn: "5f element; many are radioactive and require strict control.",
    usesEn: "Nuclear energy, dating, medicine and fundamental research.",
    safetyEn: "Radioactive materials are not for household or school experiments.",
  },
};

const ELEMENTS: ElementCard[] = [
  { symbol: "H", nameRu: "Водород", nameEn: "Hydrogen", number: 1, period: 1, group: 1, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 1, группа 1. Категория: неметалл.", summaryEn: "Period 1, group 1. Category: diatomic nonmetal." },
  { symbol: "He", nameRu: "Гелий", nameEn: "Helium", number: 2, period: 1, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 1, группа 18. Категория: благородный газ.", summaryEn: "Period 1, group 18. Category: noble gas." },
  { symbol: "Li", nameRu: "Литий", nameEn: "Lithium", number: 3, period: 2, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 2, группа 1. Категория: щелочной металл.", summaryEn: "Period 2, group 1. Category: alkali metal." },
  { symbol: "Be", nameRu: "Бериллий", nameEn: "Beryllium", number: 4, period: 2, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 2, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 2, group 2. Category: alkaline earth metal." },
  { symbol: "B", nameRu: "Бор", nameEn: "Boron", number: 5, period: 2, group: 13, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 2, группа 13. Категория: металлоид.", summaryEn: "Period 2, group 13. Category: metalloid." },
  { symbol: "C", nameRu: "Углерод", nameEn: "Carbon", number: 6, period: 2, group: 14, categoryRu: "Неметалл", categoryEn: "Polyatomic nonmetal", summaryRu: "Период 2, группа 14. Категория: неметалл.", summaryEn: "Period 2, group 14. Category: polyatomic nonmetal." },
  { symbol: "N", nameRu: "Азот", nameEn: "Nitrogen", number: 7, period: 2, group: 15, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 2, группа 15. Категория: неметалл.", summaryEn: "Period 2, group 15. Category: diatomic nonmetal." },
  { symbol: "O", nameRu: "Кислород", nameEn: "Oxygen", number: 8, period: 2, group: 16, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 2, группа 16. Категория: неметалл.", summaryEn: "Period 2, group 16. Category: diatomic nonmetal." },
  { symbol: "F", nameRu: "Фтор", nameEn: "Fluorine", number: 9, period: 2, group: 17, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 2, группа 17. Категория: неметалл.", summaryEn: "Period 2, group 17. Category: diatomic nonmetal." },
  { symbol: "Ne", nameRu: "Неон", nameEn: "Neon", number: 10, period: 2, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 2, группа 18. Категория: благородный газ.", summaryEn: "Period 2, group 18. Category: noble gas." },
  { symbol: "Na", nameRu: "Натрий", nameEn: "Sodium", number: 11, period: 3, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 3, группа 1. Категория: щелочной металл.", summaryEn: "Period 3, group 1. Category: alkali metal." },
  { symbol: "Mg", nameRu: "Магний", nameEn: "Magnesium", number: 12, period: 3, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 3, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 3, group 2. Category: alkaline earth metal." },
  { symbol: "Al", nameRu: "Алюминий", nameEn: "Aluminium", number: 13, period: 3, group: 13, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 3, группа 13. Категория: постпереходный металл.", summaryEn: "Period 3, group 13. Category: post-transition metal." },
  { symbol: "Si", nameRu: "Кремний", nameEn: "Silicon", number: 14, period: 3, group: 14, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 3, группа 14. Категория: металлоид.", summaryEn: "Period 3, group 14. Category: metalloid." },
  { symbol: "P", nameRu: "Фосфор", nameEn: "Phosphorus", number: 15, period: 3, group: 15, categoryRu: "Неметалл", categoryEn: "Polyatomic nonmetal", summaryRu: "Период 3, группа 15. Категория: неметалл.", summaryEn: "Period 3, group 15. Category: polyatomic nonmetal." },
  { symbol: "S", nameRu: "Сера", nameEn: "Sulfur", number: 16, period: 3, group: 16, categoryRu: "Неметалл", categoryEn: "Polyatomic nonmetal", summaryRu: "Период 3, группа 16. Категория: неметалл.", summaryEn: "Period 3, group 16. Category: polyatomic nonmetal." },
  { symbol: "Cl", nameRu: "Хлор", nameEn: "Chlorine", number: 17, period: 3, group: 17, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 3, группа 17. Категория: неметалл.", summaryEn: "Period 3, group 17. Category: diatomic nonmetal." },
  { symbol: "Ar", nameRu: "Аргон", nameEn: "Argon", number: 18, period: 3, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 3, группа 18. Категория: благородный газ.", summaryEn: "Period 3, group 18. Category: noble gas." },
  { symbol: "K", nameRu: "Калий", nameEn: "Potassium", number: 19, period: 4, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 4, группа 1. Категория: щелочной металл.", summaryEn: "Period 4, group 1. Category: alkali metal." },
  { symbol: "Ca", nameRu: "Кальций", nameEn: "Calcium", number: 20, period: 4, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 4, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 4, group 2. Category: alkaline earth metal." },
  { symbol: "Sc", nameRu: "Скандий", nameEn: "Scandium", number: 21, period: 4, group: 3, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 3. Категория: переходный металл.", summaryEn: "Period 4, group 3. Category: transition metal." },
  { symbol: "Ti", nameRu: "Титан", nameEn: "Titanium", number: 22, period: 4, group: 4, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 4. Категория: переходный металл.", summaryEn: "Period 4, group 4. Category: transition metal." },
  { symbol: "V", nameRu: "Ванадий", nameEn: "Vanadium", number: 23, period: 4, group: 5, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 5. Категория: переходный металл.", summaryEn: "Period 4, group 5. Category: transition metal." },
  { symbol: "Cr", nameRu: "Хром", nameEn: "Chromium", number: 24, period: 4, group: 6, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 6. Категория: переходный металл.", summaryEn: "Period 4, group 6. Category: transition metal." },
  { symbol: "Mn", nameRu: "Марганец", nameEn: "Manganese", number: 25, period: 4, group: 7, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 7. Категория: переходный металл.", summaryEn: "Period 4, group 7. Category: transition metal." },
  { symbol: "Fe", nameRu: "Железо", nameEn: "Iron", number: 26, period: 4, group: 8, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 8. Категория: переходный металл.", summaryEn: "Period 4, group 8. Category: transition metal." },
  { symbol: "Co", nameRu: "Кобальт", nameEn: "Cobalt", number: 27, period: 4, group: 9, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 9. Категория: переходный металл.", summaryEn: "Period 4, group 9. Category: transition metal." },
  { symbol: "Ni", nameRu: "Никель", nameEn: "Nickel", number: 28, period: 4, group: 10, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 10. Категория: переходный металл.", summaryEn: "Period 4, group 10. Category: transition metal." },
  { symbol: "Cu", nameRu: "Медь", nameEn: "Copper", number: 29, period: 4, group: 11, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 11. Категория: переходный металл.", summaryEn: "Period 4, group 11. Category: transition metal." },
  { symbol: "Zn", nameRu: "Цинк", nameEn: "Zinc", number: 30, period: 4, group: 12, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 4, группа 12. Категория: переходный металл.", summaryEn: "Period 4, group 12. Category: transition metal." },
  { symbol: "Ga", nameRu: "Галлий", nameEn: "Gallium", number: 31, period: 4, group: 13, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 4, группа 13. Категория: постпереходный металл.", summaryEn: "Period 4, group 13. Category: post-transition metal." },
  { symbol: "Ge", nameRu: "Германий", nameEn: "Germanium", number: 32, period: 4, group: 14, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 4, группа 14. Категория: металлоид.", summaryEn: "Period 4, group 14. Category: metalloid." },
  { symbol: "As", nameRu: "Мышьяк", nameEn: "Arsenic", number: 33, period: 4, group: 15, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 4, группа 15. Категория: металлоид.", summaryEn: "Period 4, group 15. Category: metalloid." },
  { symbol: "Se", nameRu: "Селен", nameEn: "Selenium", number: 34, period: 4, group: 16, categoryRu: "Неметалл", categoryEn: "Polyatomic nonmetal", summaryRu: "Период 4, группа 16. Категория: неметалл.", summaryEn: "Period 4, group 16. Category: polyatomic nonmetal." },
  { symbol: "Br", nameRu: "Бром", nameEn: "Bromine", number: 35, period: 4, group: 17, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 4, группа 17. Категория: неметалл.", summaryEn: "Period 4, group 17. Category: diatomic nonmetal." },
  { symbol: "Kr", nameRu: "Криптон", nameEn: "Krypton", number: 36, period: 4, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 4, группа 18. Категория: благородный газ.", summaryEn: "Period 4, group 18. Category: noble gas." },
  { symbol: "Rb", nameRu: "Рубидий", nameEn: "Rubidium", number: 37, period: 5, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 5, группа 1. Категория: щелочной металл.", summaryEn: "Period 5, group 1. Category: alkali metal." },
  { symbol: "Sr", nameRu: "Стронций", nameEn: "Strontium", number: 38, period: 5, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 5, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 5, group 2. Category: alkaline earth metal." },
  { symbol: "Y", nameRu: "Иттрий", nameEn: "Yttrium", number: 39, period: 5, group: 3, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 3. Категория: переходный металл.", summaryEn: "Period 5, group 3. Category: transition metal." },
  { symbol: "Zr", nameRu: "Цирконий", nameEn: "Zirconium", number: 40, period: 5, group: 4, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 4. Категория: переходный металл.", summaryEn: "Period 5, group 4. Category: transition metal." },
  { symbol: "Nb", nameRu: "Ниобий", nameEn: "Niobium", number: 41, period: 5, group: 5, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 5. Категория: переходный металл.", summaryEn: "Period 5, group 5. Category: transition metal." },
  { symbol: "Mo", nameRu: "Молибден", nameEn: "Molybdenum", number: 42, period: 5, group: 6, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 6. Категория: переходный металл.", summaryEn: "Period 5, group 6. Category: transition metal." },
  { symbol: "Tc", nameRu: "Технеций", nameEn: "Technetium", number: 43, period: 5, group: 7, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 7. Категория: переходный металл.", summaryEn: "Period 5, group 7. Category: transition metal." },
  { symbol: "Ru", nameRu: "Рутений", nameEn: "Ruthenium", number: 44, period: 5, group: 8, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 8. Категория: переходный металл.", summaryEn: "Period 5, group 8. Category: transition metal." },
  { symbol: "Rh", nameRu: "Родий", nameEn: "Rhodium", number: 45, period: 5, group: 9, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 9. Категория: переходный металл.", summaryEn: "Period 5, group 9. Category: transition metal." },
  { symbol: "Pd", nameRu: "Палладий", nameEn: "Palladium", number: 46, period: 5, group: 10, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 10. Категория: переходный металл.", summaryEn: "Period 5, group 10. Category: transition metal." },
  { symbol: "Ag", nameRu: "Серебро", nameEn: "Silver", number: 47, period: 5, group: 11, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 11. Категория: переходный металл.", summaryEn: "Period 5, group 11. Category: transition metal." },
  { symbol: "Cd", nameRu: "Кадмий", nameEn: "Cadmium", number: 48, period: 5, group: 12, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 5, группа 12. Категория: переходный металл.", summaryEn: "Period 5, group 12. Category: transition metal." },
  { symbol: "In", nameRu: "Индий", nameEn: "Indium", number: 49, period: 5, group: 13, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 5, группа 13. Категория: постпереходный металл.", summaryEn: "Period 5, group 13. Category: post-transition metal." },
  { symbol: "Sn", nameRu: "Олово", nameEn: "Tin", number: 50, period: 5, group: 14, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 5, группа 14. Категория: постпереходный металл.", summaryEn: "Period 5, group 14. Category: post-transition metal." },
  { symbol: "Sb", nameRu: "Сурьма", nameEn: "Antimony", number: 51, period: 5, group: 15, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 5, группа 15. Категория: металлоид.", summaryEn: "Period 5, group 15. Category: metalloid." },
  { symbol: "Te", nameRu: "Теллур", nameEn: "Tellurium", number: 52, period: 5, group: 16, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 5, группа 16. Категория: металлоид.", summaryEn: "Period 5, group 16. Category: metalloid." },
  { symbol: "I", nameRu: "Иод", nameEn: "Iodine", number: 53, period: 5, group: 17, categoryRu: "Неметалл", categoryEn: "Diatomic nonmetal", summaryRu: "Период 5, группа 17. Категория: неметалл.", summaryEn: "Period 5, group 17. Category: diatomic nonmetal." },
  { symbol: "Xe", nameRu: "Ксенон", nameEn: "Xenon", number: 54, period: 5, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 5, группа 18. Категория: благородный газ.", summaryEn: "Period 5, group 18. Category: noble gas." },
  { symbol: "Cs", nameRu: "Цезий", nameEn: "Cesium", number: 55, period: 6, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 6, группа 1. Категория: щелочной металл.", summaryEn: "Period 6, group 1. Category: alkali metal." },
  { symbol: "Ba", nameRu: "Барий", nameEn: "Barium", number: 56, period: 6, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 6, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 6, group 2. Category: alkaline earth metal." },
  { symbol: "La", nameRu: "Лантан", nameEn: "Lanthanum", number: 57, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Ce", nameRu: "Церий", nameEn: "Cerium", number: 58, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Pr", nameRu: "Празеодим", nameEn: "Praseodymium", number: 59, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Nd", nameRu: "Неодим", nameEn: "Neodymium", number: 60, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Pm", nameRu: "Прометий", nameEn: "Promethium", number: 61, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Sm", nameRu: "Самарий", nameEn: "Samarium", number: 62, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Eu", nameRu: "Европий", nameEn: "Europium", number: 63, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Gd", nameRu: "Гадолиний", nameEn: "Gadolinium", number: 64, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Tb", nameRu: "Тербий", nameEn: "Terbium", number: 65, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Dy", nameRu: "Диспрозий", nameEn: "Dysprosium", number: 66, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Ho", nameRu: "Гольмий", nameEn: "Holmium", number: 67, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Er", nameRu: "Эрбий", nameEn: "Erbium", number: 68, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Tm", nameRu: "Тулий", nameEn: "Thulium", number: 69, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Yb", nameRu: "Иттербий", nameEn: "Ytterbium", number: 70, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Lu", nameRu: "Лютеций", nameEn: "Lutetium", number: 71, period: 6, group: 3, categoryRu: "Лантаноид", categoryEn: "Lanthanide", summaryRu: "Период 6, группа 3. Категория: лантаноид.", summaryEn: "Period 6, group 3. Category: lanthanide." },
  { symbol: "Hf", nameRu: "Гафний", nameEn: "Hafnium", number: 72, period: 6, group: 4, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 4. Категория: переходный металл.", summaryEn: "Period 6, group 4. Category: transition metal." },
  { symbol: "Ta", nameRu: "Тантал", nameEn: "Tantalum", number: 73, period: 6, group: 5, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 5. Категория: переходный металл.", summaryEn: "Period 6, group 5. Category: transition metal." },
  { symbol: "W", nameRu: "Вольфрам", nameEn: "Tungsten", number: 74, period: 6, group: 6, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 6. Категория: переходный металл.", summaryEn: "Period 6, group 6. Category: transition metal." },
  { symbol: "Re", nameRu: "Рений", nameEn: "Rhenium", number: 75, period: 6, group: 7, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 7. Категория: переходный металл.", summaryEn: "Period 6, group 7. Category: transition metal." },
  { symbol: "Os", nameRu: "Осмий", nameEn: "Osmium", number: 76, period: 6, group: 8, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 8. Категория: переходный металл.", summaryEn: "Period 6, group 8. Category: transition metal." },
  { symbol: "Ir", nameRu: "Иридий", nameEn: "Iridium", number: 77, period: 6, group: 9, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 9. Категория: переходный металл.", summaryEn: "Period 6, group 9. Category: transition metal." },
  { symbol: "Pt", nameRu: "Платина", nameEn: "Platinum", number: 78, period: 6, group: 10, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 10. Категория: переходный металл.", summaryEn: "Period 6, group 10. Category: transition metal." },
  { symbol: "Au", nameRu: "Золото", nameEn: "Gold", number: 79, period: 6, group: 11, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 11. Категория: переходный металл.", summaryEn: "Period 6, group 11. Category: transition metal." },
  { symbol: "Hg", nameRu: "Ртуть", nameEn: "Mercury", number: 80, period: 6, group: 12, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 6, группа 12. Категория: переходный металл.", summaryEn: "Period 6, group 12. Category: transition metal." },
  { symbol: "Tl", nameRu: "Таллий", nameEn: "Thallium", number: 81, period: 6, group: 13, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 6, группа 13. Категория: постпереходный металл.", summaryEn: "Period 6, group 13. Category: post-transition metal." },
  { symbol: "Pb", nameRu: "Свинец", nameEn: "Lead", number: 82, period: 6, group: 14, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 6, группа 14. Категория: постпереходный металл.", summaryEn: "Period 6, group 14. Category: post-transition metal." },
  { symbol: "Bi", nameRu: "Висмут", nameEn: "Bismuth", number: 83, period: 6, group: 15, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 6, группа 15. Категория: постпереходный металл.", summaryEn: "Period 6, group 15. Category: post-transition metal." },
  { symbol: "Po", nameRu: "Полоний", nameEn: "Polonium", number: 84, period: 6, group: 16, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 6, группа 16. Категория: постпереходный металл.", summaryEn: "Period 6, group 16. Category: post-transition metal." },
  { symbol: "At", nameRu: "Астат", nameEn: "Astatine", number: 85, period: 6, group: 17, categoryRu: "Металлоид", categoryEn: "Metalloid", summaryRu: "Период 6, группа 17. Категория: металлоид.", summaryEn: "Period 6, group 17. Category: metalloid." },
  { symbol: "Rn", nameRu: "Радон", nameEn: "Radon", number: 86, period: 6, group: 18, categoryRu: "Благородный газ", categoryEn: "Noble gas", summaryRu: "Период 6, группа 18. Категория: благородный газ.", summaryEn: "Period 6, group 18. Category: noble gas." },
  { symbol: "Fr", nameRu: "Франций", nameEn: "Francium", number: 87, period: 7, group: 1, categoryRu: "Щелочной металл", categoryEn: "Alkali metal", summaryRu: "Период 7, группа 1. Категория: щелочной металл.", summaryEn: "Period 7, group 1. Category: alkali metal." },
  { symbol: "Ra", nameRu: "Радий", nameEn: "Radium", number: 88, period: 7, group: 2, categoryRu: "Щелочноземельный металл", categoryEn: "Alkaline earth metal", summaryRu: "Период 7, группа 2. Категория: щелочноземельный металл.", summaryEn: "Period 7, group 2. Category: alkaline earth metal." },
  { symbol: "Ac", nameRu: "Актиний", nameEn: "Actinium", number: 89, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Th", nameRu: "Торий", nameEn: "Thorium", number: 90, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Pa", nameRu: "Протактиний", nameEn: "Protactinium", number: 91, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "U", nameRu: "Уран", nameEn: "Uranium", number: 92, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Np", nameRu: "Нептуний", nameEn: "Neptunium", number: 93, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Pu", nameRu: "Плутоний", nameEn: "Plutonium", number: 94, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Am", nameRu: "Америций", nameEn: "Americium", number: 95, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Cm", nameRu: "Кюрий", nameEn: "Curium", number: 96, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Bk", nameRu: "Берклий", nameEn: "Berkelium", number: 97, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Cf", nameRu: "Калифорний", nameEn: "Californium", number: 98, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Es", nameRu: "Эйнштейний", nameEn: "Einsteinium", number: 99, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Fm", nameRu: "Фермий", nameEn: "Fermium", number: 100, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Md", nameRu: "Менделевий", nameEn: "Mendelevium", number: 101, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "No", nameRu: "Нобелий", nameEn: "Nobelium", number: 102, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Lr", nameRu: "Лоуренсий", nameEn: "Lawrencium", number: 103, period: 7, group: 3, categoryRu: "Актиноид", categoryEn: "Actinide", summaryRu: "Период 7, группа 3. Категория: актиноид.", summaryEn: "Period 7, group 3. Category: actinide." },
  { symbol: "Rf", nameRu: "Резерфордий", nameEn: "Rutherfordium", number: 104, period: 7, group: 4, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 4. Категория: переходный металл.", summaryEn: "Period 7, group 4. Category: transition metal." },
  { symbol: "Db", nameRu: "Дубний", nameEn: "Dubnium", number: 105, period: 7, group: 5, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 5. Категория: переходный металл.", summaryEn: "Period 7, group 5. Category: transition metal." },
  { symbol: "Sg", nameRu: "Сиборгий", nameEn: "Seaborgium", number: 106, period: 7, group: 6, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 6. Категория: переходный металл.", summaryEn: "Period 7, group 6. Category: transition metal." },
  { symbol: "Bh", nameRu: "Борий", nameEn: "Bohrium", number: 107, period: 7, group: 7, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 7. Категория: переходный металл.", summaryEn: "Period 7, group 7. Category: transition metal." },
  { symbol: "Hs", nameRu: "Хассий", nameEn: "Hassium", number: 108, period: 7, group: 8, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 8. Категория: переходный металл.", summaryEn: "Period 7, group 8. Category: transition metal." },
  { symbol: "Mt", nameRu: "Мейтнерий", nameEn: "Meitnerium", number: 109, period: 7, group: 9, categoryRu: "Предположительно переходный металл", categoryEn: "Unknown, probably transition metal", summaryRu: "Период 7, группа 9. Категория: предположительно переходный металл.", summaryEn: "Period 7, group 9. Category: unknown, probably transition metal." },
  { symbol: "Ds", nameRu: "Дармштадтий", nameEn: "Darmstadtium", number: 110, period: 7, group: 10, categoryRu: "Предположительно переходный металл", categoryEn: "Unknown, probably transition metal", summaryRu: "Период 7, группа 10. Категория: предположительно переходный металл.", summaryEn: "Period 7, group 10. Category: unknown, probably transition metal." },
  { symbol: "Rg", nameRu: "Рентгений", nameEn: "Roentgenium", number: 111, period: 7, group: 11, categoryRu: "Предположительно переходный металл", categoryEn: "Unknown, probably transition metal", summaryRu: "Период 7, группа 11. Категория: предположительно переходный металл.", summaryEn: "Period 7, group 11. Category: unknown, probably transition metal." },
  { symbol: "Cn", nameRu: "Коперниций", nameEn: "Copernicium", number: 112, period: 7, group: 12, categoryRu: "Переходный металл", categoryEn: "Transition metal", summaryRu: "Период 7, группа 12. Категория: переходный металл.", summaryEn: "Period 7, group 12. Category: transition metal." },
  { symbol: "Nh", nameRu: "Нихоний", nameEn: "Nihonium", number: 113, period: 7, group: 13, categoryRu: "Предположительно переходный металл", categoryEn: "Unknown, probably transition metal", summaryRu: "Период 7, группа 13. Категория: предположительно переходный металл.", summaryEn: "Period 7, group 13. Category: unknown, probably transition metal." },
  { symbol: "Fl", nameRu: "Флеровий", nameEn: "Flerovium", number: 114, period: 7, group: 14, categoryRu: "Постпереходный металл", categoryEn: "Post-transition metal", summaryRu: "Период 7, группа 14. Категория: постпереходный металл.", summaryEn: "Period 7, group 14. Category: post-transition metal." },
  { symbol: "Mc", nameRu: "Московий", nameEn: "Moscovium", number: 115, period: 7, group: 15, categoryRu: "Предположительно постпереходный металл", categoryEn: "Unknown, probably post-transition metal", summaryRu: "Период 7, группа 15. Категория: предположительно постпереходный металл.", summaryEn: "Period 7, group 15. Category: unknown, probably post-transition metal." },
  { symbol: "Lv", nameRu: "Ливерморий", nameEn: "Livermorium", number: 116, period: 7, group: 16, categoryRu: "Предположительно постпереходный металл", categoryEn: "Unknown, probably post-transition metal", summaryRu: "Период 7, группа 16. Категория: предположительно постпереходный металл.", summaryEn: "Period 7, group 16. Category: unknown, probably post-transition metal." },
  { symbol: "Ts", nameRu: "Теннессин", nameEn: "Tennessine", number: 117, period: 7, group: 17, categoryRu: "Предположительно металлоид", categoryEn: "Unknown, probably metalloid", summaryRu: "Период 7, группа 17. Категория: предположительно металлоид.", summaryEn: "Period 7, group 17. Category: unknown, probably metalloid." },
  { symbol: "Og", nameRu: "Оганесон", nameEn: "Oganesson", number: 118, period: 7, group: 18, categoryRu: "Предположительно благородный газ", categoryEn: "Unknown, predicted to be noble gas", summaryRu: "Период 7, группа 18. Категория: предположительно благородный газ.", summaryEn: "Period 7, group 18. Category: unknown, predicted to be noble gas." },
];

const ENRICHED_DETAILS: Record<string, { mass: string; oxidation: string; usesRu: string; usesEn: string; noteRu: string; noteEn: string }> = {
  H: { mass: "1.008", oxidation: "-1, +1", usesRu: "аммиак, топливные элементы", usesEn: "ammonia, fuel cells", noteRu: "Легчайший элемент, очень высокая удельная энергия.", noteEn: "Lightest element with very high specific energy." },
  C: { mass: "12.011", oxidation: "-4..+4", usesRu: "органика, полимеры, графит/алмаз", usesEn: "organic chemistry, polymers, graphite/diamond", noteRu: "Основа органических молекул и биохимии.", noteEn: "Foundation of organic molecules and biochemistry." },
  N: { mass: "14.007", oxidation: "-3..+5", usesRu: "удобрения, инертная атмосфера", usesEn: "fertilizers, inert atmosphere", noteRu: "В воздухе около 78% азота.", noteEn: "About 78% of the atmosphere is nitrogen." },
  O: { mass: "15.999", oxidation: "-2", usesRu: "медицина, металлургия, окисление", usesEn: "medical use, metallurgy, oxidation", noteRu: "Ключевой окислитель в большинстве процессов.", noteEn: "Key oxidizer in many processes." },
  Na: { mass: "22.990", oxidation: "+1", usesRu: "соли, химсинтез, натриевые лампы", usesEn: "salts, synthesis, sodium lamps", noteRu: "Металл хранится под маслом из-за высокой реактивности.", noteEn: "Stored under oil due to high reactivity." },
  Mg: { mass: "24.305", oxidation: "+2", usesRu: "сплавы, пиротехника, биология", usesEn: "alloys, pyrotechnics, biology", noteRu: "Горит очень ярким белым пламенем.", noteEn: "Burns with a bright white flame." },
  Al: { mass: "26.982", oxidation: "+3", usesRu: "конструкции, транспорт, упаковка", usesEn: "construction, transport, packaging", noteRu: "Защищается плотной оксидной пленкой.", noteEn: "Protected by a dense oxide layer." },
  Si: { mass: "28.085", oxidation: "-4..+4", usesRu: "чипы, стекло, керамика", usesEn: "chips, glass, ceramics", noteRu: "Ключевой полупроводник электроники.", noteEn: "Key semiconductor for electronics." },
  P: { mass: "30.974", oxidation: "-3..+5", usesRu: "удобрения, биохимия, сплавы", usesEn: "fertilizers, biochemistry, alloys", noteRu: "Входит в ДНК/РНК и АТФ.", noteEn: "Present in DNA/RNA and ATP." },
  S: { mass: "32.06", oxidation: "-2..+6", usesRu: "серная кислота, вулканизация", usesEn: "sulfuric acid, vulcanization", noteRu: "Один из важнейших элементов промышленной химии.", noteEn: "One of the key elements of industrial chemistry." },
  Cl: { mass: "35.45", oxidation: "-1, +1..+7", usesRu: "дезинфекция, ПВХ, отбеливание", usesEn: "disinfection, PVC, bleaching", noteRu: "Сильный окислитель, требует аккуратного обращения.", noteEn: "Strong oxidizer, requires careful handling." },
  K: { mass: "39.098", oxidation: "+1", usesRu: "удобрения, электролиты", usesEn: "fertilizers, electrolytes", noteRu: "Калий важен для работы мышц и нервной системы.", noteEn: "Potassium is important for muscles and nerve system." },
  Ca: { mass: "40.078", oxidation: "+2", usesRu: "строительные материалы, биология", usesEn: "construction materials, biology", noteRu: "Основа костной ткани и известняка.", noteEn: "Core element of bones and limestone." },
  Fe: { mass: "55.845", oxidation: "+2, +3", usesRu: "сталь, магнитные материалы", usesEn: "steel, magnetic materials", noteRu: "Базовый конструкционный металл современной индустрии.", noteEn: "Core structural metal of modern industry." },
  Cu: { mass: "63.546", oxidation: "+1, +2", usesRu: "электропроводка, сплавы, теплообмен", usesEn: "wiring, alloys, heat exchange", noteRu: "Один из лучших проводников тока.", noteEn: "One of the best electrical conductors." },
  Zn: { mass: "65.38", oxidation: "+2", usesRu: "оцинковка, латунь, батареи", usesEn: "galvanization, brass, batteries", noteRu: "Защищает сталь от коррозии.", noteEn: "Protects steel from corrosion." },
  Ag: { mass: "107.868", oxidation: "+1", usesRu: "контакты, зеркала, медицина", usesEn: "contacts, mirrors, medicine", noteRu: "Самая высокая электропроводность среди металлов.", noteEn: "Highest electrical conductivity among metals." },
  Au: { mass: "196.967", oxidation: "+1, +3", usesRu: "электроника, ювелирка, катализ", usesEn: "electronics, jewelry, catalysis", noteRu: "Химически очень стойкий металл.", noteEn: "Chemically very stable metal." },
};

function buildElementSummary(element: ElementCard, lang: string) {
  const extra = ENRICHED_DETAILS[element.symbol];
  const detail = CATEGORY_DETAILS[element.categoryRu] ?? CATEGORY_DETAILS["Неметалл"];
  const atomicMass = extra?.mass ?? ATOMIC_MASS_BY_SYMBOL[element.symbol] ?? "см. источник";
  const memoryRu = `Запомнить: ${element.symbol} — ${element.nameRu}. Повторяй номер ${element.number}, группу ${element.group} и период ${element.period} вместе с названием.`;
  const memoryEn = `Memory: ${element.symbol} is ${element.nameEn}. Repeat number ${element.number}, group ${element.group} and period ${element.period} together.`;
  if (!extra) {
    if (lang === "ru") {
      return {
        mass: atomicMass,
        line1: `Атомная масса: ${atomicMass} u`,
        line2: `Положение: группа ${element.group}, период ${element.period}`,
        properties: detail.propertiesRu,
        uses: detail.usesRu,
        safety: detail.safetyRu,
        memory: memoryRu,
        source: SOURCE_LINE_RU,
      };
    }
    return {
      mass: atomicMass,
      line1: `Atomic mass: ${atomicMass} u`,
      line2: `Position: group ${element.group}, period ${element.period}`,
      properties: detail.propertiesEn,
      uses: detail.usesEn,
      safety: detail.safetyEn,
      memory: memoryEn,
      source: SOURCE_LINE_EN,
    };
  }
  if (lang === "ru") {
    return {
      mass: atomicMass,
      line1: `Атомная масса: ${atomicMass} u`,
      line2: `Степени окисления: ${extra.oxidation}`,
      properties: `${extra.noteRu} ${detail.propertiesRu}`,
      uses: extra.usesRu,
      safety: detail.safetyRu,
      memory: memoryRu,
      source: SOURCE_LINE_RU,
    };
  }
  return {
    mass: atomicMass,
    line1: `Atomic mass: ${atomicMass} u`,
    line2: `Oxidation states: ${extra.oxidation}`,
    properties: `${extra.noteEn} ${detail.propertiesEn}`,
    uses: extra.usesEn,
    safety: detail.safetyEn,
    memory: memoryEn,
    source: SOURCE_LINE_EN,
  };
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PeriodicTableScreen: React.FC = () => {
  const { lang } = useI18n();
  const { width, height } = useWindowDimensions();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("C");
  const [mode, setMode] = useState<PeriodicMode>("study");
  const [showRotateHint, setShowRotateHint] = useState(true);
  const heroIn = useRef(new Animated.Value(0)).current;
  const detailsIn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(detailsIn, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [detailsIn, heroIn, pulse]);

  useEffect(() => {
    detailsIn.setValue(0.72);
    Animated.timing(detailsIn, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [detailsIn, selectedSymbol]);

  const selected = useMemo(
    () => ELEMENTS.find((el) => el.symbol === selectedSymbol) || ELEMENTS[0],
    [selectedSymbol],
  );
  const selectedInfo = useMemo(() => buildElementSummary(selected, lang), [selected, lang]);
  const isPortrait = height >= width;
  const modeHint = {
    study: lang === "ru" ? "Изучение: выбери элемент и прочитай главное без перегруза." : "Study: pick an element and read the essentials.",
    properties: lang === "ru" ? "Свойства: смотри массу, группу, период, семейство и безопасность." : "Properties: see mass, group, period, family and safety.",
    training: lang === "ru" ? "Тренировка: сначала назови символ и номер, затем открой карточку." : "Training: name symbol and number before opening the card.",
    memory: lang === "ru" ? "Запоминание: повторяй символ, номер, группу и короткую мнемонику." : "Memory: repeat symbol, number, group and a short cue.",
  }[mode];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: heroIn,
            transform: [
              {
                translateY: heroIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>{lang === "ru" ? "Таблица Менделеева" : "Periodic Table"}</Text>
        <Text style={styles.subtitle}>
          {lang === "ru"
            ? "118 элементов: номер, символ, название, группа, период, свойства и карточка выбранного элемента."
            : "Pick an element: expanded details are visible immediately."}
        </Text>
      </Animated.View>

      {showRotateHint && isPortrait ? (
        <View style={styles.rotateHint}>
          <Text style={styles.rotateHintText}>{lang === "ru" ? "Для полного вида поверните телефон." : "Rotate the phone for the full table view."}</Text>
          <Pressable onPress={() => setShowRotateHint(false)} style={styles.rotateHintBtn}>
            <Text style={styles.rotateHintBtnText}>{lang === "ru" ? "Больше не показывать" : "Do not show again"}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.modeRow}>
        {MODE_LABELS.map((item) => {
          const active = item.key === mode;
          return (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.modeChip, active && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{lang === "ru" ? item.labelRu : item.labelEn}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.modeHint}>{modeHint}</Text>

      <Animated.View
        style={[
          styles.detailCard,
          {
            opacity: detailsIn,
            transform: [
              {
                translateY: detailsIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.detailTitle}>
          {selected.symbol} - {lang === "ru" ? selected.nameRu : selected.nameEn}
        </Text>
        <Text style={styles.detailMeta}>
          {lang === "ru" ? "Период" : "Period"}: {selected.period} | {lang === "ru" ? "Группа" : "Group"}: {selected.group}
        </Text>
        <Text style={styles.detailMeta}>
          {lang === "ru" ? "Класс" : "Category"}: {lang === "ru" ? selected.categoryRu : selected.categoryEn}
        </Text>
        <Text style={styles.detailMeta}>{lang === "ru" ? "Атомный номер" : "Atomic number"}: {selected.number}</Text>
        <Text style={styles.detailMeta}>{selectedInfo.line1}</Text>
        <Text style={styles.detailMeta}>{selectedInfo.line2}</Text>
        <Text style={styles.detailBody}><Text style={styles.detailStrong}>{lang === "ru" ? "Свойства: " : "Properties: "}</Text>{selectedInfo.properties}</Text>
        <Text style={styles.detailBody}><Text style={styles.detailStrong}>{lang === "ru" ? "Применение и где встречается: " : "Uses and occurrence: "}</Text>{selectedInfo.uses}</Text>
        <Text style={styles.detailBody}><Text style={styles.detailStrong}>{lang === "ru" ? "Осторожность: " : "Safety: "}</Text>{selectedInfo.safety}</Text>
        <Text style={styles.detailBody}><Text style={styles.detailStrong}>{lang === "ru" ? "Как запомнить: " : "Memory cue: "}</Text>{selectedInfo.memory}</Text>
        <Text style={styles.sourceText}>{selectedInfo.source}</Text>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScrollContent}>
      <View style={[styles.gridWrap, isPortrait ? styles.gridWrapPortrait : styles.gridWrapLandscape]}>
        {ELEMENTS.map((element) => {
          const active = element.symbol === selected.symbol;
          return (
            <AnimatedPressable
              key={element.symbol}
              onPress={() => setSelectedSymbol(element.symbol)}
              style={[
                styles.elementChip,
                active && styles.elementChipActive,
                active
                  ? {
                      transform: [
                        {
                          scale: pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.04],
                          }),
                        },
                      ],
                    }
                  : null,
              ]}
            >
              <Text style={[styles.elementNumber, active && styles.elementNumberActive]}>{element.number}</Text>
              <Text style={[styles.elementSymbol, active && styles.elementSymbolActive]}>{element.symbol}</Text>
              <Text style={styles.elementName} numberOfLines={1}>{lang === "ru" ? element.nameRu : element.nameEn}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
      </ScrollView>

    </ScrollView>
  );
};

export default PeriodicTableScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.24)",
    backgroundColor: "rgba(8, 18, 36, 0.92)",
    padding: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  rotateHint: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.24)",
    backgroundColor: "rgba(14, 116, 144, 0.18)",
    padding: 12,
    gap: 8,
  },
  rotateHintText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  rotateHintBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.32)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rotateHintBtnText: {
    color: "#a5f3fc",
    fontSize: 12,
    fontWeight: "900",
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipActive: {
    borderColor: colors.accentSoft,
    backgroundColor: "rgba(34, 211, 238, 0.16)",
  },
  modeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  modeChipTextActive: {
    color: "#ecfeff",
  },
  modeHint: {
    color: "#bfdbfe",
    lineHeight: 18,
    fontSize: 13,
  },
  tableScrollContent: {
    paddingBottom: 4,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridWrapPortrait: {
    width: 760,
  },
  gridWrapLandscape: {
    width: "100%",
  },
  elementChip: {
    width: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 8,
    alignItems: "center",
  },
  elementChipActive: {
    borderColor: colors.accentSoft,
    backgroundColor: colors.cardElevated,
  },
  elementNumber: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  elementNumberActive: {
    color: "#a5f3fc",
  },
  elementSymbol: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  elementSymbolActive: {
    color: "#ecfeff",
  },
  elementName: {
    maxWidth: 56,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    padding: 12,
  },
  detailTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  detailMeta: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 12,
  },
  detailBody: {
    color: colors.textPrimary,
    marginTop: 10,
    lineHeight: 19,
  },
  detailStrong: {
    color: "#a5f3fc",
    fontWeight: "900",
  },
  sourceText: {
    color: colors.textMuted,
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
  },
});
