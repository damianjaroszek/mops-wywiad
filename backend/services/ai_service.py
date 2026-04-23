"""
AI Service — generowanie wywiadu środowiskowego przez Claude Haiku
"""
import os
import re
import logging
from pathlib import Path
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
import docx
import pdfplumber

logger = logging.getLogger(__name__)
_client: Anthropic | None = None
_style_examples: str | None = None

MODEL_GENERATE = "claude-haiku-4-5-20251001"
MODEL_EDIT     = "claude-sonnet-4-6"
MAX_TOKENS = 4096
EXAMPLES_DIR = Path(__file__).parent.parent / "style_examples"


def get_anthropic() -> Anthropic:
    global _client
    if _client is None:
        key = os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise RuntimeError("❌ Brak ANTHROPIC_API_KEY w .env!")
        _client = Anthropic(api_key=key)
    return _client


def _read_file(fp: Path) -> str:
    ext = fp.suffix.lower()
    if ext == ".docx":
        document = docx.Document(fp)
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())
    if ext == ".pdf":
        pages = []
        with pdfplumber.open(fp) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n".join(pages)
    return fp.read_text(encoding="utf-8", errors="ignore")


def load_style_examples() -> str:
    """Wczytuje przykładowe wywiady z backend/style_examples/ (raz, potem cache)."""
    global _style_examples
    if _style_examples is not None:
        return _style_examples

    if not EXAMPLES_DIR.exists():
        _style_examples = ""
        return ""

    files = sorted(
        f for f in EXAMPLES_DIR.iterdir()
        if f.suffix.lower() in {".docx", ".pdf", ".txt"}
    )
    if not files:
        _style_examples = ""
        return ""

    full_text = "\n\n".join(_read_file(f) for f in files)

    # Podziel po nagłówkach "WYWIAD I", "WYWIAD II", … lub "WYWIAD 1", "WYWIAD 2", …
    parts = re.split(r'(?m)(?=^WYWIAD\s+[IVXivx\d]+)', full_text)
    parts = [p.strip() for p in parts if len(p.strip()) > 200]

    if not parts:
        # Brak nagłówków — traktuj cały plik jako jeden wzorzec
        parts = [full_text.strip()]

    formatted = "\n\n".join(
        f"── PRZYKŁAD {i + 1} ──\n{p}" for i, p in enumerate(parts)
    )
    _style_examples = formatted
    logger.info(f"Załadowano {len(parts)} przykład(ów) stylu ({len(formatted)} znaków)")
    return _style_examples


def _build_system_prompt() -> str:
    examples = load_style_examples()
    base = (
        "Jesteś doświadczonym pracownikiem socjalnym MOPS sporządzającym oficjalne "
        "pisma urzędowe — rodzinne wywiady środowiskowe.\n\n"
        "Piszesz wyłącznie po polsku, stylem urzędowym, w trzeciej osobie. "
        "Cytuj konkretne artykuły ustaw z podanej podstawy prawnej. "
        "Opisuj tylko fakty wynikające z danych — nie domyślaj się informacji których nie ma."
    )
    if not examples:
        return base
    return (
        f"{base}\n\n"
        "WZORCE STYLU — naśladuj DOKŁADNIE styl, długość, strukturę i język "
        "poniższych wywiadów. To są przykłady napisane przez pracownika socjalnego "
        "i stanowią wzorzec do naśladowania:\n\n"
        f"{examples}"
    )


def _fmt(val, fallback="nie podano") -> str:
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

    return f"""ZADANIE: Sporządź KOMPLETNY rodzinny wywiad środowiskowy na podstawie poniższych danych.
Wzoruj się na przykładach stylu z instrukcji systemowej — zachowaj zbliżoną długość i strukturę.

━━━ DANE Z WYWIADU ━━━

OSOBA OBJĘTA WYWIADEM:
  Imię i nazwisko: {person}
  PESEL: {_fmt(p.get("pesel"))}
  Data urodzenia: {_fmt(p.get("birth_date"))}
  Płeć: {_fmt(p.get("gender"))}
  Stan cywilny: {_fmt(p.get("marital_status"))}
  Adres: {p.get("address_street", "")} {p.get("address_postal_code", "")} {p.get("address_city", "")}
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
  Konflikty w rodzinie: {_fmt(fam.get("has_conflicts"))}
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

━━━ WYMAGANA FORMA PISMA ━━━

Pismo ma być napisane CIĄGŁYM TEKSTEM — jak wypracowanie, bez podziału na numerowane sekcje ani nagłówki.
Używaj wyłącznie akapitów oddzielonych pustą linią. Nie stosuj tytułów rozdziałów ani numeracji (I., II., III. itd.).

Zachowaj następującą kolejność treści w akapitach:
1. Nagłówek: miejscowość i data, nazwa jednostki, tytuł "RODZINNY WYWIAD ŚRODOWISKOWY" z danymi osoby
2. Dane osobowe i rodzinne — skład rodziny, sytuacja osobista
3. Sytuacja mieszkaniowa — z powołaniem na właściwe przepisy
4. Sytuacja zawodowa i źródła dochodu — z kwotami i podstawą prawną
5. Sytuacja zdrowotna
6. Sytuacja finansowa — zestawienie dochodów i wydatków
7. Wnioski pracownika socjalnego — z podstawą prawną
8. Wykaz cytowanych przepisów
9. Podpis: {worker_name}, Pracownik socjalny

Sporządź teraz pełne pismo:"""


