"""
Scan router — OCR formularza papierowego przez Claude Vision.
Przetwarza zdjęcia sekcji 2-6 (bez danych osobowych z kroku 1).
"""
import base64
import json
import logging
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ai_service import get_anthropic

logger = logging.getLogger(__name__)
router = APIRouter()

MODEL_VISION = "claude-sonnet-4-6"

# Schemat pól dla każdego kroku — opisuje co wyciągamy ze zdjęcia
STEP_SCHEMAS = {
    2: {
        "section": "Sytuacja mieszkaniowa",
        "description": """
Wyodrębnij informacje o mieszkaniu:
- apartment_type: typ lokalu (np. "mieszkanie komunalne", "dom własny", "najem prywatny", "brak stałego zamieszkania")
- rooms_count: liczba izb/pokoi (liczba całkowita jako string, np. "3")
- floor: piętro (liczba jako string, np. "2", "0" = parter)
- sleeping_places: liczba miejsc do spania (liczba całkowita jako string)
- has_cold_water: czy jest zimna woda (true/false/null)
- has_hot_water: czy jest ciepła woda (true/false/null)
- has_bathroom: czy jest łazienka (true/false/null)
- has_wc: czy jest WC (true/false/null)
- has_gas: czy jest gaz (true/false/null)
- heating_type: rodzaj ogrzewania (np. "centralne", "gazowe", "elektryczne", "węglowe", "brak")
- apartment_condition: stan techniczny (np. "dobry", "dostateczny", "zły", "bardzo zły")
""",
        "fields": ["apartment_type", "rooms_count", "floor", "sleeping_places",
                   "has_cold_water", "has_hot_water", "has_bathroom", "has_wc",
                   "has_gas", "heating_type", "apartment_condition"],
    },
    3: {
        "section": "Sytuacja zawodowa",
        "description": """
Wyodrębnij informacje o zatrudnieniu:
- employment_status: status zawodowy (np. "pracujący", "bezrobotny", "rencista", "emeryt", "student", "uczeń", "niepracujący")
- is_registered_unemployed: zarejestrowany/a w PUP (true/false/null)
- has_unemployment_benefit: pobiera zasiłek dla bezrobotnych (true/false/null)
- unemployment_benefit_amount: kwota zasiłku w PLN jako string (np. "1200.00"), puste jeśli brak
- qualifications: wykształcenie i kwalifikacje zawodowe (tekst)
- last_employment: ostatnie miejsce pracy (tekst)
""",
        "fields": ["employment_status", "is_registered_unemployed", "has_unemployment_benefit",
                   "unemployment_benefit_amount", "qualifications", "last_employment"],
    },
    4: {
        "section": "Sytuacja zdrowotna",
        "description": """
Wyodrębnij informacje o stanie zdrowia:
- has_health_insurance: ubezpieczenie zdrowotne NFZ (true/false/null)
- chronically_ill_count: liczba osób długotrwale chorych (liczba jako string, np. "2")
- illness_types: rodzaj schorzeń/diagnoz (tekst opisowy, BEZ imion i nazwisk)
- has_disability_certificate: orzeczenie o niepełnosprawności (true/false/null)
- disability_degree: stopień niepełnosprawności ("lekki", "umiarkowany", "znaczny"), puste jeśli brak
- has_incapacity_certificate: orzeczenie o niezdolności do samodzielnej egzystencji (true/false/null)
- has_addiction: stwierdzono uzależnienie (true/false/null)
- addiction_types: rodzaje uzależnień jako lista (np. ["alkohol", "narkotyki"]), pusta lista jeśli brak
- additional_health_info: inne istotne informacje zdrowotne (tekst)
""",
        "fields": ["has_health_insurance", "chronically_ill_count", "illness_types",
                   "has_disability_certificate", "disability_degree", "has_incapacity_certificate",
                   "has_addiction", "addiction_types", "additional_health_info"],
    },
    5: {
        "section": "Sytuacja rodzinna",
        "description": """
Wyodrębnij informacje o członkach rodziny.
UWAGA: NIE wyciągaj imion, nazwisk, numerów PESEL, adresów ani telefonów.

Zwróć listę "members" gdzie każdy element to:
- relation: stosunek pokrewieństwa (np. "małżonek", "dziecko", "rodzic", "konkubent")
- birth_year: rok urodzenia (liczba całkowita, np. 1985)
- gender: płeć ("K" lub "M"), null jeśli nieznana
- education: poziom wykształcenia (np. "podstawowe", "średnie", "wyższe", "brak")
- employment_status: status zawodowy (np. "pracujący", "uczeń", "bezrobotny")
- income_amount: dochód miesięczny w PLN (liczba, 0 jeśli brak dochodu)

Oraz pola dotyczące sytuacji rodzinnej:
- has_conflicts: konflikty w rodzinie (true/false/null)
- has_domestic_violence: przemoc domowa (true/false/null)
- has_childcare_issues: problemy opiekuńczo-wychowawcze (true/false/null)
- conflicts_description: opis konfliktów (tekst, puste jeśli brak)
- violence_description: opis przemocy (tekst, puste jeśli brak)
- childcare_description: opis problemów wychowawczych (tekst, puste jeśli brak)
""",
        "fields": ["members", "has_conflicts", "has_domestic_violence", "has_childcare_issues",
                   "conflicts_description", "violence_description", "childcare_description"],
    },
    6: {
        "section": "Sytuacja finansowa",
        "description": """
Wyodrębnij informacje finansowe:
- total_family_income: łączny dochód rodziny miesięcznie w PLN (liczba jako string, np. "2400.00")
- income_per_person: dochód na osobę miesięcznie w PLN (liczba jako string)
- monthly_expenses_total: łączne wydatki miesięczne w PLN (liczba jako string)
- needs_and_expectations: potrzeby i oczekiwania klienta (tekst)
""",
        "fields": ["total_family_income", "income_per_person", "monthly_expenses_total", "needs_and_expectations"],
    },
}

