"""
RAG Service — wyszukiwanie semantyczne w polskich ustawach
Używa OpenAI text-embedding-3-small + Supabase pgvector
"""
import os
import logging
from openai import OpenAI
from db.supabase_client import get_supabase
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)
_openai: OpenAI | None = None

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def get_openai() -> OpenAI:
    global _openai
    if _openai is None:
        key = os.getenv("OPENAI_API_KEY", "")
        if not key:
            raise RuntimeError("❌ Brak OPENAI_API_KEY w .env!")
        _openai = OpenAI(api_key=key)
    return _openai


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def create_embedding(text: str) -> list[float]:
    """Generuje embedding wektora dla tekstu (max ~8000 znaków)."""
    response = get_openai().embeddings.create(
        input=text[:8000],
        model=EMBEDDING_MODEL,
        dimensions=EMBEDDING_DIM,
    )
    return response.data[0].embedding


def build_semantic_query(form_data: dict) -> str:
    """
    Buduje zapytanie semantyczne z danych formularza.
    Cel: znaleźć jak najtrafniejsze fragmenty ustaw.
    """
    parts = ["Rodzinny wywiad środowiskowy. Pomoc społeczna."]

    personal = form_data.get("personal") or {}
    if reasons := personal.get("help_reasons", []):
        parts.append(f"Przyczyny pomocy: {', '.join(reasons)}.")

    employment = form_data.get("employment") or {}
    if status := employment.get("employment_status"):
        parts.append(f"Sytuacja zawodowa: {status}.")
    if employment.get("is_registered_unemployed"):
        parts.append("Bezrobotny zarejestrowany w PUP.")
    if employment.get("needs_and_expectations"):
        parts.append(f"Potrzeby: {employment['needs_and_expectations'][:300]}.")

    health = form_data.get("health") or {}
    if health.get("has_disability_certificate"):
        deg = health.get("disability_degree", "")
        parts.append(f"Niepełnosprawność stopień {deg}.")
    if health.get("chronically_ill_persons") or health.get("chronically_ill_count"):
        val = health.get("chronically_ill_persons") or health.get("chronically_ill_count", "")
        parts.append(f"Długotrwała choroba: {str(val)[:200]}.")
    if health.get("has_addiction"):
        types = health.get("addiction_types") or []
        label = ", ".join(types) if types else health.get("addiction_type", "")
        parts.append(f"Uzależnienie: {label}.")

    family = form_data.get("family") or {}
    if family.get("has_domestic_violence"):
        parts.append("Przemoc w rodzinie.")
    if family.get("has_childcare_issues"):
        parts.append("Problemy opiekuńczo-wychowawcze.")
    members_count = len(family.get("members") or [])
    if members_count > 0:
        parts.append(f"Rodzina wieloosobowa ({members_count} osób).")

    return " ".join(parts)


def search_laws(form_data: dict, match_count: int = 8) -> list[dict]:
    """Główna funkcja RAG — zwraca pasujące fragmenty ustaw."""
    query = build_semantic_query(form_data)
    logger.info(f"RAG query ({len(query)} znaków): {query[:150]}...")

    try:
        embedding = create_embedding(query)
    except Exception as e:
        logger.error(f"Błąd embeddingu: {e}")
        return []

    try:
        supabase = get_supabase()
        result = supabase.rpc(
            "match_law_documents",
            {
                "query_embedding": embedding,
                "match_threshold": 0.58,
                "match_count": match_count,
            },
        ).execute()
        docs = result.data or []
        logger.info(f"RAG: znaleziono {len(docs)} pasujących fragmentów")
        return docs
    except Exception as e:
        logger.error(f"Błąd wyszukiwania pgvector: {e}")
        return []


def format_context_for_prompt(docs: list[dict]) -> str:
    """Formatuje dokumenty prawne jako blok kontekstu dla Claude."""
    if not docs:
        return "UWAGA: Baza przepisów jest pusta. Pismo sporządź bez cytowania konkretnych artykułów, wskazując ogólną podstawę w ustawie o pomocy społecznej."

    sections = []
    for doc in docs:
        header = f"[{doc.get('law_short_name', 'Ustawa')}, {doc.get('article_number', 'Art.')}]"
        ref = f"({doc.get('journal_reference', '')})"
        content = doc.get("content", "")[:1500]  # limit na fragment
        similarity = doc.get("similarity", 0)
        sections.append(f"{header} {ref} [zgodność: {similarity:.0%}]\n{content}")

    return "\n\n" + "─" * 60 + "\n\n".join(sections)


def extract_references(docs: list[dict]) -> list[str]:
    """Zwraca listę cytowań do umieszczenia w piśmie."""
    refs = []
    seen = set()
    for doc in docs:
        title = doc.get("law_title", "")
        article = doc.get("article_number", "")
        journal = doc.get("journal_reference", "")
        ref = f"{title}, {article} ({journal})"
        if ref not in seen and title:
            refs.append(ref)
            seen.add(ref)
    return refs