def revise_document(current_document: str, instruction: str) -> str:
    """Nanosi poprawkę na gotowe pismo według wskazówki pracownika socjalnego."""
    prompt = f"""Jesteś asystentem pracownika socjalnego. Masz gotowe pismo urzędowe (wywiad środowiskowy) i instrukcję co w nim poprawić lub uzupełnić.

INSTRUKCJA PRACOWNIKA:
{instruction}

ZASADY:
- Wykonaj DOKŁADNIE to o co prosi pracownik — nie więcej, nie mniej
- Zachowaj styl, formę i język całego pisma
- Nie zmieniaj fragmentów których instrukcja nie dotyczy
- Zwróć TYLKO pełny poprawiony tekst pisma, bez komentarzy

AKTUALNE PISMO:
{current_document}

Poprawione pismo:"""

    message = get_anthropic().messages.create(
        model=MODEL_EDIT,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    revised = message.content[0].text
    logger.info(
        f"Rewizja zakończona: {len(revised)} znaków, "
        f"tokeny: in={message.usage.input_tokens} out={message.usage.output_tokens}"
    )
    return revised


def _edit_document(draft: str) -> str:
    """Drugi przebieg — Sonnet redaguje pismo pod kątem języka i stylu."""
    edit_prompt = f"""Jesteś korektorem języka polskiego specjalizującym się w pismach urzędowych.

Otrzymujesz projekt wywiadu środowiskowego napisanego przez AI. Twoim zadaniem jest WYŁĄCZNIE redakcja językowa — NIE zmieniaj faktów, danych, kwot ani treści merytorycznej.

POPRAW:
- Błędy gramatyczne (szczególnie odmiana przez przypadki, np. "jest osobą wdową" → "jest wdową")
- Błędy w zgodności rodzaju gramatycznego (on/ona, jego/jej, zamężna/żonaty itp.)
- Nienaturalne lub niepolskie sformułowania
- Powtórzenia tych samych słów w sąsiednich zdaniach
- Błędy interpunkcyjne
- Styl — wszystko powinno brzmieć jak tekst napisany przez doświadczonego polskiego urzędnika

NIE zmieniaj:
- Żadnych danych osobowych, kwot, dat, adresów
- Cytowań przepisów prawnych
- Struktury akapitów i ogólnego układu pisma
- Wniosków ani ocen pracownika socjalnego

Zwróć TYLKO poprawiony tekst pisma, bez żadnych komentarzy ani wyjaśnień.

PISMO DO REDAKCJI:
{draft}"""

    message = get_anthropic().messages.create(
        model=MODEL_EDIT,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": edit_prompt}],
        temperature=0.1,
    )
    edited = message.content[0].text
    logger.info(
        f"Redakcja zakończona: {len(edited)} znaków, "
        f"tokeny: in={message.usage.input_tokens} out={message.usage.output_tokens}"
    )
    return edited


@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=3, max=20))
def generate_document(form_data: dict, legal_context: str, worker_name: str) -> str:
    """Haiku generuje treść, Sonnet redaguje język — zwraca gotowe pismo."""
    system_prompt = _build_system_prompt()
    prompt = build_prompt(form_data, legal_context, worker_name)
    logger.info(f"Generuję pismo przez {MODEL_GENERATE} (system: {len(system_prompt)} znaków)")

    draft_msg = get_anthropic().messages.create(
        model=MODEL_GENERATE,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    draft = draft_msg.content[0].text
    logger.info(
        f"Szkic gotowy: {len(draft)} znaków, "
        f"tokeny: in={draft_msg.usage.input_tokens} out={draft_msg.usage.output_tokens}"
    )

    logger.info(f"Redaguję przez {MODEL_EDIT}...")
    document = _edit_document(draft)
    return document
