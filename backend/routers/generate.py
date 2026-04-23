"""
Router: Generowanie pisma AI
"""
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from uuid import UUID
from db.supabase_client import get_supabase
from services.rag_service import search_laws, format_context_for_prompt, extract_references
from services.ai_service import generate_document as generate_interview_document, revise_document
from models.schemas import GenerateRequest as GenerateDocumentRequest, GenerateResponse, ReviseRequest, ReviseResponse
import logging, time

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/interviews/{interview_id}/generate", response_model=GenerateResponse)
@limiter.limit("10/minute")
async def generate_document(
    request: Request,
    interview_id: UUID,
    body: GenerateDocumentRequest = GenerateDocumentRequest(),
):
    """Generuje pismo wywiadu środowiskowego przez AI + RAG."""
    start_time = time.time()
    supabase = get_supabase()

    # Pobierz wywiad
    result = supabase.table("interviews").select("*").eq("id", str(interview_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Wywiad nie istnieje.")
    interview = result.data[0]
    form_data = interview["form_data"]
    worker_name = body.worker_name or interview["worker_name"]

    logger.info(f"Generuję pismo dla wywiadu {interview_id}")

    # RAG — wyszukaj przepisy
    law_docs = search_laws(form_data)
    legal_context = format_context_for_prompt(law_docs)
    law_references = extract_references(law_docs)

    # Generuj pismo
    try:
        document = generate_interview_document(form_data, legal_context, worker_name)
    except Exception as e:
        logger.error(f"Błąd generowania AI: {e}")
        raise HTTPException(
            status_code=503,
            detail="Nie udało się wygenerować pisma. Spróbuj ponownie za chwilę.",
        )

    # Zapisz wynik
    supabase.table("interviews").update({
        "generated_document": document,
        "used_law_references": law_references,
        "status": "completed",
    }).eq("id", str(interview_id)).execute()

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"Pismo wygenerowane w {elapsed}s")

    return GenerateResponse(
        interview_id=interview_id,
        document=document,
        law_references=law_references,
        processing_time_seconds=elapsed,
    )


@router.post("/interviews/{interview_id}/revise", response_model=ReviseResponse)
@limiter.limit("20/minute")
async def revise_interview_document(
    request: Request,
    interview_id: UUID,
    body: ReviseRequest,
):
    """Nanosi poprawkę na gotowe pismo według wskazówki pracownika."""
    start_time = time.time()
    supabase = get_supabase()

    result = supabase.table("interviews").select("id").eq("id", str(interview_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Wywiad nie istnieje.")

    try:
        revised = revise_document(body.current_document, body.instruction)
    except Exception as e:
        logger.error(f"Błąd rewizji AI: {e}")
        raise HTTPException(status_code=503, detail="Nie udało się poprawić pisma. Spróbuj ponownie.")

    supabase.table("interviews").update({
        "generated_document": revised,
    }).eq("id", str(interview_id)).execute()

    return ReviseResponse(
        document=revised,
        processing_time_seconds=round(time.time() - start_time, 2),
    )


@router.get("/interviews/{interview_id}/document")
async def get_document(interview_id: UUID):
    """Pobiera wygenerowane pismo."""
    supabase = get_supabase()
    result = supabase.table("interviews").select("generated_document,used_law_references").eq("id", str(interview_id)).execute()
    if not result.data or not result.data[0].get("generated_document"):
        raise HTTPException(status_code=404, detail="Pismo jeszcze nie zostało wygenerowane.")
    return result.data[0]