COMMON_RULES = """
BEZWZGLĘDNE ZASADY ANONIMIZACJI (naruszenie jest niedopuszczalne):
- NIE zwracaj imion ani nazwisk jakichkolwiek osób
- NIE zwracaj numerów PESEL
- NIE zwracaj adresów zamieszkania
- NIE zwracaj numerów telefonów
- NIE zwracaj numerów dokumentów tożsamości
- Jeśli na formularzu jest coś czego nie możesz zidentyfikować — wpisz null lub puste pole

Zwróć WYŁĄCZNIE poprawny JSON bez żadnego dodatkowego tekstu, wyjaśnień ani markdown.
Dla brakujących/nieczytelnych pól użyj null.
"""


class ScanRequest(BaseModel):
    step: int
    image_base64: str
    image_media_type: str = "image/jpeg"


@router.post("/scan-section")
async def scan_section(req: ScanRequest):
    if req.step not in STEP_SCHEMAS:
        raise HTTPException(status_code=400, detail=f"Nieobsługiwany krok: {req.step}. Dozwolone: 2-6.")

    # Walidacja base64
    try:
        decoded = base64.b64decode(req.image_base64)
        if len(decoded) < 1000:
            raise HTTPException(status_code=400, detail="Obraz jest zbyt mały lub uszkodzony.")
        if len(decoded) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Obraz zbyt duży (max 10 MB).")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Nieprawidłowy obraz base64: {e}")

    schema = STEP_SCHEMAS[req.step]
    prompt = f"""Analizujesz zdjęcie papierowego formularza wywiadu środowiskowego MOPS.
Sekcja: {schema['section']}

{schema['description'].strip()}

{COMMON_RULES}

Przykładowy format odpowiedzi dla tej sekcji:
{json.dumps({f: None for f in schema['fields']}, ensure_ascii=False, indent=2)}
"""

    try:
        client = get_anthropic()
        message = client.messages.create(
            model=MODEL_VISION,
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": req.image_media_type,
                                "data": req.image_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        raw = message.content[0].text.strip()

        # Wyciągnij JSON z odpowiedzi (Claude może dodać markdown)
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if not json_match:
            logger.error(f"Brak JSON w odpowiedzi Claude: {raw[:200]}")
            raise HTTPException(status_code=502, detail="Model nie zwrócił poprawnego JSON.")

        extracted = json.loads(json_match.group())

        logger.info(f"Skanowanie kroku {req.step}: wyodrębniono {len(extracted)} pól")
        return {"step": req.step, "extracted_data": extracted}

    except json.JSONDecodeError as e:
        logger.error(f"Błąd parsowania JSON z OCR: {e}")
        raise HTTPException(status_code=502, detail="Nie udało się przetworzyć odpowiedzi modelu.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Błąd skanowania kroku {req.step}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Błąd podczas przetwarzania zdjęcia.")
