/**
 * Formy pomocy społecznej (art. 36–51 ustawy o pomocy społecznej)
 * i logika auto-sugestii na podstawie danych formularza.
 */

export interface HelpForm {
  id: string;
  label: string;
  description: string;
  lawBasis: string;
}

export const HELP_FORMS: HelpForm[] = [
  {
    id: "zasilek_staly",
    label: "Zasiłek stały",
    description: "Dla osób całkowicie niezdolnych do pracy — stopień umiarkowany lub znaczny (lekki nie kwalifikuje), lub orzeczenie o niezdolności do samodzielnej egzystencji",
    lawBasis: "art. 37 u.p.s.",
  },
  {
    id: "zasilek_okresowy",
    label: "Zasiłek okresowy",
    description: "Dla osób tymczasowo w trudnej sytuacji — bezrobocie, choroba, niepełnosprawność",
    lawBasis: "art. 38 u.p.s.",
  },
  {
    id: "zasilek_celowy",
    label: "Zasiłek celowy",
    description: "Na zaspokojenie konkretnej potrzeby bytowej (żywność, leki, odzież, opał)",
    lawBasis: "art. 39 u.p.s.",
  },
  {
    id: "zasilek_celowy_specjalny",
    label: "Zasiłek celowy specjalny",
    description: "W szczególnie uzasadnionych przypadkach — możliwy powyżej kryterium dochodowego",
    lawBasis: "art. 41 u.p.s.",
  },
  {
    id: "uslug_opiek",
    label: "Usługi opiekuńcze",
    description: "Pomoc w codziennym funkcjonowaniu: zakupy, higiena, pielęgnacja, gotowanie",
    lawBasis: "art. 50 u.p.s.",
  },
  {
    id: "uslug_spec",
    label: "Specjalistyczne usługi opiekuńcze",
    description: "Dla osób z zaburzeniami psychicznymi lub uzależnieniami wymagających specjalistycznej opieki",
    lawBasis: "art. 50 ust. 4 u.p.s.",
  },
  {
    id: "praca_socjalna",
    label: "Praca socjalna",
    description: "Wsparcie w rozwiązywaniu problemów życiowych i wzmacnianie aktywności społecznej",
    lawBasis: "art. 45 u.p.s.",
  },
  {
    id: "poradnictwo",
    label: "Poradnictwo specjalistyczne",
    description: "Poradnictwo prawne, psychologiczne i rodzinne",
    lawBasis: "art. 46 u.p.s.",
  },
  {
    id: "posilek",
    label: "Pomoc w postaci posiłku / dożywianie",
    description: "Posiłek dla dorosłych oraz dzieci w szkole",
    lawBasis: "art. 48b u.p.s.",
  },
  {
    id: "schronienie",
    label: "Schronienie",
    description: "Dla osób bezdomnych lub zagrożonych bezdomnością",
    lawBasis: "art. 48 u.p.s.",
  },
  {
    id: "ubranie",
    label: "Niezbędne ubranie",
    description: "Odzież odpowiednia do pory roku i potrzeb osoby",
    lawBasis: "art. 48 u.p.s.",
  },
  {
    id: "interwencja_kryzysowa",
    label: "Interwencja kryzysowa",
    description: "Dla rodzin i osób w nagłej sytuacji kryzysowej — przemoc, nagła utrata, trauma",
    lawBasis: "art. 47 u.p.s.",
  },
];

/** Kryterium dochodowe 2024 (Rozp. Rady Ministrów Dz.U. 2023 poz. 1838) */
export const THRESHOLD_SINGLE = 776;   // zł/mies. — osoba samotnie gospodarująca
export const THRESHOLD_FAMILY = 600;   // zł/mies./osobę — osoba w rodzinie

/** Zwraca ID sugerowanych form pomocy na podstawie danych formularza */
export function suggestHelpForms(formData: {
  financial?: any;
  health?: any;
  employment?: any;
  family?: any;
  personal?: any;
}): string[] {
  const fin = formData.financial ?? {};
  const hl  = formData.health ?? {};
  const emp = formData.employment ?? {};
  const fam = formData.family ?? {};

  const incomePerPerson = parseFloat(fin.income_per_person) || 0;
  const familySize = 1 + (fam.members?.length ?? 0);
  const threshold = familySize === 1 ? THRESHOLD_SINGLE : THRESHOLD_FAMILY;
  const belowThreshold = incomePerPerson > 0 && incomePerPerson < threshold;

  const isUnemployed       = emp.employment_status === "bezrobotny";
  const hasDisability      = hl.has_disability_certificate === true;
  const hasIncapacity      = hl.has_incapacity_certificate === true;
  const hasChronicallyIll  = parseInt(hl.chronically_ill_count ?? "0", 10) > 0;
  const hasAddiction       = hl.has_addiction === true;
  const hasViolence        = fam.has_domestic_violence === true;
  const hasChildcare       = fam.has_childcare_issues === true;
  const currentYear        = new Date().getFullYear();
  const hasMinorChildren   = (fam.members ?? []).some(
    (m: any) => m.birth_year && currentYear - m.birth_year < 18
  );

  // Zasiłek stały (art. 37 ust. 1 u.p.s.) — wymaga całkowitej niezdolności do pracy.
  // Stopień lekki = częściowa niezdolność → NIE kwalifikuje.
  // Stopnie umiarkowany i znaczny są równoznaczne z całkowitą niezdolnością (art. 5 ustawy o rehab.).
  const STALY_DEGREES = ["umiarkowany", "znaczny", "calkowita_niezdolnosc"];
  const hasQualifyingDisability =
    hasDisability && STALY_DEGREES.includes(hl.disability_degree ?? "");

  const ids: string[] = [];

  if (belowThreshold && (hasQualifyingDisability || hasIncapacity))
    ids.push("zasilek_staly");

  if (belowThreshold && (isUnemployed || hasChronicallyIll || hasDisability))
    ids.push("zasilek_okresowy");

  if (belowThreshold)
    ids.push("zasilek_celowy");

  if (hasChronicallyIll || hasDisability || hasIncapacity)
    ids.push("uslug_opiek");

  if (hasAddiction)
    ids.push("uslug_spec");

  ids.push("praca_socjalna");

  if (hasViolence || hasChildcare || hasAddiction)
    ids.push("poradnictwo");

  if (belowThreshold || hasMinorChildren)
    ids.push("posilek");

  if (hasViolence)
    ids.push("interwencja_kryzysowa");

  return ids;
}

