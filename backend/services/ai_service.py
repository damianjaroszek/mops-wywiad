"""
AI Service — generowanie wywiadu środowiskowego przez Claude Haiku
"""
import os
import logging
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)
_client: Anthropic | None = None

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 4096


def get_anthropic() -> Anthropic:
    global _client
    if _client is None:
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise RuntimeError("❌ Brak ANTHROPIC_API_KEY w .env!")
        _client = Anthropic(api_key=key)
    return _client


def _fmt(val, fallback="nie podano") -> str:
    """Bezpieczne formatowanie wartości null-safe."""
    if val is None:
        return fallback
    if isinstance(val, bool):
        return "tak" if val else "nie"
    if isinstance(val, float):
        return f"{val:.2f} zł"
    return str(val) if str(val).strip() else fallback


def build_prompt(form_data: dict, legal_context: str, worker_name: str) -> str:
    p = form_data.get("personal", {})
    h = form_data.get("housing", {})
    e = form_data.get("employment", {})
    hl = form_data.get("health", {})
    fam = form_data.get("family", {})

    # Członkowie rodziny
    members_text = ""
    for m in fam.get("members", []):
        members_text += (
            f"  • {m.get('name', '?')} ({m.get('relation', '?')}), "
            f"ur. {m.get('birth_year', '?')}, "
            f"dochód: {_fmt(m.get('income_amount', 0))}\n"
        )
    if not members_text:
        members_text = "  (brak danych o innych członkach rodziny)\n"

    reasons = ", ".join(p.get("help_reasons", [])) or "nie określono"
    person = f"{p.get('first_name', 'N')} {p.get('last_name', 'N')}"
    city = p.get("address_city", "")

    prompt = f"""Jesteś doświadczonym pracownikiem socjalnym sporządzającym oficjalne pismo urzędowe.

ZADANIE: Sporządź KOMPLETNY rodzinny wywiad środowiskowy na podstawie poniższych danych.

OBOWIĄZKOWE ZASADY:
1. Pisz wyłącznie po polsku, stylem urzędowym, w trzeciej osobie ("Osoba ubiegająca się...", "Pan/Pani X...")
2. Cytuj KONKRETNE artykuły z sekcji PODSTAWA PRAWNA (poniżej) — format: "zgodnie z art. X ust. Y ustawy z dnia DD miesiąca RRRR r. o [tytuł] (Dz.U. RRRR poz. NNN)"
3. Opisuj TYLKO fakty wynikające z danych — nie domyślaj się nieistniejących informacji
4. Wnioski muszą wynikać bezpośrednio z opisanej sytuacji
5. Pismo musi być gotowe do użycia — kompletne, formalne, profesjonalne

━━━ DANE Z WYWIADU ━━━

OSOBA OBJĘTA WYWIADEM:
  Imię i nazwisko: {person}
  PESEL: {_fmt(p.get("pesel"))}
  Data urodzenia: {_fmt(p.get("birth_date"))}
  Płeć: {_fmt(p.get("gender"))}
  Stan cywilny: {_fmt(p.get("marital_status"))}
  Adres: {p.get("address_street", "")} {p.get("address_postal_code", "")} {city}
  Obywatelstwo: {_fmt(p.get("citizenship"), "polskie")}
  Przyczyny ubiegania się o pomoc: {reasons}

SYTUACJA MIESZKANIOWA:
  Rodzaj mieszkania: {_fmt(h.get("apartment_type"))}
  Liczba izb: {_fmt(h.get("rooms_count"))}
  Piętro: {_fmt(h.get("floor"))}
  Ogrzewanie: {_fmt(h.get("heating_type"))}
  Woda zimna: {_fmt(h.get("has_cold_water"))} | Ciepła: {_fmt(h.get("has_hot_water"))}
  Łazienka: {_fmt(h.get("has_bathroom"))} | WC: {_fmt(h.get("has_wc"))}
  Stan mieszkania: {_fmt(h.get("apartment_condition"))}
  Miejsca do spania: {_fmt(h.get("sleeping_places"))}

SYTUACJA RODZINNA:
  Członkowie rodziny:
{members_text}
  Konflikty w rodzinie: {_fmt(h.get("has_conflicts"))}
  {("Opis konfliktów: " + fam.get("conflict_description", "")) if fam.get("has_conflicts") else ""}
  Przemoc w rodzinie: {_fmt(fam.get("has_domestic_violence"))}
  {("Opis przemocy: " + fam.get("violence_description", "")) if fam.get("has_domestic_violence") else ""}
  Problemy opiekuńczo-wychowawcze: {_fmt(fam.get("has_childcare_issues"))}

SYTUACJA ZAWODOWA I FINANSOWA:
  Status zawodowy: {_fmt(e.get("employment_status"))}
  Zarejestrowany w PUP: {_fmt(e.get("is_registered_unemployed"))}
  Zasiłek dla bezrobotnych: {_fmt(e.get("has_unemployment_benefit"))} | Kwota: {_fmt(e.get("unemployment_benefit_amount"))}
  Kwalifikacje: {_fmt(e.get("qualifications"))}
  Dochód łączny rodziny: {_fmt(e.get("total_family_income"))}
  Dochód na osobę: {_fmt(e.get("income_per_person"))}
  Wydatki miesięczne: {_fmt(e.get("monthly_expenses_total"))}
    - Czynsz/opłaty: {_fmt(e.get("rent"))}
    - Energia elektryczna: {_fmt(e.get("electricity"))}
    - Gaz: {_fmt(e.get("gas_cost"))}
    - Leki: {_fmt(e.get("medications"))}
    - Inne: {_fmt(e.get("other_expenses"))}
  Potrzeby i oczekiwania: {_fmt(e.get("needs_and_expectations"))}

SYTUACJA ZDROWOTNA:
  Osoby długotrwale chore: {_fmt(hl.get("chronically_ill_persons"))}
  Schorzenia: {_fmt(hl.get("illness_types"))}
  Ubezpieczenie zdrowotne: {_fmt(hl.get("has_health_insurance"))}
  Orzeczenie o niepełnosprawności: {_fmt(hl.get("has_disability_certificate"))} | Stopień: {_fmt(hl.get("disability_degree"))}
  Uzależnienie: {_fmt(hl.get("has_addiction"))} | Rodzaj: {_fmt(hl.get("addiction_type"))}
  Uwagi zdrowotne: {_fmt(hl.get("additional_health_info"))}

━━━ PODSTAWA PRAWNA (fragmenty ustaw) ━━━
{legal_context}

━━━ WYMAGANA STRUKTURA PISMA ━━━

[miejscowość, data w formacie: DD miesiąca RRRR r.]

[nazwa jednostki MOPS / GOPS]

RODZINNY WYWIAD ŚRODOWISKOWY
przeprowadzony z [pełne imię i nazwisko], ur. [data], zam. [adres]

I. DANE OSOBOWE I RODZINNE
[opis]

II. SYTUACJA MIESZKANIOWA
[opis z powołaniem na właściwe przepisy]

III. SYTUACJA ZAWODOWA I ŹRÓDŁA DOCHODU
[opis z kwotami i podstawą prawną]

IV. SYTUACJA ZDROWOTNA
[opis]

V. SYTUACJA FINANSOWA
[zestawienie dochodów i wydatków]

VI. WNIOSKI PRACOWNIKA SOCJALNEGO
[konkretne wnioski co do formy i zakresu pomocy, z podstawą prawną]

VII. PODSTAWA PRAWNA
[lista cytowanych przepisów]

                                        {worker_name}
                                        Pracownik socjalny

Sporządź teraz pełne pismo:"""

    return prompt


@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=3, max=20))
def generate_document(form_data: dict, legal_context: str, worker_name: str) -> str:
    """Wywołuje Claude Haiku i zwraca wygenerowane pismo."""
    prompt = build_prompt(form_data, legal_context, worker_name)
    token_estimate = len(prompt) // 4
    logger.info(f"Generuję pismo przez {MODEL} (~{token_estimate} tokenów input)")

    message = get_anthropic().messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,  # niższe = bardziej formalne i powtarzalne
    )

    document = message.content[0].text
    logger.info(
        f"Wygenerowano pismo: {len(document)} znaków, "
        f"tokeny: in={message.usage.input_tokens} out={message.usage.output_tokens}"
    )
    return document
