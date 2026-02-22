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
const FAMILY_RELATION_VALUES = ['malzonek','partner','syn','corka','ojciec','matka','brat','siostra','dziadek','babcia','wnuczek','wnuczka','inny_krewny'];
const EDUCATION_VALUES = ['podstawowe','gimnazjalne','zawodowe','srednie','policealne','wyzsze_licencjat','wyzsze_magister'];

export function generateFakeMember(gender: 'F' | 'M' = 'F') {
  const isF = gender === 'F';
  const firstName = randomFrom(isF ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastName = randomFrom(LAST_NAMES) + (isF ? 'a' : '');
  const birthYear = randomInt(1940, 2015);
  const hasIncome = Math.random() > 0.3;
  return {
    name: `${firstName} ${lastName}`,
    birth_year: birthYear,
    income_source: hasIncome ? randomFrom(INCOME_SOURCES) : '',
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