// ─── Obliczanie wysokości świadczeń ──────────────────────────────────────────

/** Limity kwotowe 2024 */
const MAX_STALY  = 719;   // art. 37 ust. 2a u.p.s.
const MIN_STALY  = 30;    // art. 37 ust. 3 u.p.s.
const MIN_OKRESOWY = 20;  // art. 38 ust. 4 u.p.s.

export interface BenefitAmount {
  amount: number;          // wyliczona kwota (zł/mies.)
  formula: string;         // czytelny zapis obliczenia
  note?: string;           // dodatkowa uwaga (np. "gmina może podwyższyć")
  isAboveThreshold?: boolean;
}

export interface BenefitCalculations {
  zasilek_staly?:    BenefitAmount;
  zasilek_okresowy?: BenefitAmount;
}

function fmt(n: number) { return n.toFixed(2).replace(".", ","); }

export function calculateBenefits(formData: {
  financial?: any;
  family?: any;
  personal?: any;
}): BenefitCalculations {
  const fin     = formData.financial ?? {};
  const fam     = formData.family ?? {};
  const personal = formData.personal ?? {};

  const ownIncome       = parseFloat(personal.income_amount) || 0;
  const totalIncome     = parseFloat(fin.total_family_income) || 0;
  const incomePerPerson = parseFloat(fin.income_per_person) || 0;
  const familySize      = 1 + (fam.members?.length ?? 0);
  const isSingle        = familySize === 1;

  const results: BenefitCalculations = {};

  // ── Zasiłek stały (art. 37 u.p.s.) ──────────────────────────────────────
  // Osoba samotna:  kryterium_samotna − dochód_własny    (min 30, max 719)
  // Osoba w rod.:   kryterium_na_osobę − dochód_na_osobę (min 30, max 719)
  if (isSingle && ownIncome > 0) {
    const diff = THRESHOLD_SINGLE - ownIncome;
    if (diff <= 0) {
      results.zasilek_staly = {
        amount: 0,
        formula: `${THRESHOLD_SINGLE} − ${fmt(ownIncome)} = ${fmt(diff)} zł`,
        isAboveThreshold: true,
      };
    } else {
      const amount = Math.max(MIN_STALY, Math.min(MAX_STALY, diff));
      results.zasilek_staly = {
        amount,
        formula: `${THRESHOLD_SINGLE} − ${fmt(ownIncome)} = ${fmt(diff)} → ${fmt(amount)} zł/mies.`,
        note: diff > MAX_STALY ? `ograniczono do max ${MAX_STALY} zł` : undefined,
      };
    }
  } else if (!isSingle && incomePerPerson > 0) {
    const diff = THRESHOLD_FAMILY - incomePerPerson;
    if (diff <= 0) {
      results.zasilek_staly = {
        amount: 0,
        formula: `${THRESHOLD_FAMILY} − ${fmt(incomePerPerson)} = ${fmt(diff)} zł`,
        isAboveThreshold: true,
      };
    } else {
      const amount = Math.max(MIN_STALY, Math.min(MAX_STALY, diff));
      results.zasilek_staly = {
        amount,
        formula: `${THRESHOLD_FAMILY} − ${fmt(incomePerPerson)} = ${fmt(diff)} → ${fmt(amount)} zł/mies.`,
        note: diff > MAX_STALY ? `ograniczono do max ${MAX_STALY} zł` : undefined,
      };
    }
  }

  // ── Zasiłek okresowy (art. 38 u.p.s.) ───────────────────────────────────
  // Osoba samotna:  min 50% × (kryterium_samotna − dochód),   min 20 zł
  // Rodzina:        min 50% × (kryterium_rodziny − dochód_łącz.), min 20 zł
  if (isSingle && ownIncome > 0) {
    const gap = THRESHOLD_SINGLE - ownIncome;
    if (gap > 0) {
      const half = gap * 0.5;
      const amount = Math.max(MIN_OKRESOWY, half);
      results.zasilek_okresowy = {
        amount,
        formula: `min. 50% × (${THRESHOLD_SINGLE} − ${fmt(ownIncome)}) = ${fmt(half)} zł/mies.`,
        note: "gmina może przyznać wyższą kwotę (do pełnej różnicy)",
      };
    }
  } else if (!isSingle && totalIncome > 0) {
    const familyCriterion = THRESHOLD_FAMILY * familySize;
    const gap = familyCriterion - totalIncome;
    if (gap > 0) {
      const half = gap * 0.5;
      const amount = Math.max(MIN_OKRESOWY, half);
      results.zasilek_okresowy = {
        amount,
        formula: `min. 50% × (${THRESHOLD_FAMILY}×${familySize} − ${fmt(totalIncome)}) = ${fmt(half)} zł/mies.`,
        note: "gmina może przyznać wyższą kwotę (do pełnej różnicy)",
      };
    }
  }

  return results;
}
