/**
 * Opcje formularza wywiadu środowiskowego
 * Zgodne z rozporządzeniem MPRiPS z 25.08.2016 r.
 */

export const HELP_REASONS = [
  { value: 'ubostwo', label: 'Ubóstwo' },
  { value: 'bezdomnosc', label: 'Bezdomność' },
  { value: 'bezrobocie', label: 'Bezrobocie' },
  { value: 'niepelnosprawnosc', label: 'Niepełnosprawność' },
  { value: 'dlugotrwala_choroba', label: 'Długotrwała lub ciężka choroba' },
  { value: 'przemoc_domowa', label: 'Przemoc w rodzinie' },
  { value: 'potrzeba_ochrony_ofiar_handlu', label: 'Potrzeba ochrony ofiar handlu ludźmi' },
  { value: 'potrzeba_ochrony_macierzynstwa', label: 'Potrzeba ochrony macierzyństwa' },
  { value: 'wielodzietnosc', label: 'Wielodzietność' },
  { value: 'bezradnosc', label: 'Bezradność w sprawach opiekuńczo-wychowawczych' },
  { value: 'alkoholizm', label: 'Alkoholizm' },
  { value: 'narkomania', label: 'Narkomania' },
  { value: 'trudnosci_w_przystosowaniu', label: 'Trudności w przystosowaniu do życia po opuszczeniu zakładu karnego' },
  { value: 'kleski_zywiolowe', label: 'Zdarzenie losowe / klęska żywiołowa' },
  { value: 'inne', label: 'Inne' },
] as const;

export const APARTMENT_TYPES = [
  { value: 'wlasne', label: 'Własne (własnościowe)' },
  { value: 'komunalne', label: 'Komunalne / spółdzielcze' },
  { value: 'wynajmowane', label: 'Wynajmowane' },
  { value: 'rodziny', label: 'Rodziny / znajomych' },
  { value: 'spoldzielcze_lokatorskie', label: 'Spółdzielcze lokatorskie' },
  { value: 'sluzbow', label: 'Służbowe' },
  { value: 'tbs', label: 'TBS' },
  { value: 'noclegownia', label: 'Noclegownia / schronisko' },
  { value: 'brak', label: 'Bez stałego miejsca zamieszkania' },
  { value: 'inne', label: 'Inne' },
] as const;

export const HEATING_TYPES = [
  { value: 'centralne', label: 'Centralne ogrzewanie (sieć miejska)' },
  { value: 'elektryczne', label: 'Elektryczne' },
  { value: 'gazowe', label: 'Gazowe (piec)' },
  { value: 'weglowe', label: 'Węglowe / kominowe' },
  { value: 'ekogroszek', label: 'Ekogroszek / pellet' },
  { value: 'drewno', label: 'Drewno' },
  { value: 'brak', label: 'Brak ogrzewania' },
  { value: 'inne', label: 'Inne' },
] as const;

export const APARTMENT_CONDITION = [
  { value: 'bardzo_dobre', label: 'Bardzo dobre' },
  { value: 'dobre', label: 'Dobre' },
  { value: 'dostateczne', label: 'Dostateczne' },
  { value: 'zle', label: 'Złe' },
  { value: 'bardzo_zle', label: 'Bardzo złe / zagrażające zdrowiu' },
] as const;

export const MARITAL_STATUS = [
  { value: 'kawaler_panna', label: 'Kawaler/Panna' },
  { value: 'zamezna_zonaty', label: 'Zamężna/Żonaty' },
  { value: 'separacja', label: 'W separacji (prawnej)' },
  { value: 'rozwiedziona', label: 'Rozwiedziona/Rozwiedziony' },
  { value: 'wdowa_wdowiec', label: 'Wdowa/Wdowiec' },
  { value: 'konkubinat', label: 'Konkubinat / związek partnerski' },
] as const;

export const GENDER = [
  { value: 'K', label: 'Kobieta' },
  { value: 'M', label: 'Mężczyzna' },
] as const;

export const GENDER_OPTIONS = GENDER;

export const EMPLOYMENT_STATUS = [
  { value: 'zatrudniony', label: 'Zatrudniony (umowa o pracę)' },
  { value: 'zatrudniony_umowa_dzielo', label: 'Zatrudniony (umowa o dzieło)' },
  { value: 'praca_dorywcza', label: 'Praca dorywcza' },
  { value: 'umowa_zlecenie', label: 'Zatrudniony (umowa zlecenie)' },
  { value: 'samozatrudniony', label: 'Samozatrudniony / działalność gospodarcza' },
  { value: 'bezrobotny', label: 'Bezrobotny' },
  { value: 'rencista', label: 'Rencista' },
  { value: 'emeryt', label: 'Emeryt' },
  { value: 'student', label: 'Student / uczeń' },
  { value: 'rolnik', label: 'Rolnik' },
  { value: 'nie_pracuje', label: 'Nie pracuje (inne przyczyny)' },
] as const;

export const EDUCATION_LEVELS = [
  { value: 'brak', label: 'Brak wykształcenia' },
  { value: 'podstawowe', label: 'Podstawowe' },
  { value: 'gimnazjalne', label: 'Gimnazjalne' },
  { value: 'zawodowe', label: 'Zasadnicze zawodowe' },
  { value: 'srednie', label: 'Średnie' },
  { value: 'policealne', label: 'Policealne' },
  { value: 'wyzsze_licencjat', label: 'Wyższe (licencjat)' },
  { value: 'wyzsze_magister', label: 'Wyższe (magister i wyżej)' },
] as const;

export const FAMILY_RELATIONS = [
  { value: 'malzonek', label: 'Małżonek' },
  { value: 'partner', label: 'Partner/Partnerka' },
  { value: 'syn', label: 'Syn' },
  { value: 'corka', label: 'Córka' },
  { value: 'ojciec', label: 'Ojciec' },
  { value: 'matka', label: 'Matka' },
  { value: 'brat', label: 'Brat' },
  { value: 'siostra', label: 'Siostra' },
  { value: 'dziadek', label: 'Dziadek' },
  { value: 'babcia', label: 'Babcia' },
  { value: 'wnuk_wnuczka', label: 'Wnuk/Wnuczka' },
  { value: 'inne', label: 'Inne' },
] as const;

export const DISABILITY_DEGREES = [
  { value: 'lekki', label: 'Lekki' },
  { value: 'umiarkowany', label: 'Umiarkowany' },
  { value: 'znaczny', label: 'Znaczny' },
  { value: 'calkowita_niezdolnosc', label: 'Całkowita niezdolność do pracy' },
] as const;

export const ADDICTION_TYPES = [
  { value: 'alkohol', label: 'Alkohol' },
  { value: 'narkotyki', label: 'Narkotyki' },
  { value: 'leki', label: 'Leki' },
  { value: 'inne', label: 'Inne' },
] as const;

// Liczba kroków formularza
export const TOTAL_STEPS = 5;
export const STEP_LABELS = [
  'Dane osobowe',
  'Mieszkanie',
  'Rodzina',
  'Praca i finanse',
  'Zdrowie',
];
