/**
 * Dane do generatora fikcyjnych danych osobowych.
 * Używane wyłącznie do testów — aplikacja zakłada fikcyjne dane.
 */

const FIRST_NAMES_F = ["Anna","Maria","Katarzyna","Małgorzata","Agnieszka","Barbara","Ewa","Krystyna","Elżbieta","Zofia","Joanna","Teresa","Monika","Danuta","Halina"];
const FIRST_NAMES_M = ["Jan","Piotr","Andrzej","Krzysztof","Stanisław","Tomasz","Paweł","Marek","Józef","Michał","Adam","Marcin","Grzegorz","Tadeusz","Łukasz"];
const LAST_NAMES = ["Kowalski","Nowak","Wiśniewski","Dąbrowski","Wójcik","Kaźmierczak","Lewandowski","Zając","Kamińska","Kowalczyk","Woźniak","Szymański","Mazur","Krawczyk","Piotrowska"];
const CITIES = ["Warszawa","Kraków","Wrocław","Łódź","Poznań","Gdańsk","Szczecin","Bydgoszcz","Lublin","Katowice","Białystok","Kielce","Rzeszów","Toruń","Radom"];
const STREETS = ["Lipowa","Słoneczna","Leśna","Kwiatowa","Polna","Krótka","Długa","Szkolna","Ogrodowa","Kościelna","Zielona","Łąkowa","Parkowa","Wiejska","Nowa"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePesel(birthYear: number, birthMonth: number, birthDay: number, gender: 'M' | 'F'): string {
  const yy = String(birthYear % 100).padStart(2, '0');
  let mm = birthMonth;
  if (birthYear >= 2000) mm += 20;
  const mmStr = String(mm).padStart(2, '0');
  const dd = String(birthDay).padStart(2, '0');
  const seq = randomInt(0, 999);
  const seqStr = String(seq).padStart(3, '0');
  const genderDigit = gender === 'M' ? randomInt(1, 9) * 2 - 1 : randomInt(0, 4) * 2;
  const partial = `${yy}${mmStr}${dd}${seqStr}${genderDigit}`;
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = partial.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
  const checksum = (10 - (sum % 10)) % 10;
  return `${partial}${checksum}`;
}

const INCOME_SOURCES = ["Wynagrodzenie za pracę","Emerytura","Renta","Zasiłek dla bezrobotnych","Zasiłek rodzinny","Świadczenie 800+","Alimenty","Dochód z działalności"];
const WORKPLACES = ["Szkoła Podstawowa nr 3","Urząd Gminy","Sklep spożywczy","Zakład Produkcyjny POLAN","Centrum Handlowe","Dom Pomocy Społecznej","Piekarnia Rodzinna","Budowa – firma zewnętrzna"];
const QUALIFICATIONS_LIST = ["Brak kwalifikacji zawodowych","Kurs obsługi komputera","Prawo jazdy kat. B","Kurs spawacza","Kurs fryzjerski","Technik ekonomista","Mechanik samochodowy"];
const LAST_EMPLOYMENTS = ["Sklep BIEDRONKA Sp. z o.o.","Urząd Gminy w ...","Zakład Produkcyjny POLAN","Restauracja Pod Kasztanem","Firma budowlana - praca sezonowa","Dom Pomocy Społecznej"];
const EMPLOYMENT_VALUES = ['zatrudniony','bezrobotny','rencista','emeryt','student','nie_pracuje'];
const EDUCATION_VALUES = ['podstawowe','gimnazjalne','zawodowe','srednie','policealne','wyzsze_licencjat','wyzsze_magister'];
const MARITAL_VALUES = ['kawaler_panna','zamezna_zonaty','rozwiedziona','wdowa_wdowiec'];

export function generateFakeMember(gender: 'F' | 'M' = 'F') {
  const isF = gender === 'F';
  const firstName = randomFrom(isF ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastName = randomFrom(LAST_NAMES) + (isF ? 'a' : '');
  const birthYear = randomInt(1940, 2015);
  const age = new Date().getFullYear() - birthYear;
  const hasIncome = Math.random() > 0.3;
  const empStatus = age < 18 ? 'student' : randomFrom(EMPLOYMENT_VALUES);
  const isUnemployed = empStatus === 'bezrobotny';
  const hasUnempBenefit = isUnemployed && Math.random() > 0.5;

  return {
    name: `${firstName} ${lastName}`,
    birth_year: birthYear,
    gender: isF ? 'K' : 'M',
    marital_status: age < 16 ? 'kawaler_panna' : randomFrom(MARITAL_VALUES),
    education: age < 10 ? 'podstawowe' : randomFrom(EDUCATION_VALUES),
    employment_status: empStatus,
    is_registered_unemployed: isUnemployed ? Math.random() > 0.4 : null,
    has_unemployment_benefit: isUnemployed ? hasUnempBenefit : null,
    unemployment_benefit_amount: hasUnempBenefit ? String(randomInt(700, 1500)) : '',
    qualifications: Math.random() > 0.4 ? randomFrom(QUALIFICATIONS_LIST) : '',
    last_employment: empStatus !== 'zatrudniony' && age > 20 ? randomFrom(LAST_EMPLOYMENTS) : '',
    work_place: empStatus === 'zatrudniony' || empStatus === 'student' ? randomFrom([...WORKPLACES, 'Szkoła Podstawowa nr 7', 'Liceum Ogólnokształcące']) : '',
    income_source: hasIncome ? randomFrom(INCOME_SOURCES) : '',
    income_amount: hasIncome ? randomInt(400, 3500) : undefined,
    has_health_insurance: Math.random() > 0.15,
    illness_types: Math.random() > 0.7 ? randomFrom(['nadciśnienie tętnicze', 'cukrzyca typu 2', 'choroby układu krążenia', 'astma', 'depresja']) : '',
    has_disability_certificate: Math.random() > 0.85 ? true : null,
    has_addiction: Math.random() > 0.9 ? true : null,
    addiction_types: [] as string[],
    additional_health_info: '',
  };
}

export function generateFakeData(gender: 'M' | 'F' = 'F') {
  const isF = gender === 'F';
  const firstName = randomFrom(isF ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastName = randomFrom(LAST_NAMES) + (isF ? 'a' : '');
  const birthYear = randomInt(1960, 2000);
  const birthMonth = randomInt(1, 12);
  const birthDay = randomInt(1, 28);
  const pesel = generatePesel(birthYear, birthMonth, birthDay, gender);
  const city = randomFrom(CITIES);
  const street = randomFrom(STREETS);
  const houseNum = randomInt(1, 120);
  const flatNum = randomInt(1, 50);
  const postalCode = `${randomInt(10, 99)}-${randomInt(100, 999)}`;
  const phone = `+48 ${randomInt(500, 799)} ${randomInt(100, 999)} ${randomInt(100, 999)}`;

  return {
    first_name: firstName,
    last_name: lastName,
    pesel,
    birth_date: `${String(birthDay).padStart(2, '0')}.${String(birthMonth).padStart(2, '0')}.${birthYear}`,
    gender: isF ? 'kobieta' : 'mężczyzna',
    address_street: `ul. ${street} ${houseNum}/${flatNum}`,
    address_city: city,
    address_postal_code: postalCode,
    phone,
  };
}
